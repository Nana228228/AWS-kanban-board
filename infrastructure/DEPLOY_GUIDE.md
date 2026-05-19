# Guia de Migração — Kanban Board para Nova Conta AWS (via Cloud9)

Este guia reproduz a arquitetura mínima obrigatória do projeto numa nova conta AWS.
Todos os comandos são executados no **AWS Cloud9**.

---

## Arquitetura Final

```
Internet
    │
    └── API Gateway (HTTPS)
         ├── GET /report/*  →  Lambda (Node.js 18)  →  ALB (HTTP)  →  Backend
         └── ANY /{proxy+}  →  ALB (HTTP)
                                 ├── /projects*, /boards*, /columns*, /cards*, /actuator*  →  Backend (ECS Fargate, porta 8080)
                                 └── /* (default)  →  Frontend (ECS Fargate, porta 80)
                                                        Backend  →  RDS MySQL (subnet privada, porta 3306)
```

---

## Etapa 0 — Criar e Configurar o Cloud9

1. No console AWS, busque **Cloud9** → **Create environment**
2. Configure:
   - Name: `kanban-deploy`
   - Instance type: `t3.small`
   - Platform: `Amazon Linux 2023`
   - Timeout: `4 hours` (para não desconectar no meio do deploy)
3. Clique **Create**
4. Aguarde o ambiente abrir

### Aumentar o disco (imagens Docker ocupam espaço)

O disco padrão de 10 GB fica apertado com as imagens Docker. 15 GB é suficiente:

```bash
# Aumentar disco para 15 GB
INSTANCE_ID=$(ec2-metadata -i | cut -d' ' -f2)
VOLUME_ID=$(aws ec2 describe-volumes \
  --filters Name=attachment.instance-id,Values=$INSTANCE_ID \
  --query "Volumes[0].VolumeId" --output text)

aws ec2 modify-volume --volume-id $VOLUME_ID --size 15
sleep 10

# Expandir a partição
sudo growpart /dev/nvme0n1 1 2>/dev/null || sudo growpart /dev/xvda 1 2>/dev/null
sudo xfs_growfs / 2>/dev/null || sudo resize2fs /dev/nvme0n1p1 2>/dev/null
df -h /
```

### Clonar o repositório

```bash
git clone https://github.com/SEU_USUARIO/AWS-kanban-board.git
cd AWS-kanban-board
```

> Substitua pela URL real do seu repositório (ou faça upload dos arquivos via Cloud9).

---

## Etapa 1 — Definir Variáveis de Ambiente

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export DB_USERNAME=kanban_admin
export DB_PASSWORD="SuaSenhaSegura123!"
export STACK_NAME=kanban-prod

echo "Account: $AWS_ACCOUNT_ID | Região: $AWS_REGION"
```

---

## Etapa 2 — Criar Repositórios ECR

```bash
aws ecr create-repository --repository-name kanban-backend --region $AWS_REGION 2>/dev/null || echo "Já existe"
aws ecr create-repository --repository-name kanban-frontend --region $AWS_REGION 2>/dev/null || echo "Já existe"
```

---

## Etapa 3 — Build e Push das Imagens Docker

### Login no ECR

```bash
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

### Backend

```bash
docker build -t kanban-backend ./backend
docker tag kanban-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kanban-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kanban-backend:latest
```

### Frontend (primeira vez — aponta para ALB temporariamente)

```bash
docker build -t kanban-frontend ./frontend
docker tag kanban-frontend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kanban-frontend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kanban-frontend:latest
```

---

## Etapa 4 — Deploy da Infraestrutura Principal (CloudFormation)

Este template cria: VPC, Subnets, IGW, Route Tables, Security Groups, RDS, ALB, ECS Cluster, Task Definitions e Services.

```bash
BACKEND_IMAGE=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kanban-backend:latest
FRONTEND_IMAGE=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kanban-frontend:latest

aws cloudformation create-stack \
  --stack-name kanban-main \
  --template-body file://infrastructure/main.yaml \
  --parameters \
    ParameterKey=DBMasterUsername,ParameterValue=$DB_USERNAME \
    ParameterKey=DBMasterPassword,ParameterValue=$DB_PASSWORD \
    ParameterKey=BackendImageUri,ParameterValue=$BACKEND_IMAGE \
    ParameterKey=FrontendImageUri,ParameterValue=$FRONTEND_IMAGE \
  --capabilities CAPABILITY_NAMED_IAM \
  --region $AWS_REGION
```

### Aguardar conclusão (~10-15 min por causa do RDS)

```bash
echo "Aguardando stack kanban-main... (pode levar 10-15 min)"
aws cloudformation wait stack-create-complete --stack-name kanban-main --region $AWS_REGION
echo "✓ Stack criada!"
```

### Obter outputs

```bash
aws cloudformation describe-stacks --stack-name kanban-main --region $AWS_REGION \
  --query "Stacks[0].Outputs" --output table
```

### Salvar o DNS do ALB

```bash
ALB_DNS=$(aws cloudformation describe-stacks --stack-name kanban-main --region $AWS_REGION \
  --query "Stacks[0].Outputs[?OutputKey=='ALBDnsName'].OutputValue" --output text)

echo "ALB DNS: $ALB_DNS"
```

---

## Etapa 5 — Deploy da Lambda

### Build

```bash
cd lambda
npm install
npm run build
zip -j lambda-report.zip dist/index.js
cd ..
```

### Criar a função Lambda

```bash
# Usar LabRole (contas de lab) ou criar role própria
ROLE_ARN=$(aws iam get-role --role-name LabRole --query "Role.Arn" --output text 2>/dev/null)

if [ -z "$ROLE_ARN" ]; then
  echo "LabRole não encontrada. Criando kanban-lambda-role..."
  aws iam create-role \
    --role-name kanban-lambda-role \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "lambda.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }]
    }'
  aws iam attach-role-policy \
    --role-name kanban-lambda-role \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  ROLE_ARN=arn:aws:iam::$AWS_ACCOUNT_ID:role/kanban-lambda-role
  echo "Aguardando propagação da role (15s)..."
  sleep 15
fi

echo "Usando role: $ROLE_ARN"

aws lambda create-function \
  --function-name kanban-report \
  --runtime nodejs18.x \
  --handler index.handler \
  --zip-file fileb://lambda/lambda-report.zip \
  --role $ROLE_ARN \
  --timeout 30 \
  --memory-size 256 \
  --environment "Variables={BACKEND_URL=http://$ALB_DNS}" \
  --region $AWS_REGION
```

### Salvar ARN da Lambda

```bash
LAMBDA_ARN=$(aws lambda get-function --function-name kanban-report --region $AWS_REGION \
  --query "Configuration.FunctionArn" --output text)

echo "Lambda ARN: $LAMBDA_ARN"
```

---

## Etapa 6 — Deploy do API Gateway (CloudFormation)

```bash
aws cloudformation create-stack \
  --stack-name kanban-api-gateway \
  --template-body file://infrastructure/api-gateway.yaml \
  --parameters \
    ParameterKey=BackendALBDnsName,ParameterValue=$ALB_DNS \
    ParameterKey=LambdaFunctionArn,ParameterValue=$LAMBDA_ARN \
  --region $AWS_REGION

echo "Aguardando stack kanban-api-gateway..."
aws cloudformation wait stack-create-complete --stack-name kanban-api-gateway --region $AWS_REGION
echo "✓ API Gateway criado!"
```

### Obter endpoint

```bash
API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name kanban-api-gateway --region $AWS_REGION \
  --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" --output text)

echo "API Gateway: $API_ENDPOINT"
```

---

## Etapa 7 — Rebuild do Frontend com URL do API Gateway

Agora que temos a URL final do API Gateway, reconstruímos o frontend apontando para ela:

```bash
# Criar .env.production com a URL do API Gateway
echo "VITE_API_URL=$API_ENDPOINT" > frontend/.env.production

# Rebuild e push
docker build -t kanban-frontend ./frontend
docker tag kanban-frontend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kanban-frontend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kanban-frontend:latest

# Forçar novo deploy no ECS
aws ecs update-service \
  --cluster ${STACK_NAME}-cluster \
  --service ${STACK_NAME}-frontend-service \
  --force-new-deployment \
  --region $AWS_REGION
```

---

## Etapa 8 — Verificação

Aguarde 2-3 minutos para os containers ficarem healthy, depois teste:

### Health check do backend

```bash
curl http://$ALB_DNS/actuator/health
# Esperado: {"status":"UP"}
```

### Frontend via ALB

```bash
curl -s http://$ALB_DNS/ | head -5
# Esperado: HTML do React
```

### CRUD via API Gateway

```bash
curl $API_ENDPOINT/projects
# Esperado: [] ou lista de projetos
```

### Lambda (relatórios)

```bash
curl $API_ENDPOINT/report/board/1
# Esperado: JSON com estatísticas (ou 404 se não houver board)
```

---

## Troubleshooting

### Backend não inicia (ECS task reiniciando em loop)

```bash
aws logs tail /ecs/kanban-prod/backend --since 10m --region $AWS_REGION
```

Causas comuns:
- **Senha do RDS incorreta** — verifique `DB_PASSWORD`
- **Security Group bloqueando** — Backend SG precisa liberar porta 3306 para RDS SG
- **Health check matando antes de iniciar** — já configuramos `HealthCheckGracePeriodSeconds: 120` no template

### ALB retorna 503

- Tasks ainda não estão healthy (aguarde 2-3 min)
- Verifique:
  ```bash
  aws elbv2 describe-target-health --target-group-arn <ARN_DO_TARGET_GROUP>
  ```

### Lambda retorna erro

```bash
aws logs tail /aws/lambda/kanban-report --since 5m --region $AWS_REGION
```

- Verifique se `BACKEND_URL` aponta para o ALB correto
- A Lambda NÃO está em VPC (acessa o ALB pela internet via DNS público)

### API Gateway retorna 404

- Confirme que o stage `prod` existe:
  ```bash
  API_ID=$(aws cloudformation describe-stacks --stack-name kanban-api-gateway --region $AWS_REGION \
    --query "Stacks[0].Outputs[?OutputKey=='ApiId'].OutputValue" --output text)
  aws apigatewayv2 get-routes --api-id $API_ID --region $AWS_REGION
  ```

### Erro "CannotPullContainerError" no ECS

O Fargate não consegue baixar a imagem do ECR. Verifique:
- A task está em subnet pública com `AssignPublicIp: ENABLED` ✓ (já está no template)
- O Security Group permite saída (outbound) — por padrão permite tudo ✓

---

## Limpeza (quando não precisar mais)

**IMPORTANTE:** Para não consumir créditos, delete tudo ao terminar:

```bash
# Deletar na ordem inversa de dependência
aws cloudformation delete-stack --stack-name kanban-api-gateway --region $AWS_REGION
aws cloudformation wait stack-delete-complete --stack-name kanban-api-gateway --region $AWS_REGION

aws lambda delete-function --function-name kanban-report --region $AWS_REGION

aws cloudformation delete-stack --stack-name kanban-main --region $AWS_REGION
aws cloudformation wait stack-delete-complete --stack-name kanban-main --region $AWS_REGION

# Deletar imagens ECR
aws ecr delete-repository --repository-name kanban-backend --force --region $AWS_REGION
aws ecr delete-repository --repository-name kanban-frontend --force --region $AWS_REGION

echo "✓ Tudo deletado. Nenhum custo adicional será gerado."
```

---

## Resumo da Arquitetura Mínima Obrigatória

| Camada | Serviço AWS | Status |
|--------|-------------|--------|
| Back-end containerizado | ECS Fargate | ✅ `main.yaml` |
| Banco de dados | Amazon RDS MySQL (subnet privada) | ✅ `main.yaml` |
| Gateway | Amazon API Gateway | ✅ `api-gateway.yaml` |
| Função Serverless | AWS Lambda (rota /report) | ✅ Etapa 5 |
| Front-end | ECS Fargate | ✅ `main.yaml` |

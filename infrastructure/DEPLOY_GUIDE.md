# Guia de Deploy — Kanban Board na AWS (Learner Lab)

Guia testado e validado para deploy completo no AWS Academy Learner Lab.

---

## Arquitetura Final

```
Internet
    │
    └── API Gateway (HTTPS)
         ├── GET /report/*  →  Lambda (Node.js 18)  →  ALB (HTTP)  →  Backend
         └── $default       →  ALB (HTTP)
                                 ├── /projects*, /boards*, /columns*, /cards*, /actuator*  →  Backend (ECS Fargate, porta 8080)
                                 └── /* (default)  →  Frontend (ECS Fargate, porta 80)
                                                        Backend  →  RDS MySQL (subnet privada, porta 3306)
```

---

## Restrições do Learner Lab (IMPORTANTE)

- ❌ Não pode criar IAM Roles → usar `LabRole` pré-existente
- ❌ Cloud9 via SSM não funciona → usar Cloud9 via **SSH**
- ❌ `aws apigatewayv2` não funciona no Cloud9 → usar CloudFormation ou Console
- ⚠️ Credenciais expiram a cada ~4 horas → renovar via AWS Details
- ⚠️ Variáveis de ambiente se perdem ao abrir novo terminal
- ✅ Região: `us-east-1`
- ✅ `LabRole` ARN: `arn:aws:iam::ACCOUNT_ID:role/LabRole`

---

## Etapa 0 — Criar o Cloud9 (via SSH)

O Cloud9 é uma IDE na nuvem com Docker e AWS CLI pré-instalados. Usamos como bancada de trabalho para buildar imagens e rodar comandos de deploy.

1. No console AWS → busque **Cloud9** → **Create environment**
2. Configure:
   - Name: `kanban-deploy`
   - Instance type: `t3.small`
   - Platform: `Amazon Linux 2023`
   - **Connection: SSH** (NÃO SSM — o lab bloqueia criação de IAM Roles necessárias para SSM)
   - Timeout: `4 hours`
3. Clique **Create**

### Se Cloud9 via SSH também falhar (alternativa EC2)

Se o lab bloquear Cloud9 completamente, crie uma EC2 manual que faz o mesmo papel:

1. **EC2** → **Launch Instance**
   - Name: `kanban-deploy`
   - AMI: Amazon Linux 2023
   - Instance type: `t3.small`
   - Key pair: **Proceed without a key pair** (usaremos EC2 Instance Connect)
   - Storage: 15 GB
   - Advanced Details → IAM instance profile: `LabInstanceProfile`
2. Connect via **EC2 Instance Connect** (botão Connect no console)
3. Instalar Docker e Git:

```bash
sudo yum install -y docker git        # Instala Docker e Git via gerenciador de pacotes
sudo systemctl start docker           # Inicia o serviço Docker
sudo usermod -aG docker ec2-user      # Adiciona seu usuário ao grupo docker (evita usar sudo)
newgrp docker                         # Aplica a mudança de grupo sem precisar relogar
```

### Clonar o repositório

Baixa o código-fonte do projeto para o ambiente de deploy:

```bash
git clone https://github.com/Nana228228/AWS-kanban-board.git  # Baixa o repositório do GitHub
cd AWS-kanban-board                                            # Entra na pasta do projeto
```

---

## Etapa 1 — Definir Variáveis de Ambiente

Configura variáveis que serão usadas em todos os comandos seguintes. O `AWS_ACCOUNT_ID` é detectado automaticamente a partir das credenciais da sessão.

**RODE ISSO SEMPRE QUE ABRIR UM TERMINAL NOVO:**

```bash
export AWS_REGION=us-east-1                # Define a região AWS (Virginia)
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)  # Detecta o ID da conta automaticamente
export DB_USERNAME=kanban_admin             # Usuário do banco de dados RDS
export DB_PASSWORD="SuaSenhaSegura123!"    # Senha do banco (troque por uma sua)
export STACK_NAME=kanban-prod              # Prefixo usado nos nomes dos recursos
export BACKEND_IMAGE=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kanban-backend:latest   # URI completa da imagem backend no ECR
export FRONTEND_IMAGE=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kanban-frontend:latest # URI completa da imagem frontend no ECR

echo "Account: $AWS_ACCOUNT_ID | Região: $AWS_REGION"  # Confirma que as variáveis foram definidas
```

Se `Account` aparecer vazio, as credenciais expiraram → vá ao Learner Lab e clique **Start Lab**.

---

## Etapa 2 — Criar Repositórios ECR

O ECR (Elastic Container Registry) é o repositório privado onde armazenamos as imagens Docker do backend e frontend. O ECS Fargate puxa as imagens daqui para rodar os containers.

```bash
aws ecr create-repository --repository-name kanban-backend --region $AWS_REGION 2>/dev/null || echo "Já existe"   # Cria repo para imagem do backend (ignora erro se já existir)
aws ecr create-repository --repository-name kanban-frontend --region $AWS_REGION 2>/dev/null || echo "Já existe"  # Cria repo para imagem do frontend
```

---

## Etapa 3 — Build e Push das Imagens Docker

### Login no ECR

Autentica o Docker local com o ECR para permitir o push de imagens. O token dura 12 horas.

```bash
aws ecr get-login-password --region $AWS_REGION | \                                              # Gera token de autenticação do ECR
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com # Autentica o Docker com esse token
```

### Backend

Compila o código Java com Maven dentro de um container multi-stage, gera um JAR executável, e empacota numa imagem leve com JRE Alpine. Depois envia para o ECR.

```bash
docker build -t kanban-backend ./backend          # Builda a imagem Docker a partir do Dockerfile do backend
docker tag kanban-backend:latest $BACKEND_IMAGE   # Renomeia a imagem com o endereço completo do ECR
docker push $BACKEND_IMAGE                        # Envia a imagem para o ECR
```

### Frontend (primeira vez — sem VITE_API_URL, será atualizado depois)

Compila o React com Vite, copia os assets estáticos para uma imagem Nginx que serve o SPA. Na primeira vez, o frontend aponta para localhost (será corrigido na Etapa 8).

```bash
docker build -t kanban-frontend ./frontend          # Builda a imagem Docker do frontend (React + Nginx)
docker tag kanban-frontend:latest $FRONTEND_IMAGE   # Renomeia com endereço do ECR
docker push $FRONTEND_IMAGE                         # Envia para o ECR
```

---

## Etapa 4 — Criar Service Linked Role do ECS

O ECS precisa de uma Service Linked Role para gerenciar recursos em seu nome (registrar targets no ALB, etc.). Em contas novas ela pode não existir ainda.

```bash
aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com 2>/dev/null || echo "Já existe"  # Cria role interna que o ECS usa para gerenciar ALB targets
```

---

## Etapa 5 — Deploy da Infraestrutura Principal (CloudFormation)

O template `main.yaml` cria toda a infraestrutura de uma vez: VPC com subnets públicas e privadas, Internet Gateway, Route Tables, Security Groups, RDS MySQL em subnet privada, ALB internet-facing com roteamento por path, ECS Cluster Fargate, Task Definitions e Services para backend e frontend, e Log Groups no CloudWatch.

### Obter ARN da LabRole

A LabRole é a IAM Role pré-existente no Learner Lab. Usamos ela como Execution Role do ECS (permite puxar imagens do ECR e enviar logs ao CloudWatch).

```bash
ROLE_ARN=$(aws iam get-role --role-name LabRole --query "Role.Arn" --output text)  # Busca o ARN da LabRole pré-existente
echo "LabRole: $ROLE_ARN"                                                          # Confirma que encontrou
```

### Criar a stack

Envia o template para o CloudFormation, que provisiona todos os recursos na ordem correta de dependência. O RDS demora ~10 min para ficar disponível.

```bash
aws cloudformation create-stack \
  --stack-name kanban-main \                                          # Nome da stack (agrupamento de recursos)
  --template-body file://infrastructure/main.yaml \                   # Arquivo YAML com a definição da infraestrutura
  --parameters \
    ParameterKey=DBMasterUsername,ParameterValue=$DB_USERNAME \        # Usuário do RDS
    ParameterKey=DBMasterPassword,ParameterValue=$DB_PASSWORD \        # Senha do RDS
    ParameterKey=BackendImageUri,ParameterValue=$BACKEND_IMAGE \       # Imagem Docker do backend no ECR
    ParameterKey=FrontendImageUri,ParameterValue=$FRONTEND_IMAGE \     # Imagem Docker do frontend no ECR
    ParameterKey=ExecutionRoleArn,ParameterValue=$ROLE_ARN \           # LabRole para ECS puxar imagens e enviar logs
  --region $AWS_REGION

echo "Aguardando stack kanban-main... (10-15 min)"
aws cloudformation wait stack-create-complete --stack-name kanban-main --region $AWS_REGION && echo "✓ Stack criada!" || echo "✗ Falhou - rode: aws cloudformation describe-stack-events --stack-name kanban-main --region us-east-1 --query \"StackEvents[?ResourceStatus=='CREATE_FAILED'].[LogicalResourceId,ResourceStatusReason]\" --output table"
# wait: fica parado verificando o status a cada 30s até completar ou falhar
```

> **Nota:** NÃO use `--capabilities CAPABILITY_NAMED_IAM` — não criamos IAM Roles.

### Obter ALB DNS

Recupera o endereço público do Application Load Balancer. É por esse DNS que acessamos a aplicação no navegador e que a Lambda chama o backend.

```bash
ALB_DNS=$(aws elbv2 describe-load-balancers --region $AWS_REGION \
  --query "LoadBalancers[?LoadBalancerName=='kanban-prod-alb'].DNSName" --output text)  # Filtra pelo nome do ALB e extrai só o DNS
echo "ALB DNS: $ALB_DNS"  # Ex: kanban-prod-alb-123456.us-east-1.elb.amazonaws.com
```

---

## Etapa 6 — Deploy da Lambda

A Lambda é uma função serverless que recebe requisições de relatório via API Gateway, chama a API REST do backend (via ALB) para buscar dados, calcula estatísticas (distribuição de cards, burndown), e retorna JSON. Ela não acessa o banco diretamente — demonstra desacoplamento.

### Build

Instala dependências, transpila TypeScript para JavaScript com esbuild, e empacota num zip para upload na AWS.

```bash
cd lambda          # Entra na pasta da Lambda
npm install        # Instala dependências (axios, tipos)
npm run build      # Transpila TypeScript → JavaScript com esbuild
zip -j lambda-report.zip dist/index.js  # Empacota o JS num zip (-j = sem pastas internas)
cd ..              # Volta para a raiz do projeto
```

### Criar a função

Cria a função Lambda com Node.js 18, configura a variável `BACKEND_URL` apontando para o ALB, e usa a LabRole como execution role.

```bash
aws lambda create-function \
  --function-name kanban-report \                                    # Nome da função
  --runtime nodejs18.x \                                             # Runtime: Node.js 18
  --handler index.handler \                                          # Arquivo e função de entrada (index.js → export handler)
  --zip-file fileb://lambda/lambda-report.zip \                      # Código fonte empacotado
  --role $ROLE_ARN \                                                 # LabRole (permissão para CloudWatch Logs)
  --timeout 30 \                                                     # Timeout máximo de 30 segundos
  --memory-size 256 \                                                # 256 MB de RAM
  --environment "Variables={BACKEND_URL=http://$ALB_DNS}" \          # Variável de ambiente: URL do backend
  --region $AWS_REGION > /dev/null                                   # Suprime output JSON longo

echo "✓ Lambda criada"
```

### Obter ARN

Recupera o ARN (identificador único) da Lambda para usar como parâmetro na criação do API Gateway.

```bash
LAMBDA_ARN=$(aws lambda get-function --function-name kanban-report --region $AWS_REGION \
  --query "Configuration.FunctionArn" --output text)  # Extrai só o ARN do JSON de resposta
echo "Lambda ARN: $LAMBDA_ARN"  # Ex: arn:aws:lambda:us-east-1:730335459975:function:kanban-report
```

---

## Etapa 7 — Deploy do API Gateway

O API Gateway HTTP API é o ponto de entrada HTTPS da aplicação. Roteia requisições de relatório (`/report/*`) para a Lambda e todo o resto (`$default`) para o ALB, que por sua vez distribui entre backend e frontend.

```bash
aws cloudformation create-stack \
  --stack-name kanban-api-gateway \                                   # Nome da stack do API Gateway
  --template-body file://infrastructure/api-gateway.yaml \            # Template com rotas e integrações
  --parameters \
    ParameterKey=BackendALBDnsName,ParameterValue=$ALB_DNS \          # DNS do ALB para rota catch-all
    ParameterKey=LambdaFunctionArn,ParameterValue=$LAMBDA_ARN \       # ARN da Lambda para rotas /report/*
  --region $AWS_REGION

echo "Aguardando API Gateway..."
aws cloudformation wait stack-create-complete --stack-name kanban-api-gateway --region $AWS_REGION && echo "✓ API Gateway criado!" || echo "✗ Falhou"
```

### Obter endpoint

Recupera a URL pública do API Gateway (HTTPS com certificado automático).

```bash
API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name kanban-api-gateway --region $AWS_REGION \
  --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" --output text)  # Busca a URL nos Outputs da stack
echo "API Gateway: $API_ENDPOINT"  # Ex: https://abc123.execute-api.us-east-1.amazonaws.com/prod
```

> Se retornar `None`, vá ao Console AWS → API Gateway → `kanban-board-api` → copie a Invoke URL.

---

## Etapa 8 — Rebuild do Frontend com URL da API

O frontend React precisa saber para onde enviar as requisições HTTP. A variável `VITE_API_URL` é embutida no build (Vite substitui em tempo de compilação). Reconstruímos a imagem apontando para o ALB e forçamos um novo deploy no ECS.

```bash
echo "VITE_API_URL=http://$ALB_DNS" > frontend/.env.production  # Cria arquivo de env com URL da API para o build do Vite

docker build -t kanban-frontend ./frontend          # Rebuild com a nova URL embutida no JavaScript
docker tag kanban-frontend:latest $FRONTEND_IMAGE   # Tag com endereço do ECR
docker push $FRONTEND_IMAGE                         # Envia nova imagem para o ECR

aws ecs update-service \
  --cluster kanban-prod-cluster \
  --service kanban-prod-frontend-service \
  --force-new-deployment \                          # Força o ECS a puxar a imagem nova e substituir o container
  --region $AWS_REGION > /dev/null

echo "✓ Frontend atualizado. Aguarde 2-3 min e acesse: http://$ALB_DNS"
```

---

## Etapa 9 — Verificação

Testa cada camada da arquitetura: o health check confirma que o Spring Boot está rodando e conectado ao RDS; a listagem de projetos testa o CRUD completo (API Gateway → ALB → Backend → RDS); o relatório testa a Lambda (API Gateway → Lambda → ALB → Backend).

Aguarde 2-3 minutos, depois:

```bash
echo "--- Health Check ---"
curl -s http://$ALB_DNS/actuator/health      # Testa se o Spring Boot está rodando (endpoint do Actuator)

echo ""
echo "--- Projetos (CRUD) ---"
curl -s http://$ALB_DNS/projects             # Testa o fluxo completo: ALB → Backend → RDS → resposta JSON

echo ""
echo "--- Lambda (relatório) ---"
curl -s $API_ENDPOINT/report/board/1         # Testa: API Gateway → Lambda → Backend → resposta JSON
```

Resultados esperados:
- Health: `{"status":"UP"}`
- Projetos: `[]` (banco vazio)
- Relatório: `{"error":"Not Found","message":"Quadro com id 1 não encontrado"}` (correto, não há boards)

**Acesse no navegador:** `http://ALB_DNS_AQUI` para ver o frontend React.

---

## Troubleshooting

### "The security token included in the request is invalid"

As credenciais gerenciadas do Cloud9 não cobrem todos os serviços AWS (ex: `apigatewayv2`). Use o Console AWS para esses casos, ou configure credenciais manuais:
1. Learner Lab → **AWS Details** → **Show** (AWS CLI)
2. Copie as 3 linhas e cole em `~/.aws/credentials`

### Stack falha com "iam:CreateRole not authorized"

O template está tentando criar IAM Role. O Learner Lab bloqueia isso. Use o parâmetro `ExecutionRoleArn` com a `LabRole` pré-existente.

### "DefaultAction" → "An action must be specified"

O campo correto no CloudFormation é `DefaultActions` (plural) no ALBListener. Já corrigido no template atual.

### Frontend mostra "Network Error"

O frontend foi buildado sem `VITE_API_URL`, então está chamando `localhost:8080`. Rebuild com a URL do ALB (Etapa 8).

### Lambda retorna "Rota não encontrada"

O API Gateway HTTP API com stage `prod` envia o path com prefixo `/prod` no `rawPath`. O `index.ts` precisa remover esse prefixo:
```typescript
let path = event.rawPath || event.path || '';
path = path.replace(/^\/prod/, '') || '/';
```

### Variáveis vazias ($ALB_DNS, $API_ENDPOINT)

Variáveis de ambiente se perdem ao abrir novo terminal. Rode a Etapa 1 novamente.

### "ECS Service Linked Role does not exist"

Rode: `aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com`

---

## Limpeza (para não consumir créditos)

Deleta todos os recursos na ordem inversa de dependência. O CloudFormation cuida de remover cada recurso que ele criou.

```bash
aws cloudformation delete-stack --stack-name kanban-api-gateway --region us-east-1          # Deleta API Gateway e suas rotas
aws cloudformation wait stack-delete-complete --stack-name kanban-api-gateway --region us-east-1  # Aguarda conclusão

aws lambda delete-function --function-name kanban-report --region us-east-1                 # Deleta a função Lambda

aws cloudformation delete-stack --stack-name kanban-main --region us-east-1                 # Deleta VPC, RDS, ALB, ECS — tudo
aws cloudformation wait stack-delete-complete --stack-name kanban-main --region us-east-1   # Aguarda (~5 min por causa do RDS)

aws ecr delete-repository --repository-name kanban-backend --force --region us-east-1      # Deleta imagens Docker do backend
aws ecr delete-repository --repository-name kanban-frontend --force --region us-east-1     # Deleta imagens Docker do frontend

echo "✓ Tudo deletado"
```

---

## Estimativa de Custos e Duração dos Créditos

### Custo por hora (tudo rodando)

| Serviço | Custo/hora |
|---------|-----------|
| ECS Fargate backend (0.5 vCPU + 1 GB) | $0.0327 |
| ECS Fargate frontend (0.25 vCPU + 0.5 GB) | $0.0164 |
| ALB | $0.0225 |
| RDS db.t3.micro | $0.017 |
| Lambda + API Gateway | ~$0 (free tier) |
| **Total por hora** | **~$0.088** |

### Projeção

| Cenário | Custo/dia | USD 50 duram |
|---------|-----------|-------------|
| Rodando 24/7 | ~$2.12 | **~23 dias** |
| Rodando 12h/dia | ~$1.06 | **~47 dias** |
| Rodando 4h/dia (só para testar) | ~$0.35 | **~142 dias** |

### Conclusão: Com $50 e uso 24/7, dura ~3 semanas. Em 2 semanas consome ~$30.

---

## Comportamento ao End Lab / Start Lab

### O que acontece ao clicar "End Lab"?

- **Os recursos NÃO são deletados.** VPC, RDS, ECS, ALB, Lambda — tudo continua existindo.
- **Os recursos continuam cobrando** mesmo com o lab encerrado (~$2.12/dia).
- O que muda é que suas credenciais expiram e você perde acesso ao console.

### O que fazer ao dar "Start Lab" novamente?

Nada de especial — tudo já está rodando. Só precisa:

1. Abrir o Console AWS (botão "AWS" no lab)
2. Acessar a aplicação no navegador: `http://SEU_ALB_DNS`

Se precisar rodar comandos no terminal (Cloud9), lembre de redefinir as variáveis (Etapa 1).

### Resumo: para 2 semanas

Com $50 e tudo rodando 24/7, em 2 semanas você gasta ~$30. **Sobra crédito.** Não precisa deletar nada — só use o lab normalmente.

---

## Dicas para Economizar Créditos (se precisar estender além de 2 semanas)

### 1. Deletar tudo quando não estiver usando (MELHOR OPÇÃO)

Remove toda a infraestrutura. Recriar leva ~15 min seguindo este guia. As imagens Docker ficam no ECR (custo desprezível).

```bash
aws cloudformation delete-stack --stack-name kanban-api-gateway --region us-east-1  # Remove API Gateway
aws lambda delete-function --function-name kanban-report --region us-east-1         # Remove Lambda
aws cloudformation delete-stack --stack-name kanban-main --region us-east-1         # Remove toda a infra (VPC, RDS, ALB, ECS)
```

### 2. Parar o RDS quando não usar

Para a instância do banco de dados. Economiza ~$0.017/h. Atenção: o RDS reinicia automaticamente após 7 dias parado.

```bash
aws rds stop-db-instance --db-instance-identifier kanban-prod-mysql --region us-east-1  # Para o banco (não deleta dados)
```

### 3. Zerar os ECS Services (manter infra, parar containers)

Define o número de containers desejados como zero. A infra (VPC, ALB, RDS) continua existindo mas os containers param de rodar e cobrar.

```bash
# Parar containers (desired-count 0 = nenhum container rodando)
aws ecs update-service --cluster kanban-prod-cluster --service kanban-prod-backend-service --desired-count 0 --region us-east-1
aws ecs update-service --cluster kanban-prod-cluster --service kanban-prod-frontend-service --desired-count 0 --region us-east-1
```

Para religar (volta a rodar 1 container de cada):

```bash
# Religar containers (desired-count 1 = 1 container de cada)
aws ecs update-service --cluster kanban-prod-cluster --service kanban-prod-backend-service --desired-count 1 --region us-east-1
aws ecs update-service --cluster kanban-prod-cluster --service kanban-prod-frontend-service --desired-count 1 --region us-east-1
```

### 4. Não esquecer o Cloud9/EC2 de deploy

O ambiente Cloud9 (ou EC2 manual) usado para deploy consome ~$0.02/h mesmo sem uso. Depois de terminar o deploy, delete-o pelo console.

### Resumo de economia

| Ação | Economia |
|------|----------|
| Deletar tudo e recriar quando precisar | 100% quando parado |
| Zerar ECS + parar RDS | ~70% (só paga ALB) |
| Deletar ALB também | ~95% (só paga RDS parado = $0) |

**Recomendação:** Para um projeto acadêmico, delete tudo com o script de limpeza e recrie quando for apresentar. Leva 15 min e economiza todo o custo.

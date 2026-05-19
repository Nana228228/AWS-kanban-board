#!/bin/bash
# =============================================================================
# Script de Deploy — Kanban Board na AWS
# Executa todas as etapas de migração automaticamente.
# 
# Uso:
#   chmod +x infrastructure/deploy.sh
#   ./infrastructure/deploy.sh
#
# Pré-requisitos:
#   - AWS CLI v2 configurado (aws configure)
#   - Docker instalado e rodando
#   - Node.js instalado (para build da Lambda)
# =============================================================================

set -e

# ===== CONFIGURAÇÃO =====
export AWS_REGION=${AWS_REGION:-us-east-1}
export STACK_NAME=${STACK_NAME:-kanban-prod}
export DB_USERNAME=${DB_USERNAME:-kanban_admin}
export DB_PASSWORD=${DB_PASSWORD:-KanbanSecure2024!}

# Detectar Account ID
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✓ Account ID: $AWS_ACCOUNT_ID"
echo "✓ Região: $AWS_REGION"

# ===== ETAPA 1: Criar repositórios ECR =====
echo ""
echo "═══════════════════════════════════════════"
echo "  ETAPA 1: Criando repositórios ECR"
echo "═══════════════════════════════════════════"

aws ecr describe-repositories --repository-names kanban-backend --region $AWS_REGION 2>/dev/null || \
  aws ecr create-repository --repository-name kanban-backend --region $AWS_REGION

aws ecr describe-repositories --repository-names kanban-frontend --region $AWS_REGION 2>/dev/null || \
  aws ecr create-repository --repository-name kanban-frontend --region $AWS_REGION

echo "✓ Repositórios ECR prontos"

# ===== ETAPA 2: Login no ECR =====
echo ""
echo "═══════════════════════════════════════════"
echo "  ETAPA 2: Login no ECR"
echo "═══════════════════════════════════════════"

aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

echo "✓ Login ECR OK"

# ===== ETAPA 3: Build e Push do Backend =====
echo ""
echo "═══════════════════════════════════════════"
echo "  ETAPA 3: Build e Push do Backend"
echo "═══════════════════════════════════════════"

BACKEND_IMAGE=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kanban-backend:latest

docker build -t kanban-backend ./backend
docker tag kanban-backend:latest $BACKEND_IMAGE
docker push $BACKEND_IMAGE

echo "✓ Backend image pushed: $BACKEND_IMAGE"

# ===== ETAPA 4: Deploy da infraestrutura principal =====
echo ""
echo "═══════════════════════════════════════════"
echo "  ETAPA 4: Deploy CloudFormation (main)"
echo "═══════════════════════════════════════════"

# Usar imagem placeholder para frontend (será atualizada depois)
FRONTEND_IMAGE=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kanban-frontend:latest

# Verificar se stack já existe
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name kanban-main --region $AWS_REGION \
  --query "Stacks[0].StackStatus" --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [ "$STACK_STATUS" = "DOES_NOT_EXIST" ]; then
  echo "Criando stack kanban-main..."
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

  echo "Aguardando criação da stack (pode levar 10-15 min)..."
  aws cloudformation wait stack-create-complete --stack-name kanban-main --region $AWS_REGION
else
  echo "Stack já existe (status: $STACK_STATUS). Atualizando..."
  aws cloudformation update-stack \
    --stack-name kanban-main \
    --template-body file://infrastructure/main.yaml \
    --parameters \
      ParameterKey=DBMasterUsername,ParameterValue=$DB_USERNAME \
      ParameterKey=DBMasterPassword,ParameterValue=$DB_PASSWORD \
      ParameterKey=BackendImageUri,ParameterValue=$BACKEND_IMAGE \
      ParameterKey=FrontendImageUri,ParameterValue=$FRONTEND_IMAGE \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $AWS_REGION 2>/dev/null || echo "Nenhuma atualização necessária"
fi

# Obter outputs
ALB_DNS=$(aws cloudformation describe-stacks --stack-name kanban-main --region $AWS_REGION \
  --query "Stacks[0].Outputs[?OutputKey=='ALBDnsName'].OutputValue" --output text)

echo "✓ Infraestrutura principal deployada"
echo "✓ ALB DNS: $ALB_DNS"

# ===== ETAPA 5: Build e Push do Frontend =====
echo ""
echo "═══════════════════════════════════════════"
echo "  ETAPA 5: Build e Push do Frontend"
echo "═══════════════════════════════════════════"

# O frontend precisa saber a URL da API. 
# Por enquanto, aponta para o ALB. Será atualizado para API Gateway depois.
echo "VITE_API_URL=http://$ALB_DNS" > frontend/.env.production

docker build -t kanban-frontend ./frontend
docker tag kanban-frontend:latest $FRONTEND_IMAGE
docker push $FRONTEND_IMAGE

# Force new deployment
aws ecs update-service \
  --cluster ${STACK_NAME}-cluster \
  --service ${STACK_NAME}-frontend-service \
  --force-new-deployment \
  --region $AWS_REGION > /dev/null

echo "✓ Frontend image pushed e service atualizado"

# ===== ETAPA 6: Deploy da Lambda =====
echo ""
echo "═══════════════════════════════════════════"
echo "  ETAPA 6: Deploy da Lambda"
echo "═══════════════════════════════════════════"

# Build
cd lambda
npm install --silent
npm run build
zip -j lambda-report.zip dist/index.js
cd ..

# Verificar se Lambda já existe
LAMBDA_EXISTS=$(aws lambda get-function --function-name kanban-report --region $AWS_REGION 2>/dev/null && echo "yes" || echo "no")

if [ "$LAMBDA_EXISTS" = "no" ]; then
  # Tentar usar LabRole primeiro, senão criar uma nova
  ROLE_ARN=$(aws iam get-role --role-name LabRole --query "Role.Arn" --output text 2>/dev/null || echo "")
  
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
      }' > /dev/null

    aws iam attach-role-policy \
      --role-name kanban-lambda-role \
      --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

    ROLE_ARN=arn:aws:iam::$AWS_ACCOUNT_ID:role/kanban-lambda-role
    echo "Aguardando propagação da role (10s)..."
    sleep 10
  fi

  aws lambda create-function \
    --function-name kanban-report \
    --runtime nodejs18.x \
    --handler index.handler \
    --zip-file fileb://lambda/lambda-report.zip \
    --role $ROLE_ARN \
    --timeout 30 \
    --memory-size 256 \
    --environment "Variables={BACKEND_URL=http://$ALB_DNS}" \
    --region $AWS_REGION > /dev/null
else
  aws lambda update-function-code \
    --function-name kanban-report \
    --zip-file fileb://lambda/lambda-report.zip \
    --region $AWS_REGION > /dev/null

  aws lambda update-function-configuration \
    --function-name kanban-report \
    --environment "Variables={BACKEND_URL=http://$ALB_DNS}" \
    --region $AWS_REGION > /dev/null
fi

LAMBDA_ARN=$(aws lambda get-function --function-name kanban-report --region $AWS_REGION \
  --query "Configuration.FunctionArn" --output text)

echo "✓ Lambda deployada: $LAMBDA_ARN"

# ===== ETAPA 7: Deploy do API Gateway =====
echo ""
echo "═══════════════════════════════════════════"
echo "  ETAPA 7: Deploy do API Gateway"
echo "═══════════════════════════════════════════"

APIGW_STATUS=$(aws cloudformation describe-stacks --stack-name kanban-api-gateway --region $AWS_REGION \
  --query "Stacks[0].StackStatus" --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [ "$APIGW_STATUS" = "DOES_NOT_EXIST" ]; then
  aws cloudformation create-stack \
    --stack-name kanban-api-gateway \
    --template-body file://infrastructure/api-gateway.yaml \
    --parameters \
      ParameterKey=BackendALBDnsName,ParameterValue=$ALB_DNS \
      ParameterKey=LambdaFunctionArn,ParameterValue=$LAMBDA_ARN \
    --region $AWS_REGION

  echo "Aguardando criação do API Gateway..."
  aws cloudformation wait stack-create-complete --stack-name kanban-api-gateway --region $AWS_REGION
else
  aws cloudformation update-stack \
    --stack-name kanban-api-gateway \
    --template-body file://infrastructure/api-gateway.yaml \
    --parameters \
      ParameterKey=BackendALBDnsName,ParameterValue=$ALB_DNS \
      ParameterKey=LambdaFunctionArn,ParameterValue=$LAMBDA_ARN \
    --region $AWS_REGION 2>/dev/null || echo "Nenhuma atualização necessária"
fi

API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name kanban-api-gateway --region $AWS_REGION \
  --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" --output text)

echo "✓ API Gateway deployado: $API_ENDPOINT"

# ===== ETAPA 8: Atualizar Frontend com URL do API Gateway =====
echo ""
echo "═══════════════════════════════════════════"
echo "  ETAPA 8: Rebuild Frontend com API Gateway URL"
echo "═══════════════════════════════════════════"

echo "VITE_API_URL=$API_ENDPOINT" > frontend/.env.production

docker build -t kanban-frontend ./frontend
docker tag kanban-frontend:latest $FRONTEND_IMAGE
docker push $FRONTEND_IMAGE

aws ecs update-service \
  --cluster ${STACK_NAME}-cluster \
  --service ${STACK_NAME}-frontend-service \
  --force-new-deployment \
  --region $AWS_REGION > /dev/null

echo "✓ Frontend atualizado com URL do API Gateway"

# ===== RESUMO FINAL =====
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ DEPLOY COMPLETO!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  🌐 API Gateway:  $API_ENDPOINT"
echo "  🔀 ALB:          http://$ALB_DNS"
echo "  📊 Relatórios:   $API_ENDPOINT/report/board/1"
echo "  💚 Health:       http://$ALB_DNS/actuator/health"
echo ""
echo "  Aguarde 2-3 minutos para os containers ficarem healthy."
echo "═══════════════════════════════════════════════════════════════"

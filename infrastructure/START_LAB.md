# Como Acessar a Aplicação (após Start Lab)

Se a infraestrutura já foi deployada anteriormente, a aplicação continua rodando. Basta:

---

## Passo 1 — Iniciar o Lab

1. Acesse o Learner Lab (AWS Academy / Canvas)
2. Clique **Start Lab**
3. Aguarde o indicador ficar 🟢 verde
4. Clique no botão **AWS** para abrir o Console

---

## Passo 2 — Pegar a URL da aplicação

No Console AWS:

1. Na barra de busca, digite **EC2**
2. No menu lateral, clique em **Load Balancers**
3. Clique no ALB `kanban-prod-alb`
4. Copie o **DNS name** (algo como `kanban-prod-alb-427678096.us-east-1.elb.amazonaws.com`)

---

## Passo 3 — Acessar no navegador

Cole no navegador:

```
http://kanban-prod-alb-427678096.us-east-1.elb.amazonaws.com
```

(substitua pelo DNS real do seu ALB)

Pronto. O Kanban Board deve carregar.

---

## Passo 4 — Testar os relatórios (Lambda)

Para a URL do API Gateway:

1. No Console AWS, busque **API Gateway**
2. Clique em `kanban-board-api`
3. Copie a **Invoke URL** (algo como `https://abc123.execute-api.us-east-1.amazonaws.com/prod`)

Teste no navegador:

```
https://abc123.execute-api.us-east-1.amazonaws.com/prod/report/board/1
```

---

## Se a aplicação não carregar

### Tela em branco ou "não é possível acessar o site"

Os containers podem ter sido parados. No Console AWS:

1. Busque **ECS** → clique no cluster `kanban-prod-cluster`
2. Verifique se os services `kanban-prod-backend-service` e `kanban-prod-frontend-service` têm **Running tasks: 1**
3. Se estiver 0, clique no service → **Update** → mude **Desired tasks** para 1 → **Update**
4. Aguarde 2-3 minutos

### Erro 503 (Service Temporarily Unavailable)

Os containers estão subindo. Aguarde 2-3 minutos e tente novamente (o backend Spring Boot demora ~50s para iniciar).

### O banco perdeu os dados?

Não. O RDS persiste dados independente do estado dos containers. Seus projetos, boards e cards continuam lá.

---

## Resumo

| O que fazer | Onde |
|-------------|------|
| Iniciar o lab | Learner Lab → Start Lab |
| Acessar o frontend | `http://DNS_DO_ALB` (pegar no Console → EC2 → Load Balancers) |
| Acessar relatórios | `https://URL_API_GATEWAY/prod/report/board/{id}` (pegar no Console → API Gateway) |
| Verificar containers | Console → ECS → Cluster → Services |

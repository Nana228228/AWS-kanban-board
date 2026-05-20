# Guia de Estudo — Serviços AWS na Prática

Este documento explica cada serviço AWS utilizado no projeto Kanban Board, por que foi escolhido, como funciona, e como se conecta com os demais. Voltado para quem está começando em computação em nuvem.

---

## Índice

1. [O que é a Nuvem?](#1--o-que-é-a-nuvem)
2. [VPC — Rede Virtual Privada](#2--vpc-virtual-private-cloud)
3. [Subnets — Divisões da Rede](#3--subnets-divisões-da-rede)
4. [Internet Gateway — Porta para a Internet](#4--internet-gateway-igw)
5. [Route Tables — Regras de Tráfego](#5--route-tables-tabelas-de-roteamento)
6. [Security Groups — Firewall Virtual](#6--security-groups-firewall-virtual)
7. [RDS — Banco de Dados Gerenciado](#7--rds-relational-database-service)
8. [ECR — Registro de Imagens Docker](#8--ecr-elastic-container-registry)
9. [ECS Fargate — Containers sem Servidor](#9--ecs-fargate-elastic-container-service)
10. [ALB — Balanceador de Carga](#10--alb-application-load-balancer)
11. [Lambda — Função Serverless](#11--lambda-função-serverless)
12. [API Gateway — Porta de Entrada da API](#12--api-gateway-http-api)
13. [CloudWatch — Monitoramento e Logs](#13--cloudwatch-monitoramento-e-logs)
14. [IAM — Controle de Acesso](#14--iam-identity-and-access-management)
15. [Cloud9 e CloudShell — Ambientes de Desenvolvimento](#15--cloud9-e-cloudshell-ambientes-de-desenvolvimento)
16. [Como Tudo se Conecta](#16--como-tudo-se-conecta)
17. [Decisões Arquiteturais](#17--decisões-arquiteturais)
18. [Glossário](#18--glossário)

---

## 1 — O que é a Nuvem?

Computação em nuvem é o provisionamento sob demanda de recursos computacionais (CPU, memória, armazenamento, rede) via internet, com cobrança por uso (pay-as-you-go). O provedor (AWS) mantém os data centers físicos, virtualiza os recursos via hypervisors, e expõe APIs para criação/destruição programática de infraestrutura.

### Modelos de serviço

| Modelo | Você gerencia | AWS gerencia | Exemplo no projeto |
|--------|--------------|--------------|-------------------|
| **IaaS** (Infraestrutura) | App, OS, rede | Hardware, data center | VPC, Subnets |
| **PaaS** (Plataforma) | App, dados | OS, runtime, rede | RDS, ECS Fargate |
| **SaaS** (Software) | Nada | Tudo | — |
| **FaaS** (Função) | Código | Todo o resto | Lambda |

### Por que usamos AWS?

- É a plataforma de nuvem mais utilizada no mercado
- Tem free tier generoso para aprendizado
- Integração entre serviços é nativa
- Documentação extensa e comunidade ativa

---

## 2 — VPC (Virtual Private Cloud)

### O que é

Uma rede virtual isolada dentro da AWS, implementada via SDN (Software-Defined Networking). Cada VPC tem seu próprio espaço de endereçamento IP, tabelas de roteamento, e regras de firewall. O isolamento é garantido por encapsulamento de pacotes — o tráfego de uma VPC nunca se mistura com o de outra, mesmo compartilhando hardware físico.

### Detalhes técnicos

- Implementada sobre a infraestrutura de rede da AWS usando virtualização de rede (similar a VXLAN)
- Cada VPC é confinada a uma região AWS, mas pode abranger múltiplas AZs
- O range de IPs é definido na criação e não pode ser alterado (apenas expandido com CIDRs secundários)
- Suporta IPv4 e dual-stack (IPv4 + IPv6)

### No nosso projeto

```
VPC: 10.0.0.0/16 (65.536 IPs disponíveis)
Nome: Projeto2-vpc
```

### Por que usamos

- **Isolamento:** Nossos recursos (banco, backend) ficam protegidos
- **Controle:** Definimos exatamente quem pode acessar o quê
- **Requisito:** Todos os serviços AWS (ECS, RDS, ALB) precisam estar numa VPC

### Conceito importante: CIDR

`10.0.0.0/16` é uma notação que define o range de IPs. O `/16` significa que os primeiros 16 bits são fixos (10.0.x.x), sobrando 65.536 combinações para usar.

---

## 3 — Subnets (Divisões da Rede)

### O que é

Subdivisões lógicas da VPC, cada uma mapeada a uma Availability Zone (AZ) específica. Uma AZ corresponde a um ou mais data centers fisicamente isolados (energia, refrigeração, rede independentes) dentro de uma região. Cada subnet recebe um bloco CIDR menor que o da VPC.

### Subnet pública vs privada — diferença técnica

A diferença não é um atributo da subnet em si, mas sim **qual Route Table está associada a ela**. Uma subnet é "pública" se sua Route Table tem uma rota `0.0.0.0/0 → Internet Gateway`. Sem essa rota, é "privada".

### No nosso projeto

| Subnet | CIDR | AZ | Tipo | O que roda aqui |
|--------|------|----|------|-----------------|
| Pública 1 | 10.0.1.0/24 | us-east-1a | Pública | ALB, ECS (backend/frontend) |
| Pública 2 | 10.0.3.0/24 | us-east-1b | Pública | ALB, ECS (backend/frontend) |
| Privada 1 | 10.0.0.0/24 | us-east-1a | Privada | RDS |
| Privada 2 | 10.0.2.0/24 | us-east-1b | Privada | RDS |

### Pública vs Privada

| Característica | Subnet Pública | Subnet Privada |
|---------------|---------------|----------------|
| Acesso à internet | ✅ Sim (via IGW) | ❌ Não |
| Acessível da internet | ✅ Sim | ❌ Não |
| Uso típico | Web servers, load balancers | Bancos de dados, cache |
| Rota 0.0.0.0/0 | → Internet Gateway | Não existe (ou → NAT) |

### Por que usamos 2 AZs

O ALB exige subnets em pelo menos 2 Availability Zones. Isso garante **alta disponibilidade** — se um data center cair, o outro continua funcionando.

---

## 4 — Internet Gateway (IGW)

### O que é

Componente gerenciado pela AWS que realiza NAT (Network Address Translation) bidirecional entre IPs privados da VPC e IPs públicos da internet. É horizontalmente escalável e altamente disponível dentro de uma AZ. Diferente de um NAT Gateway (que só permite saída), o IGW permite tráfego de entrada e saída.

### Como funciona tecnicamente

1. Pacote sai de um recurso com IP público (ex: ALB) com destino externo
2. O IGW traduz o IP privado do recurso para o Elastic IP/IP público associado
3. Pacote de resposta chega no IGW, que traduz de volta para o IP privado e encaminha ao recurso

### No nosso projeto

```
IGW: igw-05410d7d713b028c5
Attached à VPC: Projeto2-vpc
```

### Por que usamos

- O ALB precisa receber tráfego da internet
- Os containers ECS precisam baixar imagens do ECR
- Sem IGW, a aplicação seria inacessível

### Erro comum que encontramos

A route table apontava `0.0.0.0/0` para um **NAT Gateway** em vez do IGW. Resultado: o ALB não recebia tráfego externo. NAT permite saída mas não entrada.

---

## 5 — Route Tables (Tabelas de Roteamento)

### O que é

Conjunto de regras de roteamento IP (longest-prefix match) que determinam o next-hop de cada pacote baseado no endereço de destino. Cada subnet é associada a exatamente uma Route Table. O roteamento é avaliado localmente — não há roteamento entre subnets sem regra explícita (o tráfego intra-VPC usa a rota `local` implícita).

### Funcionamento técnico

O roteador virtual da VPC avalia as rotas por especificidade (longest prefix match): `/32` tem prioridade sobre `/24`, que tem prioridade sobre `/0`. A rota `local` (CIDR da VPC) é implícita e não pode ser removida.

### No nosso projeto

**Route Table Pública:**

| Destino | Alvo | Significado |
|---------|------|-------------|
| 10.0.0.0/16 | local | Tráfego interno da VPC |
| 0.0.0.0/0 | igw-xxxxx | Todo o resto vai para internet |

**Route Table Privada:**

| Destino | Alvo | Significado |
|---------|------|-------------|
| 10.0.0.0/16 | local | Tráfego interno da VPC apenas |

### Por que a privada não tem rota para internet

O RDS não precisa (e não deve) acessar a internet. Ele só conversa com o backend, que está na mesma VPC. Isso é uma camada extra de segurança.

---

## 6 — Security Groups (Firewall Virtual)

### O que é

Firewall stateful na camada 4 (transporte) que filtra tráfego por protocolo, porta e origem/destino. "Stateful" significa que se uma conexão de saída é permitida, a resposta de entrada é automaticamente permitida (sem regra explícita de inbound). Regras são avaliadas em conjunto — se qualquer regra permite o tráfego, ele passa (não há regras de deny explícitas).

### Diferença de Network ACL

| | Security Group | Network ACL |
|--|--|--|
| Nível | Recurso (ENI) | Subnet |
| Stateful | Sim | Não |
| Regras | Só allow | Allow e deny |
| Avaliação | Todas as regras | Ordem numérica |

### No nosso projeto

| Security Group | Permite entrada de | Na porta | Para quê |
|---------------|-------------------|----------|----------|
| kanban-alb-sg | Qualquer IP (0.0.0.0/0) | 80 | Receber HTTP da internet |
| kanban-backend-sg | Apenas do ALB SG | 8080 | Backend só aceita do ALB |
| kanban-frontend-sg | Apenas do ALB SG | 80 | Frontend só aceita do ALB |
| kanban-rds-sg | Apenas do Backend SG | 3306 | RDS só aceita do backend |

### Princípio do menor privilégio

Cada recurso só aceita tráfego de quem realmente precisa acessá-lo:

```
Internet → ALB (porta 80)
ALB → Backend (porta 8080)
ALB → Frontend (porta 80)
Backend → RDS (porta 3306)
```

Ninguém da internet acessa o RDS diretamente. Nem o frontend acessa o RDS.

### Por que usamos referência entre SGs (não IPs)

Em vez de liberar um IP específico, liberamos "qualquer recurso que pertença ao SG do ALB". Assim, se o IP do ALB mudar, a regra continua funcionando.

---

## 7 — RDS (Relational Database Service)

### O que é

Serviço gerenciado de banco de dados relacional. A AWS provisiona a instância, configura replicação síncrona (Multi-AZ), executa backups automáticos via snapshots do EBS, aplica patches de segurança do engine na janela de manutenção, e monitora métricas (CPU, IOPS, conexões) via CloudWatch. O acesso é via endpoint DNS que resolve para o IP privado da instância.

### No nosso projeto

```
Engine: MySQL 8.0
Instance: db.t3.micro (1 vCPU, 1 GB RAM)
Storage: 20 GB gp3
Database: kanban_board
Subnet: Privada (sem acesso público)
```

### Por que usamos RDS (e não MySQL num container)

| Aspecto | MySQL em container | RDS |
|---------|-------------------|-----|
| Backups automáticos | ❌ Você configura | ✅ Diário, retenção 7 dias |
| Patches de segurança | ❌ Manual | ✅ Automático |
| Alta disponibilidade | ❌ Complexo | ✅ Multi-AZ com 1 clique |
| Dados persistem se container morrer | ❌ Perde tudo | ✅ Sempre persiste |
| Custo | Mais barato | ~$15/mês (free tier 12 meses) |

### Por que está em subnet privada

- O banco contém dados sensíveis
- Não há motivo para ser acessível da internet
- Apenas o backend precisa acessá-lo
- É um requisito de segurança básico

### Configuração importante: ddl-auto

```
SPRING_JPA_HIBERNATE_DDL_AUTO=update
```

Isso faz o Hibernate criar/atualizar as tabelas automaticamente. Em produção real usaríamos `validate` + migrations (Flyway/Liquibase), mas para o projeto acadêmico `update` simplifica.

---

## 8 — ECR (Elastic Container Registry)

### O que é

Registry de imagens OCI (Open Container Initiative) gerenciado pela AWS. Armazena imagens Docker como layers comprimidas em S3, com autenticação via IAM (token temporário de 12h gerado por `ecr get-login-password`). Suporta image scanning para vulnerabilidades (CVEs) e lifecycle policies para limpeza automática de imagens antigas.

### No nosso projeto

```
Repositórios:
- kanban-backend (imagem do Spring Boot)
- kanban-frontend (imagem do Nginx + React)
```

### Fluxo

```
Código → docker build → docker tag → docker push → ECR
                                                      ↓
                                              ECS puxa a imagem
```

### Por que usamos

- ECS Fargate precisa de uma imagem Docker para rodar
- ECR é integrado nativamente (sem configurar credenciais extras)
- Imagens ficam na mesma região (download rápido)

---

## 9 — ECS Fargate (Elastic Container Service)

### O que é

Orquestrador de containers gerenciado. O **Fargate** é o launch type serverless — a AWS provisiona a infraestrutura computacional (microVM Firecracker) sob demanda para cada task, sem expor instâncias EC2. Cada task recebe uma ENI (Elastic Network Interface) própria com IP privado na subnet, isolamento de rede completo via VPC networking.

### Conceitos do ECS

| Conceito | Definição técnica |
|----------|-------------------|
| **Cluster** | Namespace lógico que agrupa services e tasks |
| **Task Definition** | Template imutável (versionado) que define: imagem, CPU/RAM, port mappings, env vars, log config, IAM roles |
| **Task** | Instância em execução de uma Task Definition (1 ou mais containers compartilhando rede e storage) |
| **Service** | Controller que mantém N réplicas de uma Task Definition rodando, integra com ALB, e faz rolling updates |

### No nosso projeto

```
Cluster: kanban-cluster

Service: kanban-backend
  - Task Definition: kanban-backend:7
  - CPU: 512 (0.5 vCPU)
  - RAM: 1024 MB
  - Porta: 8080
  - Desired Count: 1

Service: kanban-frontend
  - Task Definition: kanban-frontend:2
  - CPU: 256 (0.25 vCPU)
  - RAM: 512 MB
  - Porta: 80
  - Desired Count: 1
```

### Por que Fargate (e não EC2)

| Aspecto | EC2 | Fargate |
|---------|-----|---------|
| Gerenciar servidores | ✅ Você gerencia | ❌ AWS gerencia |
| Pagar por servidor ocioso | ✅ Paga mesmo parado | ❌ Paga só pelo uso |
| Escalar | Manual ou Auto Scaling | Automático |
| Patches de OS | Você aplica | AWS aplica |
| Complexidade | Alta | Baixa |

### Health Check Grace Period

```
--health-check-grace-period-seconds 120
```

O Spring Boot demora ~50 segundos para iniciar. Sem esse grace period, o ALB marca a task como unhealthy antes dela ficar pronta e o ECS a mata — criando um loop infinito.

---

## 10 — ALB (Application Load Balancer)

### O que é

Load balancer de camada 7 (OSI) que opera no nível HTTP/HTTPS. Faz parse dos headers, path e query string de cada requisição para tomar decisões de roteamento. Distribui conexões entre targets registrados em Target Groups usando round-robin por padrão. Executa health checks periódicos e remove targets unhealthy do pool de roteamento.

### No nosso projeto

```
ALB: kanban-alb (internet-facing)
DNS: kanban-alb-1078428535.us-east-1.elb.amazonaws.com

Regras de roteamento:
  /projects*, /boards*, /columns*, /cards*, /actuator* → Backend (porta 8080)
  Todo o resto (/) → Frontend (porta 80)
```

### Componentes

| Componente | Função |
|-----------|--------|
| **Listener** | Escuta na porta 80 |
| **Rules** | Decide para onde rotear baseado no path |
| **Target Group** | Grupo de containers que recebem tráfego |
| **Health Check** | Verifica se os containers estão saudáveis |

### Por que usamos

- **Ponto único de entrada:** Um só DNS para frontend e backend
- **Roteamento por path:** `/projects` vai pro backend, `/` vai pro frontend
- **Health checks:** Remove containers doentes automaticamente
- **Requisito:** ECS Fargate precisa de um load balancer para expor serviços

### Por que internet-facing

O ALB precisa ser acessível da internet para que os usuários acessem a aplicação. Se fosse "internal", só recursos dentro da VPC poderiam acessá-lo.

---

## 11 — Lambda (Função Serverless)

### O que é

Serviço de computação event-driven que executa código em resposta a triggers (API Gateway, S3, SQS, etc.) sem provisionamento de servidores. A AWS aloca um execution environment (microVM ou container reutilizado via warm start), executa o handler, e destrói o ambiente após inatividade. Cobrança por número de invocações + duração (GB-segundo).

### No nosso projeto

```
Função: kanban-report
Runtime: Node.js 18
Memória: 256 MB
Timeout: 30s
Trigger: API Gateway (rotas /report/*)
```

### O que a Lambda faz

1. Recebe requisição via API Gateway (ex: `GET /report/board/1`)
2. Chama a API do backend via HTTP (ALB) para buscar dados
3. Processa os dados (calcula estatísticas, burndown)
4. Retorna JSON com o relatório

### Por que Lambda (e não outro endpoint no backend)

| Aspecto | Endpoint no backend | Lambda |
|---------|-------------------|--------|
| Custo quando não usado | Paga (container rodando) | $0 |
| Escala independente | Não | Sim |
| Acessa o banco | Sim | Não (consome API) |
| Linguagem | Java (mesmo do backend) | Node.js (diferente) |

A Lambda demonstra o conceito de **arquitetura serverless** e **desacoplamento** — ela não acessa o banco diretamente, consome a API REST do backend. Isso é um requisito do projeto.

### Payload Format 2.0

O API Gateway HTTP API envia eventos no formato 2.0, onde o path fica em `event.rawPath` (não `event.path` como no formato 1.0). Isso causou bugs que corrigimos.

---

## 12 — API Gateway (HTTP API)

### O que é

Serviço gerenciado de proxy reverso para APIs HTTP/REST/WebSocket. Recebe requisições, aplica políticas (CORS, throttling, autenticação), roteia para integrações backend (Lambda, HTTP endpoints, serviços AWS), e retorna a resposta. O HTTP API (v2) é otimizado para baixa latência e custo, com roteamento baseado em método + path pattern e suporte nativo a JWT authorizers.

### No nosso projeto

```
API: kanban-board-api
Endpoint: https://hbuxixso1a.execute-api.us-east-1.amazonaws.com/prod

Rotas:
  GET /report/board/{id}           → Lambda
  GET /report/burndown/sprint/{id} → Lambda
  GET /report/burndown/project/{id}→ Lambda
  ANY /{proxy+}                    → ALB (backend)
  $default                         → ALB (backend)
```

### Por que usamos

- **Requisito do projeto:** Todas as rotas devem passar pelo API Gateway
- **Roteamento inteligente:** CRUD → backend, relatórios → Lambda
- **CORS gerenciado:** Não precisa configurar no backend
- **HTTPS gratuito:** API Gateway fornece certificado SSL automaticamente
- **Endpoint público:** URL fixa e amigável

### Catch-all route (`/{proxy+}`)

Em vez de definir cada rota individualmente (o que causou erros no CloudFormation), usamos uma rota catch-all que encaminha tudo para o ALB. As rotas específicas do Lambda têm prioridade.

---

## 13 — CloudWatch (Monitoramento e Logs)

### O que é

Serviço de observabilidade que agrega logs (CloudWatch Logs), métricas numéricas (CloudWatch Metrics), e alarmes (CloudWatch Alarms) de todos os recursos AWS. Logs são organizados em Log Groups → Log Streams. Métricas são séries temporais com namespace, dimensões e estatísticas (avg, sum, max, p99). Suporta queries via CloudWatch Logs Insights (linguagem de consulta própria).

### No nosso projeto

```
Log Groups:
  /ecs/kanban/backend   → Logs do Spring Boot
  /ecs/kanban/frontend  → Logs do Nginx
  /aws/lambda/kanban-report → Logs da Lambda
```

### Como usamos

```bash
# Ver logs do backend (últimos 5 min)
aws logs tail /ecs/kanban/backend --since 5m --region us-east-1

# Ver logs da Lambda
aws logs tail /aws/lambda/kanban-report --since 5m --region us-east-1
```

### Por que é essencial

- Containers são efêmeros — quando morrem, os logs locais somem
- CloudWatch preserva os logs mesmo após o container ser destruído
- Permite debugar problemas de produção (como fizemos com o erro de senha do RDS)

---

## 14 — IAM (Identity and Access Management)

### O que é

Serviço de controle de acesso baseado em políticas (PBAC). Define autenticação (quem é você) e autorização (o que pode fazer) para todos os recursos AWS. Usa o modelo de avaliação: deny por padrão → avalia todas as policies aplicáveis → allow explícito libera → deny explícito sempre vence. Suporta identidades (Users, Groups, Roles) e políticas (managed policies, inline policies) com granularidade de ação + recurso + condição.

### No nosso projeto

| Role | Quem usa | Permissões |
|------|----------|-----------|
| LabRole | ECS Tasks, Lambda | Acesso a ECR, CloudWatch, RDS, etc. |
| voclabs | Nosso usuário | Acesso geral (com restrições do lab) |

### Por que não criamos roles próprias

Em contas de lab (voclabs), a criação de roles IAM é bloqueada. Usamos a `LabRole` pré-existente que já tem as permissões necessárias.

### Conceitos

| Conceito | O que é |
|----------|---------|
| **User** | Pessoa ou aplicação com credenciais |
| **Role** | Conjunto de permissões que pode ser "vestido" por um serviço |
| **Policy** | Documento JSON que define permissões específicas |
| **Execution Role** | Role que o ECS/Lambda "veste" para acessar outros serviços |

---

## 15 — Cloud9 e CloudShell (Ambientes de Desenvolvimento)

### Cloud9

| Aspecto | Detalhe |
|---------|---------|
| O que é | IDE na nuvem (EC2 com terminal) |
| Tem Docker | ✅ Sim |
| Tem AWS CLI | ✅ Sim |
| Tem Node.js | ✅ Sim |
| Custo | Cobra pela EC2 (para após 30 min inativo) |
| Uso no projeto | Build de imagens Docker |

### CloudShell

| Aspecto | Detalhe |
|---------|---------|
| O que é | Terminal na nuvem (sem EC2 visível) |
| Tem Docker | ❌ Não |
| Tem AWS CLI | ✅ Sim |
| Tem Node.js | ✅ Sim |
| Custo | Gratuito |
| Uso no projeto | Comandos AWS CLI, deploy |

### Por que usamos os dois

Não tínhamos Docker instalado localmente. O Cloud9 resolveu isso — é uma EC2 completa onde fizemos `docker build` e `docker push`. O CloudShell serviu para todos os comandos AWS que não precisam de Docker.

---

## 16 — Como Tudo se Conecta

### Fluxo de uma requisição do usuário

```
1. Usuário acessa http://kanban-alb-xxx.elb.amazonaws.com/
2. DNS resolve para o IP do ALB
3. ALB recebe na porta 80
4. Path é "/" → regra default → encaminha para Frontend Target Group
5. Frontend (Nginx) serve o HTML/JS/CSS do React
6. Browser carrega a aplicação React
7. React faz fetch("http://alb/projects")
8. ALB recebe → path "/projects*" → encaminha para Backend Target Group
9. Backend (Spring Boot) processa → consulta RDS → retorna JSON
10. React renderiza os dados na tela
```

### Fluxo de um relatório (Lambda)

```
1. Usuário acessa https://api-gw/prod/report/board/1
2. API Gateway recebe → rota "GET /report/board/{id}" → invoca Lambda
3. Lambda executa → faz HTTP GET para http://alb/boards/1 (via ALB)
4. ALB encaminha para Backend → Backend consulta RDS → retorna dados
5. Lambda recebe dados → calcula estatísticas → retorna JSON
6. API Gateway retorna resposta ao usuário
```

### Diagrama de dependências

```
Internet
    │
    ├── API Gateway ──→ Lambda ──→ ALB ──→ Backend ──→ RDS
    │
    └── ALB
         ├── Frontend (Nginx + React)
         └── Backend (Spring Boot) ──→ RDS
```

---

## 17 — Decisões Arquiteturais

### Por que separar frontend e backend em containers diferentes?

- **Escala independente:** Se o backend precisar de mais recursos, escala só ele
- **Deploy independente:** Atualizar o frontend não requer redeployar o backend
- **Tecnologias diferentes:** Frontend é estático (Nginx), backend é Java (JVM)

### Por que usar ALB em vez de acessar containers diretamente?

- Containers Fargate recebem IPs dinâmicos (mudam a cada deploy)
- ALB fornece um DNS fixo
- ALB faz health check e remove containers doentes
- ALB permite roteamento por path (frontend vs backend)

### Por que RDS em vez de banco no container?

- Dados persistem independente do container
- Backups automáticos
- Não perde dados se o container crashar
- Segurança (subnet privada, SG restritivo)

### Por que Lambda para relatórios?

- Demonstra arquitetura serverless (requisito do projeto)
- Não consome recursos quando não está sendo usada
- Escala automaticamente se muitos relatórios forem solicitados
- Desacoplada do backend (consome via API, não acessa banco)

### Por que API Gateway na frente de tudo?

- Ponto único de entrada com HTTPS
- Roteia inteligentemente (CRUD → ALB, reports → Lambda)
- CORS centralizado
- Requisito do projeto

### Por que Fargate em vez de EC2?

- Não precisamos gerenciar servidores
- Paga só pelo uso (não por servidor ocioso)
- Mais simples para um projeto acadêmico
- Escala automaticamente

---

## 18 — Glossário

| Termo | Definição |
|-------|-----------|
| **AZ (Availability Zone)** | Data center físico isolado dentro de uma região |
| **CIDR** | Notação para definir ranges de IP (ex: 10.0.0.0/16) |
| **Container** | Pacote isolado com aplicação + dependências (Docker) |
| **DNS** | Sistema que traduz nomes (google.com) em IPs |
| **Fargate** | Modo serverless do ECS (sem gerenciar EC2) |
| **Health Check** | Verificação periódica se um serviço está saudável |
| **IGW (Internet Gateway)** | Componente que conecta VPC à internet |
| **Inbound** | Tráfego entrando num recurso |
| **Outbound** | Tráfego saindo de um recurso |
| **NAT Gateway** | Permite saída para internet sem permitir entrada |
| **Region** | Localização geográfica dos data centers (ex: us-east-1 = Virginia) |
| **Serverless** | Modelo onde você não gerencia servidores |
| **SG (Security Group)** | Firewall virtual por recurso |
| **Subnet** | Subdivisão de uma VPC |
| **Target Group** | Grupo de destinos que recebem tráfego do ALB |
| **Task** | Uma instância de container rodando no ECS |
| **VPC** | Rede virtual privada isolada na AWS |

---

## Leitura Complementar

- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [AWS Free Tier](https://aws.amazon.com/free/)
- [ECS Workshop](https://ecsworkshop.com/)
- [Serverless Land](https://serverlessland.com/)

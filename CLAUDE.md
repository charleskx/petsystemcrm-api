# PetSystem CRM API

## Visão geral

API REST multi-tenant para gestão de petshops (sem frontend — apenas API).
Gerencia clientes, pets, agendamentos, produtos (estoque), vendas e fornecedores.

### Planos de assinatura

| Recurso | Essential | Premium |
|---------|-----------|---------|
| Clientes + pets | ✓ | ✓ |
| Agendamentos + serviços + calendário | ✓ | ✓ |
| Produtos + estoque + categorias | ✓ | ✓ |
| Financeiro (relatórios de receita, pagamentos) | ✓ | ✓ |
| Fornecedores | — | ✓ |
| Vendas de produtos (PDV) | — | ✓ |

### Trial e cobrança

- Ao criar conta: `subscription_status = trial`, `trial_ends_at = agora + 14 dias`
- Durante o trial: acesso completo (premium) para avaliação
- Após `trial_ends_at` sem pagamento: `subscription_status = expired`
  - Login continua funcionando
  - Todos os endpoints operacionais retornam `402 Payment Required`
  - Apenas `/billing/*` permanece acessível
- Stripe gerencia as assinaturas; webhooks atualizam o `subscription_status`

---

## Stack tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js LTS |
| Framework HTTP | Fastify |
| ORM | Drizzle ORM |
| Banco de dados | PostgreSQL |
| Autenticação | better-auth (com plugin organizations) |
| Autorização | CASL.js |
| Validação | Zod |
| Linter/Formatter | Biome.js |
| Storage | Cloudflare R2 |
| Pagamentos | Stripe |
| E-mail | Resend + React Email |
| Package manager | pnpm |
| Tooling | Makefile |
| Containerização | Docker + Docker Compose |
| Deploy | Coolify (VPS) |

### Plugins de segurança Fastify

- `@fastify/cors`
- `@fastify/helmet`
- `@fastify/rate-limit`
- `@fastify/multipart` (uploads)
- `@fastify/swagger` + `@fastify/swagger-ui` (OpenAPI docs em `/documentation`)

### OpenSpec

Instalado como `devDependency` local: `pnpm add -D @fission-ai/openspec`
Nunca instalação global — executado via `pnpm exec openspec`.

Comandos CLI (terminal):
- `make spec-init` — inicializa a estrutura de specs no projeto (rodar uma vez)
- `make spec-update` — atualiza o OpenSpec

Comandos de workflow (slash commands dentro do Claude Code):
- `/opsx:propose` — propõe uma nova feature como spec
- `/opsx:apply` — implementa as tasks da spec
- `/opsx:verify` — verifica se a implementação bate com a spec

Os specs gerados ficam versionados no repositório como markdown.

---

## Arquitetura

Clean Architecture simplificada:

```
src/
├── domain/              # Entidades, value objects, interfaces de repositório, eventos de domínio
├── application/         # Use cases, DTOs, serviços de aplicação
├── infra/               # Implementações (DB, storage, email, pagamentos, mapas)
│   ├── database/
│   │   ├── drizzle/
│   │   │   ├── schema/
│   │   │   └── migrations/
│   │   └── repositories/
│   ├── storage/         # Cloudflare R2
│   ├── email/           # Resend
│   ├── payments/        # Stripe
│   └── maps/            # Google Maps API
├── interfaces/
│   ├── http/
│   │   ├── routes/
│   │   ├── controllers/
│   │   └── middlewares/
│   └── jobs/            # Cron jobs (alertas de estoque)
└── main/
    ├── factories/
    ├── config/
    └── server.ts
```

---

## Multi-tenancy

- Cada empresa é um **Tenant** (equivale a uma Organization no better-auth)
- Todo request autenticado carrega `tenantId` extraído do JWT/sessão
- Todas as queries no banco são filtradas por `tenant_id`
- Roles por tenant: `owner` | `financial` | `collaborator`
- `owner` pode fazer tudo; `financial` tem acesso a relatórios/vendas; `collaborator` opera o dia a dia

---

## Modelo de domínio

### Tenant (empresa)

```
id, name, document (CPF/CNPJ), document_type,
logo_url?,
pix_key?, pix_key_type (cpf|cnpj|email|phone|random)?,
plan (essential|premium),
subscription_status (trial|active|expired|cancelled|past_due),
trial_ends_at,
stripe_customer_id?,
stripe_subscription_id?,
active, created_at
```

### User

```
id, name, email  — senha gerenciada pelo better-auth
```

### TenantMember

```
tenant_id, user_id, role (owner|financial|collaborator)
```

### Client (cliente do petshop)

```
id, tenant_id, name, email?, phone, document?,
address_zip, address_street, address_number, address_complement?,
address_neighborhood, address_city, address_state,
created_at
```

### Pet

```
id, tenant_id, client_id, name, species, breed?, birth_date?,
weight?, size (small|medium|large|extra_large)?,
notes?, photo_url?, created_at
```

O campo `size` determina qual faixa de preço (`ServicePricing`) é usada no agendamento.

### Service (serviços prestados)

```
id, tenant_id, name, description?, duration_minutes, active
```

### ServicePricing (preço por porte do pet)

```
id, service_id, pet_size (small|medium|large|extra_large), price
```

Cada serviço tem até 4 faixas de preço. Se não houver variação de porte,
registra-se apenas uma entrada (ex: `small`) usada como preço padrão.
No agendamento, `AppointmentService.price` é preenchido com o preço do porte do pet selecionado.

### WorkSchedule (grade horária da empresa)

```
id, tenant_id, day_of_week (0-6), open_time, close_time, is_closed
```

### Holiday

```
id, tenant_id, date, description
```

### Appointment (agendamento)

```
id, tenant_id, client_id, pet_id,
status (scheduled|in_progress|completed|cancelled),
payment_method (pix|credit_card|debit_card|cash|other),
total_amount, notes?, scheduled_at, created_at
```

### AppointmentService

```
appointment_id, service_id, price
```

### ProductCategory

```
id, tenant_id, name
```

### Supplier (fornecedor)

```
id, tenant_id, name, document?, email?, phone?,
address_zip?, address_street?, address_city?, address_state?,
contact_name?, active
```

### Product

```
id, tenant_id, supplier_id?, category_id?,
name, barcode?, sku?, brand?,
unit_type (unit|gram), cost_price, margin_percent, sale_price,
quantity, min_quantity, expiry_date?,
active, created_at
```

### StockMovement

```
id, tenant_id, product_id, type (in|out),
quantity, reason, reference_id?, created_at
```

### Sale

```
id, tenant_id, client_id?, channel (in_store|online),
total_amount, payment_method, status (pending|paid|cancelled),
created_at
```

### SaleItem

```
sale_id, product_id, quantity, unit_price
```

---

## Endpoints por módulo

### Auth (`/auth/*`)

Gerenciado pelo better-auth (login, registro, sessão, refresh, etc.)

### Tenants (`/tenants`)

- `POST /tenants` — criar empresa (registro)
- `GET /tenants/:id` — dados da empresa
- `PATCH /tenants/:id` — atualizar empresa (logo, pix, etc.)
- `POST /tenants/:id/logo` — upload logo → R2

### Members (`/tenants/:tenantId/members`)

- `GET /members` — listar membros
- `POST /members/invite` — convidar membro
- `PATCH /members/:userId` — alterar role
- `DELETE /members/:userId` — remover membro

### Clients (`/clients`) — essential + premium

- `GET /clients` — listar (paginado)
- `POST /clients` — criar
- `GET /clients/:id` — detalhe
- `PATCH /clients/:id` — atualizar
- `DELETE /clients/:id` — remover
- `GET /clients/address/autocomplete?q=` — autocomplete via Google Maps API

### Pets (`/clients/:clientId/pets`) — essential + premium

- `GET /clients/:clientId/pets` — listar pets do cliente
- `POST /clients/:clientId/pets` — criar pet
- `GET /pets/:id` — detalhe
- `PATCH /pets/:id` — atualizar
- `DELETE /pets/:id` — remover
- `POST /pets/:id/photo` — upload foto → R2

### Services (`/services`) — essential + premium

- CRUD completo de serviços prestados
- `GET /services/:id/pricing` — listar faixas de preço por porte
- `PUT /services/:id/pricing` — salvar faixas de preço (bulk)

### Schedule (`/schedule`) — essential + premium

- `GET /schedule` — grade horária
- `PUT /schedule` — salvar grade horária (bulk)
- `GET /schedule/holidays` — listar feriados
- `POST /schedule/holidays` — adicionar feriado
- `DELETE /schedule/holidays/:id` — remover feriado
- `GET /schedule/available-slots?date=&duration=` — slots disponíveis

### Appointments (`/appointments`) — essential + premium

- `GET /appointments` — listar (filtros: data, status, pet, cliente)
- `POST /appointments` — criar
- `GET /appointments/:id` — detalhe
- `PATCH /appointments/:id` — atualizar (incl. observações)
- `PATCH /appointments/:id/status` — alterar status
- `DELETE /appointments/:id` — cancelar

### Products (`/products`) — essential + premium

- `GET /products` — listar (filtros: categoria, fornecedor, estoque)
- `POST /products` — criar
- `GET /products/:id` — detalhe
- `PATCH /products/:id` — atualizar
- `DELETE /products/:id` — inativar
- `GET /products/alerts` — produtos com estoque baixo ou perto da validade

### ProductCategories (`/products/categories`) — essential + premium

- CRUD de categorias

### Stock (`/stock`) — essential + premium

- `POST /stock/movements` — entrada/saída manual de estoque
- `GET /stock/movements` — histórico de movimentações

### Suppliers (`/suppliers`) — premium only

- CRUD completo de fornecedores

### Sales (`/sales`) — premium only

- `GET /sales` — listar vendas
- `POST /sales` — registrar venda (debita estoque automaticamente)
- `GET /sales/:id` — detalhe
- `PATCH /sales/:id/status` — alterar status

### Billing (`/billing`) — acessível mesmo com `subscription_status = expired`

- `GET /billing/subscription` — status atual da assinatura, plano, vencimento do trial
- `POST /billing/checkout` — criar sessão de checkout Stripe para assinar
- `POST /billing/portal` — abrir portal de gerenciamento do cliente no Stripe
- `PATCH /billing/plan` — upgrade/downgrade de plano (essential ↔ premium)

### Payments (`/payments`)

- `POST /payments/stripe/webhook` — webhook Stripe (atualiza `subscription_status`)

### Health

- `GET /health` — health check (usado pelo Coolify para monitoramento)

---

## Middleware de subscription

`src/interfaces/http/middlewares/subscription-guard.ts`

Executado em todo request autenticado, exceto: `/auth/*`, `/payments/stripe/webhook`, `/billing/*`, `/health`.

1. Carrega o tenant via `tenantId` do JWT
2. Se `subscription_status === 'trial'` e `trial_ends_at < agora`: atualiza para `expired` (lazy evaluation)
3. Se `subscription_status === 'expired'` ou `'cancelled'`: retorna `402 Payment Required`
4. Se `subscription_status === 'active'` e `plan === 'essential'`: bloqueia rotas premium-only com `403 Forbidden`

Rotas essential: `/clients`, `/pets`, `/appointments`, `/services`, `/schedule`, `/products`, `/stock`, `/products/categories`
Rotas premium-only: `/suppliers`, `/sales`

---

## Variáveis de ambiente

```env
# App
NODE_ENV=production
PORT=3333
API_URL=https://api.seudominio.com

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/petsystemcrm

# Auth (better-auth)
BETTER_AUTH_SECRET=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Resend (email)
RESEND_API_KEY=

# Google Maps
GOOGLE_MAPS_API_KEY=

# CORS
ALLOWED_ORIGINS=https://app.seudominio.com
```

---

## Setup de desenvolvimento

### Pré-requisitos

- Node.js >= 22
- pnpm >= 9
- Docker + Docker Compose

### Primeiros passos

```bash
cp .env.example .env
pnpm install
make dev-infra
make migrate
make dev
```

Após `make dev-infra`:
- PostgreSQL: `localhost:5432`
- pgAdmin: `http://localhost:5050`
- API Docs: `http://localhost:3333/documentation`

### Comandos Makefile

```
make dev           servidor em modo watch
make dev-infra     sobe postgres + pgadmin via docker compose
make build         build de produção
make migrate       roda drizzle migrations
make migrate-gen   gera nova migration
make lint          biome check
make format        biome format --write
make typecheck     tsc --noEmit
make test          vitest run
make docker-build  build da imagem Docker
make spec-init     inicializa estrutura OpenSpec (rodar uma vez)
make spec-update   atualiza o OpenSpec para a versão mais recente
```

---

## Convenções de código

- Nenhum comentário exceto quando o "porquê" for não-óbvio
- Sem abstrações prematuras — três linhas similares não viram helper
- Validação apenas nas bordas — Zod nos inputs HTTP; confiar nas garantias internas
- Commits seguem Conventional Commits (ver `.claude/commands/commit.md`)
- Code review segue os critérios em `.claude/commands/codereview.md`)
- Idioma do código: inglês (variáveis, funções, esquemas)
- Idioma de mensagens de erro para o usuário: português

---

## Regras de negócio

1. Um tenant deve ter ao menos um `owner`; não é possível remover o último owner
2. Agendamento só pode ser criado em slots disponíveis (respeitando grade horária + feriados)
3. Venda de produto debita automaticamente o estoque (`StockMovement type=out`)
4. Entrada de produto (compra) credita estoque (`StockMovement type=in`)
5. `sale_price` é calculado automaticamente: `cost_price * (1 + margin_percent / 100)`
6. Alerta de estoque dispara quando `quantity <= min_quantity`
7. Alerta de validade dispara quando `expiry_date <= hoje + 30 dias`
8. Upload de imagens: apenas `image/jpeg`, `image/png`, `image/webp`; máximo 5MB
9. CPF/CNPJ são validados por dígito verificador antes de persistir
10. Documento da empresa (CPF/CNPJ) é único no sistema
11. Preço do serviço no agendamento é buscado em `ServicePricing` pelo `pet.size`; se não houver faixa para aquele porte, retorna erro de validação
12. Trial de 14 dias concede acesso premium completo; expirado sem pagamento, apenas `/billing/*` funciona
13. Downgrade de `premium` para `essential` aplica ao próximo ciclo de cobrança
14. Webhook do Stripe é a fonte de verdade para `subscription_status` — nunca atualizar manualmente

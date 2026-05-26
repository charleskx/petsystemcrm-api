# PetSystem CRM API

API REST multi-tenant para gestão de petshops. Gerencia clientes, pets, agendamentos, serviços, produtos, estoque, vendas e fornecedores.

[![CI](https://github.com/charleskx/petsystemcrm-api/actions/workflows/ci.yml/badge.svg)](https://github.com/charleskx/petsystemcrm-api/actions/workflows/ci.yml)

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 22 |
| Framework HTTP | Fastify 5 |
| ORM | Drizzle ORM |
| Banco de dados | PostgreSQL 16 |
| Autenticação | better-auth |
| Autorização | CASL.js |
| Validação | Zod 4 |
| Linter/Formatter | Biome.js |
| Storage | Cloudflare R2 |
| Pagamentos | Stripe |
| E-mail | Resend |
| Package manager | pnpm 11 |

---

## Pré-requisitos

- Node.js >= 22
- pnpm >= 11
- Docker + Docker Compose

---

## Setup de desenvolvimento

```bash
# 1. Clonar e instalar dependências
git clone https://github.com/charleskx/petsystemcrm-api.git
cd petsystemcrm-api
pnpm install

# 2. Copiar variáveis de ambiente
cp .env.example .env
# Edite .env com as suas chaves

# 3. Subir infraestrutura local (PostgreSQL + pgAdmin)
make dev-infra

# 4. Rodar migrations
make migrate

# 5. Iniciar o servidor
make dev
```

Após o setup:

| Serviço | URL |
|---------|-----|
| API | `http://localhost:3333` |
| Documentação (Swagger UI) | `http://localhost:3333/documentation` |
| pgAdmin | `http://localhost:5050` |

---

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```env
# App
NODE_ENV=development
PORT=3333
API_URL=http://localhost:3333

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/petsystemcrm

# Auth
BETTER_AUTH_SECRET=          # mínimo 32 caracteres — gere com: openssl rand -base64 32

# Cloudflare R2 (storage de imagens)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Stripe (pagamentos e assinaturas)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ESSENTIAL=
STRIPE_PRICE_PREMIUM=

# Resend (e-mail)
RESEND_API_KEY=

# Google Maps (autocomplete de endereço)
GOOGLE_MAPS_API_KEY=

# CORS
ALLOWED_ORIGINS=http://localhost:3000
```

---

## Comandos disponíveis

```bash
make dev              # servidor em modo watch
make dev-infra        # sobe postgres + pgadmin
make build            # build de produção
make migrate          # roda migrations pendentes
make migrate-gen      # gera nova migration a partir do schema
make lint             # biome check
make format           # biome format --write
make typecheck        # tsc --noEmit
make test             # roda todos os testes (dentro do Docker)
make test-coverage    # testes com relatório de cobertura
make docker-build     # build da imagem Docker de produção
make release          # gera nova versão e faz deploy (ver abaixo)
```

---

## Planos de assinatura

| Recurso | Essential | Premium |
|---------|-----------|---------|
| Clientes + pets | ✓ | ✓ |
| Agendamentos + serviços + calendário | ✓ | ✓ |
| Produtos + estoque + categorias | ✓ | ✓ |
| Fornecedores | — | ✓ |
| Vendas de produtos (PDV) | — | ✓ |

- **Trial**: 14 dias com acesso completo (premium) ao criar a conta
- **Expirado**: apenas `/billing/*` e `/dashboard` permanecem acessíveis
- **past_due**: acesso completo mantido enquanto Stripe tenta recobrar

---

## Endpoints

A documentação completa fica em `/documentation` (Swagger UI gerado automaticamente).

| Módulo | Prefixo | Plano |
|--------|---------|-------|
| Auth | `/auth/*` | — |
| Tenants | `/tenants` | — |
| Membros | `/tenants/:id/members` | — |
| Clientes | `/clients` | Essential+ |
| Pets | `/pets`, `/clients/:id/pets` | Essential+ |
| Serviços | `/services` | Essential+ |
| Agenda | `/schedule` | Essential+ |
| Agendamentos | `/appointments` | Essential+ |
| Produtos | `/products` | Essential+ |
| Estoque | `/stock` | Essential+ |
| Dashboard | `/dashboard` | Sempre |
| Fornecedores | `/suppliers` | Premium |
| Vendas | `/sales` | Premium |
| Billing | `/billing` | Sempre |
| Pagamentos | `/payments/stripe/webhook` | — |
| Health | `/health` | — |

---

## Roles por tenant

| Role | Permissões |
|------|-----------|
| `owner` | Acesso total |
| `financial` | Leitura total + escrever agendamentos, estoque e vendas; não pode gerenciar membros, tenant ou fornecedores |
| `collaborator` | Leitura total + criar agendamentos e movimentações de estoque |

---

## Arquitetura

```
src/
├── domain/          # Entidades, value objects, validadores
├── application/     # Use cases e DTOs
├── infra/           # DB (Drizzle), storage (R2), email (Resend), pagamentos (Stripe), mapas
├── interfaces/
│   ├── http/        # Rotas, controllers, middlewares
│   └── jobs/        # Cron jobs (alerta diário de estoque — 08h BRT)
└── main/            # Entry point, factory, config
```

---

## Testes

```bash
make test
```

Os testes rodam dentro de um container Docker (Node 22) contra um banco PostgreSQL real. O banco de teste (`petsystemcrm_test`) é truncado antes de cada execução.

```
14 test files | 276 tests passing
```

---

## Deploy

O deploy é feito via **Coolify** em uma VPS. O processo completo está documentado em [`COOLIFY.md`](./COOLIFY.md).

### Lançar uma versão

```bash
make release
```

Esse comando:
1. Analisa os commits desde a última tag ([Conventional Commits](https://www.conventionalcommits.org/))
2. Bumpa a versão no `package.json` (`patch` / `minor` / `major` automaticamente)
3. Gera/atualiza o `CHANGELOG.md`
4. Cria a tag `vX.Y.Z` e faz push
5. GitHub Actions detecta a tag → dispara o deploy no Coolify → cria GitHub Release

### CI/CD

| Workflow | Trigger | O que faz |
|----------|---------|-----------|
| `ci.yml` | Todo push e PR | Lint + typecheck + testes |
| `deploy.yml` | Tag `v*.*.*` | Deploy no Coolify + GitHub Release |

---

## Contribuindo

1. Crie uma branch a partir de `main`
2. Siga as convenções em [`CLAUDE.md`](./CLAUDE.md) (código em inglês, mensagens de erro em português, Conventional Commits)
3. Rode `make check` e `make test` antes de abrir PR
4. O CI valida automaticamente lint + typecheck + testes no PR

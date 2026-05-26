# Deploy com Coolify

## Pré-requisitos

- VPS com mínimo 2 vCPU / 2GB RAM / 20GB disco (Ubuntu 22.04 recomendado)
- Domínio apontando para o IP da VPS (registro A)
- Portas 80 e 443 abertas no firewall
- Acesso root ou usuário com sudo

---

## 1. Instalar Coolify na VPS

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Após a instalação, acesse `http://<IP_DA_VPS>:8000` e crie o usuário admin.

---

## 2. Configurar source (GitHub)

1. No painel Coolify → **Sources** → **New Source** → **GitHub App**
2. Clique em **Register GitHub App** e autorize para o repositório `charleskx/petsystemcrm-api`
3. Anote o **Deployment Key** gerado

---

## 3. Criar o banco PostgreSQL

1. **Databases** → **New Database** → **PostgreSQL**
2. Configure:
   - Name: `petsystemcrm-db`
   - Version: 16
3. Salve e copie a `DATABASE_URL` gerada (formato `postgresql://user:pass@host:5432/db`)

---

## 4. Criar a aplicação

1. **Projects** → **New Project** → nome `petsystemcrm`
2. **New Resource** → **Application** → **GitHub App** (source criado acima)
3. Selecione o repositório e a branch `main`
4. Build pack: **Dockerfile**
5. Porta exposta: `3333`

---

## 5. Variáveis de ambiente

Em **Environment Variables** da aplicação, adicione:

```
NODE_ENV=production
PORT=3333
API_URL=https://api.seudominio.com
DATABASE_URL=<copiado do passo 3>
BETTER_AUTH_SECRET=<gerar com: openssl rand -base64 32>
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
GOOGLE_MAPS_API_KEY=
ALLOWED_ORIGINS=https://app.seudominio.com
```

---

## 6. Domínio e SSL

1. Em **Domains**, adicione `api.seudominio.com`
2. Habilite **Auto SSL** (Let's Encrypt via Traefik — já incluído no Coolify)

---

## 7. CI/CD via GitHub Actions

O deploy **não** é disparado por push direto na `main` — ele só acontece quando uma nova versão é lançada via `make release` (tag `v*.*.*`).

### 7.1 Desabilitar auto-deploy por push no Coolify

Na aba **General** da aplicação no Coolify, **desabilite** a opção **Auto Deploy** (o trigger agora é o workflow do GitHub, não o webhook de push).

### 7.2 Obter a URL do webhook de deploy do Coolify

1. Na aplicação → **Deployments** → copie a **Deploy Webhook URL**
   - Formato: `https://<coolify-host>/api/v1/deploy?uuid=<uuid>&token=<token>`

### 7.3 Adicionar o secret no GitHub

1. No repositório GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Clique em **New repository secret**
3. Nome: `COOLIFY_WEBHOOK_URL`
4. Valor: a URL copiada no passo anterior

### 7.4 Fluxo completo

```
git commit  →  push  →  CI roda (lint + typecheck + tests)
                              ↓ (só após fazer release)
              make release  →  tag v*.*.* pushed  →  deploy.yml  →  Coolify deploy
```

---

## 7b. Fluxo de release (gerar versão)

Para lançar uma nova versão em produção:

```bash
# 1. Garanta que o branch main está atualizado e os testes passam
git checkout main && git pull
make test

# 2. Rode o release — faz tudo automaticamente:
make release
```

O `make release` executa em sequência:
1. **Analisa os commits** desde a última tag usando [Conventional Commits](https://www.conventionalcommits.org/)
2. **Bumpa o `package.json`** — `patch` para `fix:`, `minor` para `feat:`, `major` para breaking changes
3. **Gera/atualiza `CHANGELOG.md`** com os commits agrupados por tipo
4. **Commita** `CHANGELOG.md` + `package.json` com mensagem `chore(release): vX.Y.Z`
5. **Cria a tag** `vX.Y.Z` e faz `git push --follow-tags`
6. **GitHub Actions** detecta a tag → `deploy.yml` roda → Coolify faz o deploy
7. **GitHub Release** é criado automaticamente com o conteúdo do `CHANGELOG.md`

### Tipos de bump automático

| Commit | Bump |
|--------|------|
| `fix:` | patch (1.0.0 → 1.0.1) |
| `feat:` | minor (1.0.0 → 1.1.0) |
| `feat!:` ou `BREAKING CHANGE:` | major (1.0.0 → 2.0.0) |

---

## 8. Health check

O Coolify monitora a rota `GET /health` (esperado retorno `200`).

Configure em **Health Check**:
- Path: `/health`
- Method: `GET`
- Interval: `30s`
- Timeout: `5s`

---

## 9. Migrations automáticas

O `Dockerfile` executa `node dist/infra/database/migrate.js` antes de iniciar o servidor.
Se a migration falhar, o container não sobe e o Coolify mantém a versão anterior ativa (zero-downtime rollback).

---

## 10. Backup do banco

1. **Databases** → selecione `petsystemcrm-db` → **Backups**
2. Habilite backups automáticos diários
3. Configure retenção de 7 dias

---

## Dockerfile de referência

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/dist ./dist
EXPOSE 3333
CMD ["sh", "-c", "node dist/infra/database/migrate.js && node dist/main/index.js"]
```

---

## docker-compose.dev.yml de referência (desenvolvimento local)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: petsystemcrm
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@admin.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

A documentação OpenAPI fica disponível em `http://localhost:3333/documentation` (servida pelo Fastify, sem container separado).

---

## Checklist de go-live

### Infraestrutura
- [ ] VPS provisionada e Coolify instalado
- [ ] DNS apontando para o IP da VPS (registro A)
- [ ] Source GitHub configurado no Coolify
- [ ] Banco PostgreSQL 16 criado e `DATABASE_URL` copiada
- [ ] Aplicação criada no Coolify (Dockerfile, porta 3333)
- [ ] Todas as variáveis de ambiente preenchidas (ver seção 5)
- [ ] Domínio e SSL configurados (Auto SSL habilitado)
- [ ] Auto Deploy **desabilitado** no Coolify (deploy é via tag)
- [ ] Health check configurado (`/health`, interval 30s)
- [ ] Backup automático do banco habilitado (retenção 7 dias)

### CI/CD
- [ ] Secret `COOLIFY_WEBHOOK_URL` adicionado no GitHub (Settings → Secrets → Actions)
- [ ] Primeiro deploy manual feito pelo Coolify para validar o setup
- [ ] Testar `make release` e confirmar que o deploy foi disparado

### Integrações externas
- [ ] Webhook do Stripe apontando para `https://api.seudominio.com/payments/stripe/webhook`
- [ ] `STRIPE_PRICE_ESSENTIAL` e `STRIPE_PRICE_PREMIUM` preenchidos com os IDs do Stripe Dashboard
- [ ] Cloudflare R2: bucket criado, CORS configurado, variáveis R2_* preenchidas
- [ ] Resend: domínio verificado, `RESEND_API_KEY` preenchida
- [ ] Google Maps: API key com Places API habilitada, `GOOGLE_MAPS_API_KEY` preenchida

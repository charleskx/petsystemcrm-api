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

## 7. Deploy automático

1. Na aba **General** da aplicação, habilite **Auto Deploy**
2. No GitHub → **Settings** → **Webhooks** do repositório, adicione o webhook gerado pelo Coolify
3. A partir de agora, qualquer push na branch `main` dispara um novo deploy automaticamente

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

O `Dockerfile` executa `pnpm migrate` como parte do `CMD` antes de iniciar o servidor.
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
CMD ["sh", "-c", "pnpm migrate && node dist/main/server.js"]
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

- [ ] VPS provisionada e Coolify instalado
- [ ] DNS apontando para o IP da VPS
- [ ] Source GitHub configurado
- [ ] Banco PostgreSQL criado e `DATABASE_URL` copiada
- [ ] Todas as variáveis de ambiente preenchidas
- [ ] Domínio e SSL configurados
- [ ] Auto Deploy habilitado e webhook GitHub configurado
- [ ] Health check configurado
- [ ] Backup automático habilitado
- [ ] Webhook do Stripe apontando para `https://api.seudominio.com/payments/stripe/webhook`
- [ ] Cloudflare R2 bucket criado e permissões configuradas

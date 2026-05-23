## Why

A API não possui nenhum mecanismo de autenticação ou registro implementado. Sem esse módulo, nenhuma operação de negócio pode ser realizada, pois todos os endpoints dependem de um `tenantId` autenticado extraído da sessão.

## What Changes

- Integração do **better-auth** com o plugin `organizations` para gerenciar sessões, tokens e multi-tenancy
- Endpoint `POST /tenants` para registro de nova empresa (cria tenant + usuário owner numa transação)
- Rotas `/auth/*` gerenciadas pelo better-auth (login, logout, refresh, callback OAuth se necessário)
- Configuração do banco de dados para as tabelas exigidas pelo better-auth (`user`, `session`, `account`, `verification`)
- Tabelas de domínio `tenants` e `tenant_members` criadas e vinculadas ao modelo do better-auth
- Middleware de extração de `tenantId` da sessão, usado por todos os endpoints subsequentes
- Variáveis de ambiente `BETTER_AUTH_SECRET` e `DATABASE_URL` como pré-requisitos

## Capabilities

### New Capabilities

- `tenant-registration`: Criação de nova empresa (tenant) junto com o primeiro usuário owner; dispara trial de 14 dias
- `user-authentication`: Login, logout, refresh de sessão e extração de contexto autenticado via better-auth

### Modified Capabilities

## Impact

- **Banco de dados**: novas tabelas `user`, `session`, `account`, `verification` (better-auth), `tenants`, `tenant_members`
- **Drizzle schema**: definição das tabelas acima + geração de migration inicial
- **Fastify**: registro do handler do better-auth via `app.all('/auth/*', ...)` e plugin de sessão
- **Middleware**: `authenticate.ts` que valida sessão e injeta `tenantId` + `userId` no request
- **Dependências novas**: `better-auth`

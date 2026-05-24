## 1. Dependências e configuração base

- [x] 1.1 Instalar `better-auth` via `pnpm add better-auth`
- [x] 1.2 Criar `src/infra/database/drizzle/schema/auth.ts` com as tabelas `user`, `session`, `account`, `verification` no formato Drizzle (`pgTable`), conforme o schema exigido pelo better-auth
- [x] 1.3 Criar `src/infra/database/drizzle/schema/tenants.ts` com as tabelas `tenants` e `tenant_members`
- [x] 1.4 Exportar todos os schemas em `src/infra/database/drizzle/schema/index.ts`
- [x] 1.5 Executar `make migrate-gen` para gerar a migration inicial e confirmar que o SQL gerado cobre todas as novas tabelas

## 2. Configuração do better-auth

- [x] 2.1 Criar `src/infra/auth/auth.ts` instanciando `betterAuth` com adaptador Drizzle (`drizzleAdapter`), plugin `organization`, emailAndPassword habilitado e `trustedOrigins` a partir de `ALLOWED_ORIGINS`
- [x] 2.2 Criar `src/infra/auth/index.ts` exportando a instância `auth` e o tipo `Session` inferido
- [x] 2.3 Adicionar `BETTER_AUTH_SECRET` e validar que `DATABASE_URL` existem no carregamento das variáveis de ambiente (`src/main/config/env.ts`)

## 3. Middleware de autenticação

- [x] 3.1 Criar `src/interfaces/http/middlewares/authenticate.ts` como `preHandler` Fastify que chama `auth.api.getSession`, retorna 401 se sessão inválida e injeta `tenantId`, `userId` e `role` em `request`
- [x] 3.2 Fazer module augmentation em `src/interfaces/http/types.d.ts` para adicionar `tenantId: string`, `userId: string` e `role: 'owner' | 'financial' | 'collaborator'` à interface `FastifyRequest`
- [x] 3.3 Resolver o `role` consultando `tenant_members` pelo `userId` da sessão e populating `request.role`

## 4. Registro de tenant

- [x] 4.1 Criar `src/domain/tenant/tenant.entity.ts` com os campos do modelo `Tenant` e a lógica de cálculo de `trial_ends_at`
- [x] 4.2 Criar `src/application/tenant/register-tenant.use-case.ts` que executa em `db.transaction()`: criação do usuário via `auth.api.signUpEmail`, inserção do tenant e inserção do `tenant_members` com `role = owner`
- [x] 4.3 Criar `src/interfaces/http/routes/tenants.ts` com `POST /tenants` (sem authenticate) usando Zod para validar o body (nome, documento, tipo de documento, nome do usuário, email, senha)
- [x] 4.4 Adicionar validação de CPF/CNPJ por dígito verificador no schema Zod do endpoint (regra de negócio #9)
- [x] 4.5 Mapear erros de email duplicado (better-auth) e documento duplicado (constraint DB) para 409 Conflict

## 5. Rotas de auth (better-auth handler)

- [x] 5.1 Registrar o handler do better-auth no Fastify: `app.all('/auth/*', (req, reply) => auth.handler(req.raw, reply.raw))` em `src/interfaces/http/routes/auth.ts`
- [x] 5.2 Garantir que as rotas `/auth/*`, `POST /tenants` e `GET /health` não passem pelo middleware `authenticate`

## 6. Servidor Fastify e plugins

- [x] 6.1 Configurar `@fastify/cookie` (necessário para o better-auth ler/escrever cookies de sessão)
- [x] 6.2 Registrar as rotas de auth e tenants antes dos demais módulos em `src/main/server.ts`
- [x] 6.3 Criar `GET /health` retornando `{ status: 'ok' }` sem autenticação

## 7. Testes

- [x] 7.1 Escrever testes de integração para `POST /tenants`: criação bem-sucedida, email duplicado, documento duplicado, CPF/CNPJ inválido, campos ausentes
- [x] 7.2 Escrever testes de integração para o fluxo de login via `POST /auth/sign-in/email`: sucesso, senha errada, email inexistente
- [x] 7.3 Escrever teste verificando que o middleware `authenticate` retorna 401 sem sessão e injeta o contexto correto com sessão válida

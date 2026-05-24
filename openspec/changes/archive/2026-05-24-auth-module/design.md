## Context

O projeto está no estágio zero — sem código de aplicação ainda. A autenticação é o alicerce sobre o qual todos os outros módulos se apoiam: todo request autenticado precisa de `tenantId` e `userId` injetados no contexto pela camada de auth.

O better-auth foi escolhido na definição do stack para gerenciar sessões, tokens e o modelo multi-tenant via plugin `organizations`. Ele expõe um handler HTTP agnóstico que o Fastify registra em `/auth/*`.

## Goals / Non-Goals

**Goals:**
- Configurar o better-auth com plugin `organizations` e adaptá-lo ao Drizzle/PostgreSQL
- Implementar o fluxo de registro de tenant (empresa + usuário owner atomicamente)
- Expor as rotas `/auth/*` para login, logout e refresh de sessão
- Criar o middleware `authenticate` que valida sessão e injeta `{ tenantId, userId, role }` no request
- Definir o schema Drizzle para as tabelas do better-auth e do domínio (`tenants`, `tenant_members`)

**Non-Goals:**
- OAuth social providers (Google, GitHub etc.) — ficam para iteração futura
- Convite de membros (`/tenants/:id/members/invite`) — módulo separado
- Reset de senha / magic link — disponível via better-auth mas não exposto nesta iteração
- RBAC/CASL detalhado — o middleware injeta a role; as guards por recurso ficam nos módulos de domínio

## Decisions

### D1 — better-auth como único provider de sessão

**Decisão:** Usar better-auth integralmente — não implementar JWT próprio.

**Rationale:** better-auth gerencia criação de sessão, refresh, armazenamento seguro (cookie httpOnly) e o plugin `organizations` já resolve o vínculo usuário↔tenant sem código adicional.

**Alternativa considerada:** JWT stateless. Rejeitado porque requer lógica de revogação e o vínculo multi-tenant precisaria ser re-construído manualmente.

---

### D2 — Registro de tenant como endpoint próprio fora do `/auth/*`

**Decisão:** `POST /tenants` não delega para o better-auth; executa uma transação que:
1. Cria o usuário no better-auth via `auth.api.signUpEmail`
2. Insere o tenant em `tenants`
3. Insere a entrada `tenant_members` com `role = owner`
4. Define `subscription_status = trial`, `trial_ends_at = now + 14 dias`

**Rationale:** O registro de empresa não é apenas "criar conta" — envolve domínio de negócio (trial, plano) que não pertence ao better-auth. Manter essa lógica no use case `RegisterTenantUseCase` mantém a separação de responsabilidades.

**Alternativa considerada:** Usar apenas `POST /auth/sign-up` e fazer o registro do tenant em um webhook/hook pós-criação. Rejeitado pela complexidade de rollback em caso de falha parcial.

---

### D3 — Schema Drizzle compartilhado para tabelas do better-auth

**Decisão:** Definir as tabelas do better-auth (`user`, `session`, `account`, `verification`) no schema Drizzle (`src/infra/database/drizzle/schema/`) usando `pgTable`, assim migrations ficam unificadas com o resto do domínio.

**Rationale:** Evita ter dois sistemas de migration paralelos. O better-auth aceita `customSchema` apontando para as tabelas Drizzle existentes.

---

### D4 — Middleware authenticate como plugin Fastify

**Decisão:** `src/interfaces/http/middlewares/authenticate.ts` exporta um `preHandler` Fastify que:
1. Lê o cookie de sessão
2. Chama `auth.api.getSession({ headers: request.headers })`
3. Se inválido: retorna `401 Unauthorized`
4. Injeta `request.tenantId`, `request.userId`, `request.role` via TypeScript module augmentation

Rotas não autenticadas (`/auth/*`, `POST /tenants`, `/health`) não registram esse preHandler.

**Rationale:** preHandler é a forma idiomática Fastify de guardar rotas; usar `addHook('onRequest')` global forçaria lógica de exclusão para rotas públicas, mais frágil.

## Risks / Trade-offs

- **Acoplamento ao cookie store do better-auth** → O cliente mobile/SPA precisa suportar cookies. Mitigação: better-auth suporta token Bearer via header quando configurado — pode ser ativado sem breaking change.
- **Transação no registro de tenant** → Se o banco falhar após `signUpEmail` mas antes de inserir `tenant_members`, o usuário fica órfão no better-auth. Mitigação: envolver toda a lógica em `db.transaction()`; o rollback automático do Drizzle desfaz as inserções de domínio, mas o usuário do better-auth já foi criado. Solução real: chamar `auth.api.deleteUser` no catch, ou usar uma fila de compensação. Para MVP, logar o erro e alertar; o reprocessamento manual é aceitável.
- **Plugin organizations do better-auth** → Adiciona tabelas `organization`, `member`, `invitation`. Para esta iteração essas tabelas existirão no banco mas não serão usadas diretamente — o vínculo tenant↔user é gerido pela tabela `tenant_members` do domínio. Risco de confusão. Mitigação: documentar claramente que `tenant_members` é a fonte de verdade para roles.

## Migration Plan

1. Instalar `better-auth` e gerar as tabelas via `betterAuth.schema` + exportar para o schema Drizzle
2. Rodar `make migrate-gen` para gerar a migration inicial
3. Rodar `make migrate` em dev
4. Registrar o handler `/auth/*` no Fastify antes de qualquer rota de negócio
5. Em produção: as migrations são aplicadas como pré-condição do deploy (Coolify executa `make migrate` no release hook)

## Open Questions

- O better-auth deve emitir tokens Bearer além de cookies? (Necessário para clientes mobile) — Decisão postergada para quando houver um client mobile concreto.
- Qual o comportamento esperado quando o trial expira e o usuário tenta fazer login? — Login continua funcionando (apenas endpoints operacionais retornam 402), conforme CLAUDE.md.

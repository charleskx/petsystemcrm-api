## Context

O sistema já possui a tabela `tenant_members` (com roles `owner | financial | collaborator`) criada no registro do tenant, mas nenhum endpoint gerencia esse relacionamento. O better-auth está configurado com o plugin `organization`, que mantém as tabelas `organization`, `member` e `invitation` no banco — porém essas tabelas **não são usadas** como fonte de verdade para regras de negócio; `tenant_members` é quem manda.

O middleware `authenticate` resolve o tenantId buscando o **primeiro** registro de `tenant_members` pelo `userId`. Isso é suficiente hoje (cada usuário pertence a um tenant), mas o módulo de convites introduz a possibilidade de um usuário pertencer a múltiplos tenants no futuro.

## Goals / Non-Goals

**Goals:**
- CRUD de membros do tenant via 4 endpoints REST
- Proteção do último `owner` (não pode ser removido nem rebaixado)
- Fluxo de convite: usuários existentes entram imediatamente; usuários novos recebem e-mail de convite com link de aceitação
- Autorização: somente `owner` pode convidar, alterar role e remover; qualquer membro pode listar

**Non-Goals:**
- UI de aceitação de convite (apenas a API)
- Selecionar entre múltiplos tenants num mesmo request (futura feature)
- Revogação de convites pendentes (escopo reduzido)
- Integração das tabelas `member`/`organization` do better-auth (mantemos `tenant_members` como source of truth)

## Decisions

### 1. `tenant_members` como source of truth para roles

better-auth mantém suas próprias tabelas `member`/`organization`, mas nosso modelo de domínio usa `tenant_members` com roles customizados (`financial`, `collaborator`). Manter dois sistemas em sincronia introduziria complexidade sem benefício real — as rotas de membros **não** chamam a API do better-auth para gerenciar membership.

**Alternativa considerada:** usar `auth.api.createMember` / `auth.api.removeMember` do plugin organization → descartada porque exigiria criar uma `Organization` no better-auth no momento do registro do tenant (mudança de escopo) e duplicaria a lógica de roles.

### 2. Fluxo de convite em duas etapas para usuários novos

- **Usuário existente** (email já em `user`): adicionado diretamente a `tenant_members`, retorna `201`.
- **Usuário novo** (email não encontrado): cria-se um registro de convite pendente na tabela `tenant_invitations` (nova) com token UUID e validade de 7 dias, envia e-mail via Resend com link `{API_URL}/members/accept-invite?token=...`.

O endpoint `POST /tenants/:tenantId/members/accept-invite` (público) valida o token, cria o usuário via `auth.api.signUpEmail` (com senha fornecida no body), adiciona a `tenant_members` e invalida o token.

**Alternativa considerada:** reutilizar a tabela `invitation` do better-auth → descartada porque `invitation.organizationId` precisa de uma `Organization` no better-auth que não existe; e o fluxo de aceitação do plugin não executa nossa lógica de `tenant_members`.

**Alternativa considerada:** criar conta com senha temporária e enviar por e-mail → descartada por questão de segurança.

### 3. Proteção do último owner via use case

A verificação conta quantos `owner` existem no tenant antes de rebaixar ou remover. Feita no use case, não no banco (sem trigger), para manter rastreabilidade e mensagem de erro amigável em português.

### 4. Autenticação com tenantId explícito na rota

As rotas de membros estão sob `/tenants/:tenantId/members`. O middleware `authenticate` atual já seta `request.tenantId`. O handler compara `request.tenantId === params.tenantId` para garantir que o membro autenticado pertence ao tenant da rota — padrão idêntico ao adotado em `/tenants/:id`.

## Risks / Trade-offs

- **Token de convite não assinado**: o token é um UUID aleatório em `tenant_invitations.token`; sem criptografia assimétrica. Mitigação: validade curta (7 dias), HTTPS obrigatório em produção.
- **Usuário pertencendo a múltiplos tenants**: `authenticate` busca o primeiro `tenantMember` pelo userId. Se um usuário aceitar convite de um segundo tenant, o middleware pode resolver o tenant errado. Mitigação: documentado como limitação conhecida; corrigir com seleção de tenant ativa em issue separado.
- **Nova tabela `tenant_invitations`**: adiciona uma migration. Rollback: drop table é seguro (convites pendentes são perdidos, mas usuários e tenants não).

## Migration Plan

1. Criar migration `add_tenant_invitations_table` com `tenant_invitations` (id, tenant_id FK, email, role, token UNIQUE, expires_at, created_at)
2. Implementar use cases e rotas
3. Sem mudanças em tabelas existentes → zero risco de regressão em dados de produção

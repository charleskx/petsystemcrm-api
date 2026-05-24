## Why

O módulo de membros é necessário para que o owner de um tenant possa gerenciar quem tem acesso ao sistema, convidando colaboradores, atribuindo roles e removendo acessos — sem isso, um tenant criado não tem como delegar operações para sua equipe.

## What Changes

- Novo endpoint `GET /tenants/:tenantId/members` — lista membros do tenant com seus roles
- Novo endpoint `POST /tenants/:tenantId/members/invite` — convida um usuário por e-mail (cria conta se necessário e associa ao tenant)
- Novo endpoint `PATCH /tenants/:tenantId/members/:userId` — altera o role de um membro
- Novo endpoint `DELETE /tenants/:tenantId/members/:userId` — remove um membro do tenant
- Regra de proteção: não é possível remover ou rebaixar o último `owner` do tenant

## Capabilities

### New Capabilities

- `member-management`: CRUD de membros de um tenant — listar, convidar por e-mail, alterar role e remover, com proteção do último owner

### Modified Capabilities

<!-- Nenhuma spec existente precisa de delta — o módulo de membros é inteiramente novo -->

## Impact

- **Rotas HTTP**: 4 novos endpoints em `/tenants/:tenantId/members`
- **Domínio**: entidade `TenantMember` (já modelada) e regras de negócio de owner
- **Autenticação/autorização**: apenas `owner` pode convidar, alterar roles e remover membros; todos os membros podem listar
- **E-mail**: convite envia e-mail via Resend quando o usuário ainda não existe no sistema
- **better-auth organizations**: integração com o plugin organizations para gerenciar membership

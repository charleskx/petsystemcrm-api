## Context

O projeto segue Clean Architecture simplificada com use cases em `src/application/`, schema Drizzle em `src/infra/database/drizzle/schema/`, e rotas Fastify em `src/interfaces/http/routes/`. A autenticação/autorização já está estabelecida via `authenticate` + `subscriptionGuard` como `preHandler`. O upload para Cloudflare R2 está encapsulado em `src/infra/storage/r2.ts` (padrão estabelecido em `upload-tenant-logo.use-case.ts`).

Pets têm dois perfis de acesso: operações ancoradas no cliente (`/clients/:clientId/pets`) e acesso direto por ID (`/pets/:id`). O campo `size` é crítico para o módulo de agendamentos futuro, pois indexa a tabela `ServicePricing`.

## Goals / Non-Goals

**Goals:**
- CRUD completo de pets com isolamento por tenant
- Upload de foto do pet para R2 com substituição da foto anterior
- Validação de `clientId` pertencente ao tenant autenticado na criação
- Fundação de dados (`pet.size`, `pet.id`) que o módulo Appointments irá consumir

**Non-Goals:**
- Paginação na listagem de pets (um cliente tem poucos pets — retorno completo)
- Soft delete — sem campo `active` no modelo; pets são deletados fisicamente
- Validação de constraint com appointments (implementada quando Appointments existir)

## Decisions

### 1. Tabela `pets` com `tenant_id` redundante

O campo `tenant_id` é adicionado diretamente em `pets` (embora seja derivável via `clients.tenant_id`). Razão: consistência com o padrão do projeto (tabela `clients` tem `tenant_id` diretamente) e eficiência nas queries de isolamento — evita join desnecessário ao buscar pets por ID.

**Alternativa rejeitada**: derivar `tenant_id` via join com `clients` — mais correto normalmente mas quebra o padrão já estabelecido e adiciona complexidade de query.

### 2. Rotas divididas: `/clients/:clientId/pets` e `/pets/:id`

- `GET /clients/:clientId/pets` e `POST /clients/:clientId/pets` ficam no contexto do cliente
- `GET /pets/:id`, `PATCH /pets/:id`, `DELETE /pets/:id` e `POST /pets/:id/photo` são recursos diretos

Ambos registrados em um único arquivo `src/interfaces/http/routes/pets.ts` dentro de uma função `petsRoutes`, seguindo o padrão de `clientsRoutes`.

**Alternativa rejeitada**: rotas completamente aninhadas (`/clients/:clientId/pets/:petId`) — mais RESTfully correto mas verboso e desnecessário quando `petId` já é único globalmente.

### 3. Deleção física com verificação de ownership

`DELETE /pets/:id` remove o registro do banco (`db.delete`). O isolamento é garantido filtrando sempre por `tenantId`. Sem cascade — na ausência da tabela de appointments, nenhuma FK quebra.

**Alternativa rejeitada**: soft delete com campo `active` — o modelo de domínio não define esse campo para pets; adicionar seria over-engineering antes dos appointments existirem.

### 4. Foto do pet: chave R2 `pets/{petId}/photo.{ext}`

Mesmo padrão de `tenants/{tenantId}/logo.{ext}`. A foto anterior é deletada do R2 antes do upload da nova (com `.catch(() => {})` para tolerar falha na deleção). A URL é persistida em `pets.photo_url`.

## Risks / Trade-offs

- **Deleção física + FK futura** → quando Appointments for implementado, adicionar `ON DELETE RESTRICT` na FK `appointments.pet_id` ou migrar pets para soft delete. Por ora, aceitar o risco — o design de Appointments cuidará disso.
- **Foto órfã no R2** → se o update do banco falhar após o upload, a foto fica no storage sem referência. Mitigação: mesma estratégia já adotada no logo do tenant (aceita-se a inconsistência como risco residual mínimo).

## Migration Plan

1. Adicionar schema `pets` em `src/infra/database/drizzle/schema/pets.ts` e exportar em `schema/index.ts`
2. Gerar e rodar migration (`make migrate-gen && make migrate`)
3. Implementar use cases e rotas
4. Registrar `petsRoutes` em `server.ts`

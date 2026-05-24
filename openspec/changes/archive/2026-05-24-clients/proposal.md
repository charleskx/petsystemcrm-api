## Why

O sistema precisa gerenciar clientes dos petshops — sem essa entidade nenhum outro módulo operacional (pets, agendamentos, vendas) pode funcionar. É o alicerce do CRM.

## What Changes

- Novo endpoint `GET /clients` — listagem paginada com filtros por nome e documento
- Novo endpoint `POST /clients` — criação de cliente com validação de endereço
- Novo endpoint `GET /clients/:id` — detalhe do cliente
- Novo endpoint `PATCH /clients/:id` — atualização parcial
- Novo endpoint `DELETE /clients/:id` — remoção (soft delete via flag `active`)
- Novo endpoint `GET /clients/address/autocomplete?q=` — autocomplete de endereço via Google Maps API
- Tabela `clients` no banco (com `tenant_id` para isolamento multi-tenant)
- Schema Drizzle + migration correspondente
- Middleware `authenticate` aplicado em todas as rotas (exceto health/auth/tenants)
- Middleware `subscription-guard` aplicado para bloquear tenants com assinatura expirada

## Capabilities

### New Capabilities

- `client-management`: CRUD completo de clientes com paginação, filtros, soft delete e isolamento por tenant
- `address-autocomplete`: Integração com Google Maps Places API para autocomplete de endereço na criação/edição de clientes

### Modified Capabilities

<!-- nenhuma spec existente muda de requisito -->

## Impact

- **Banco**: nova tabela `clients` com migration
- **Infra**: nova variável de ambiente `GOOGLE_MAPS_API_KEY` (já declarada no `.env.example`)
- **Middlewares**: `authenticate` e `subscription-guard` passam a ser usados nas rotas de clientes
- **Dependências de outros módulos**: `pets`, `appointments` e `sales` dependem de `client_id`

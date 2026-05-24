## Why

O módulo de clientes foi implementado mas sem suporte a pets — a entidade central do negócio de petshop. Sem pets, não é possível criar agendamentos (que requerem `pet_id` e usam `pet.size` para determinar preço do serviço), tornando o sistema inutilizável para o fluxo principal.

## What Changes

- Novo endpoint `GET /clients/:clientId/pets` — listar pets de um cliente (com tenant isolation)
- Novo endpoint `POST /clients/:clientId/pets` — criar pet vinculado a um cliente
- Novo endpoint `GET /pets/:id` — detalhe de um pet
- Novo endpoint `PATCH /pets/:id` — atualização parcial de um pet
- Novo endpoint `DELETE /pets/:id` — remoção de pet (soft delete via exclusão física ou lógica, a decidir no design)
- Novo endpoint `POST /pets/:id/photo` — upload de foto do pet para Cloudflare R2

## Capabilities

### New Capabilities

- `pet-management`: CRUD completo de pets vinculados a clientes — criação, listagem, detalhe, atualização e remoção, com isolamento por tenant e validação de `pet.size`
- `pet-photo-upload`: Upload de foto do pet para Cloudflare R2, com validação de tipo/tamanho de arquivo e retorno de URL pública

### Modified Capabilities

_(nenhuma — os requisitos existentes não mudam)_

## Impact

- **Novas rotas**: `/clients/:clientId/pets` e `/pets/:id` (incluindo `POST /pets/:id/photo`)
- **Schema DB**: tabela `pets` (já modelada no domínio)
- **Infra**: Cloudflare R2 (já configurado para upload de logo do tenant e foto do pet)
- **Downstream**: módulo de agendamentos depende de `pet_id` e `pet.size` — esta entrega desbloqueia a implementação de `Appointments`

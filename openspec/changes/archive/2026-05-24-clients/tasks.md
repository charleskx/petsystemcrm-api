## 1. Schema e banco de dados

- [x] 1.1 Criar `src/infra/database/drizzle/schema/clients.ts` com a tabela `clients` (todos os campos do modelo: `id`, `tenantId`, `name`, `email`, `phone`, `document`, `addressZip`, `addressStreet`, `addressNumber`, `addressComplement`, `addressNeighborhood`, `addressCity`, `addressState`, `active`, `createdAt`)
- [x] 1.2 Exportar o schema de `clients` em `src/infra/database/drizzle/schema/index.ts`
- [x] 1.3 Executar `make migrate-gen` e confirmar que o SQL gerado cobre a tabela `clients`

## 2. Domínio e aplicação

- [x] 2.1 Criar `src/domain/client/client.entity.ts` com a interface `ClientProps` e tipos auxiliares
- [x] 2.2 Criar `src/application/client/create-client.use-case.ts` com a lógica de criação (validação de CPF quando `document` presente, inserção com `tenantId`)
- [x] 2.3 Criar `src/application/client/list-clients.use-case.ts` com paginação offset, filtros por `name` e `document`, e isolamento por `tenantId`
- [x] 2.4 Criar `src/application/client/get-client.use-case.ts` que retorna 404 se o cliente não pertence ao tenant
- [x] 2.5 Criar `src/application/client/update-client.use-case.ts` com atualização parcial e validação de CPF
- [x] 2.6 Criar `src/application/client/delete-client.use-case.ts` que seta `active = false` (retorna 404 se já inativo ou de outro tenant)

## 3. Middleware de subscription guard

- [x] 3.1 Criar `src/interfaces/http/middlewares/subscription-guard.ts` como `preHandler` Fastify que carrega o tenant, aplica lazy expiry (`trial` vencido → `expired`) e retorna `402` se `expired` ou `cancelled`

## 4. Rotas HTTP

- [x] 4.1 Criar `src/interfaces/http/routes/clients.ts` com os 5 endpoints CRUD (`GET /clients`, `POST /clients`, `GET /clients/:id`, `PATCH /clients/:id`, `DELETE /clients/:id`) usando Zod para validar body/query, `authenticate` e `subscription-guard` como `preHandler`
- [x] 4.2 Registrar a rota de clientes em `src/main/server.ts`

## 5. Autocomplete de endereço

- [x] 5.1 Criar `src/infra/maps/google-maps.ts` com a função `searchAddress(query: string)` que chama a Google Maps Places Text Search API e retorna array de `{ description, placeId }`
- [x] 5.2 Adicionar `GOOGLE_MAPS_API_KEY` à validação de env em `src/main/config/env.ts` (opcional — não quebra se ausente, apenas desabilita o endpoint)
- [x] 5.3 Adicionar endpoint `GET /clients/address/autocomplete?q=` na rota de clientes, com validação mínima de 3 chars e retorno `503` quando a chave não está configurada ou a API falha

## 6. Testes

- [x] 6.1 Escrever testes de integração para `POST /clients`: criação bem-sucedida, CPF inválido, campos ausentes, sem autenticação
- [x] 6.2 Escrever testes de integração para `GET /clients`: listagem com isolamento de tenant, filtros por nome e documento, paginação
- [x] 6.3 Escrever testes de integração para `GET /clients/:id`, `PATCH /clients/:id`, `DELETE /clients/:id`: sucesso, 404 para outro tenant, soft delete
- [x] 6.4 Escrever teste para `GET /clients/address/autocomplete`: validação de `q` curto, retorno 503 quando chave ausente
- [x] 6.5 Escrever teste verificando que `subscription-guard` retorna `402` para tenant expirado

## Context

O módulo de clientes é o primeiro módulo operacional do sistema. A arquitetura já estabelecida (auth-module) define os padrões: Clean Architecture simplificada com use cases na camada `application`, schema Drizzle na camada `infra`, e rotas Fastify na camada `interfaces/http`. O middleware `authenticate` já existe e injeta `tenantId`, `userId` e `role` no request.

O endereço do cliente é armazenado desnormalizado (campos separados), pois simplifica queries e exibição sem necessidade de JOINs adicionais. O autocomplete via Google Maps é um recurso auxiliar de UX — não é obrigatório para criar um cliente.

## Goals / Non-Goals

**Goals:**
- CRUD completo de clientes isolado por `tenant_id`
- Paginação por cursor (offset simples com `page` e `limit`)
- Soft delete: campo `active` na tabela, DELETE apenas desativa
- Autocomplete de endereço via Google Maps Places API (Text Search)
- Validação de CPF por dígito verificador quando `document` é informado

**Non-Goals:**
- Histórico de alterações de clientes
- Merge/deduplicação de clientes
- Importação em massa (CSV)
- Notificações ao cliente (email/SMS)

## Decisions

### 1. Soft delete via campo `active`

**Decisão**: `DELETE /clients/:id` seta `active = false`; não apaga o registro.

**Razão**: Clientes têm referências em `pets`, `appointments` e `sales`. Deletar fisicamente quebraria histórico. A listagem sempre filtra `active = true` por padrão.

**Alternativa considerada**: exclusão lógica com `deleted_at timestamp`. Descartado por complexidade adicional sem ganho real neste contexto.

### 2. Endereço desnormalizado

**Decisão**: Campos de endereço diretamente na tabela `clients` (`address_zip`, `address_street`, etc.).

**Razão**: Clientes têm exatamente um endereço principal. Normalizar em tabela separada adicionaria JOIN obrigatório sem benefício.

### 3. Google Maps via Text Search API (não Autocomplete API)

**Decisão**: Usar `Places API — Text Search` no backend, repassando resultados para o cliente.

**Razão**: A chave de API fica segura no servidor. O frontend nunca tem acesso direto à chave. O endpoint `/clients/address/autocomplete?q=` faz o proxy.

**Alternativa considerada**: Autocomplete API diretamente no frontend com chave restrita por origem. Descartado pois o projeto é API-only sem frontend definido.

### 4. Validação de CPF apenas quando `document` presente

**Decisão**: O campo `document` do cliente é opcional. Quando fornecido, é validado por dígito verificador usando o mesmo `validateCPF` já existente em `src/domain/shared/document.validator.ts`.

**Razão**: Nem todos os clientes têm CPF cadastrado no sistema do petshop (clientes sem documento).

### 5. Paginação por offset

**Decisão**: Paginação simples com `page` (default 1) e `limit` (default 20, max 100).

**Razão**: O volume de clientes por tenant raramente ultrapassa poucos milhares. Cursor-based pagination adicionaria complexidade sem necessidade prática neste estágio.

## Risks / Trade-offs

- **Google Maps API key ausente** → Endpoint `/address/autocomplete` retorna 503 com mensagem clara; não bloqueia o restante do módulo. Mitigação: checar `GOOGLE_MAPS_API_KEY` no handler antes de chamar a API.
- **Soft delete e unicidade** → Se o tenant deletar um cliente e tentar recadastrar com o mesmo email/telefone, não há conflito de unicidade (não há unique constraint nesses campos). Aceitável por ora.
- **Offset pagination com grandes volumes** → Páginas tardias ficam lentas. Mitigação futura: migrar para cursor. Aceitável para MVP.

## Migration Plan

1. Adicionar tabela `clients` ao schema Drizzle
2. Gerar migration via `make migrate-gen`
3. Rodar `make migrate` em produção (coluna nova, sem breaking change)
4. Deploy da aplicação

Rollback: a migration pode ser revertida pois nenhuma coluna existente é alterada.

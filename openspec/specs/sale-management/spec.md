## ADDED Requirements

### Requirement: Registrar venda
O sistema SHALL permitir que membros com role `owner` ou `financial` registrem uma venda de produtos, capturando os itens, preços unitários e forma de pagamento. A criação deve ser atômica: insere a venda, insere os itens e debita o estoque de cada produto em uma única transação.

#### Scenario: Venda criada com sucesso
- **WHEN** `POST /sales` é chamado com `items` (lista de `productId`, `quantity`), `paymentMethod` e `channel` opcional
- **THEN** o sistema insere a `Sale`, insere todos os `SaleItem` com `unit_price` igual ao `sale_price` atual do produto, debita o estoque de cada produto, calcula e persiste `total_amount` e retorna `201` com o objeto da venda e seus itens

#### Scenario: Produto inativo ou inexistente
- **WHEN** `POST /sales` contém um `productId` inexistente no tenant ou com `active = false`
- **THEN** o sistema retorna `422` com mensagem indicando qual produto é inválido e nenhuma alteração é persistida

#### Scenario: Estoque insuficiente
- **WHEN** `POST /sales` contém um item cuja `quantity` excede `product.quantity` disponível
- **THEN** o sistema retorna `422` com mensagem indicando estoque insuficiente e nenhuma alteração é persistida

#### Scenario: Itens vazios
- **WHEN** `POST /sales` é chamado sem nenhum item na lista `items`
- **THEN** o sistema retorna `422` com mensagem de validação

#### Scenario: Role sem permissão
- **WHEN** `POST /sales` é chamado por membro com role `collaborator`
- **THEN** o sistema retorna `403`

#### Scenario: Tenant sem plano premium
- **WHEN** `POST /sales` é chamado por tenant com `plan = essential`
- **THEN** o sistema retorna `403`

#### Scenario: Sem autenticação
- **WHEN** `POST /sales` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Listar vendas
O sistema SHALL retornar a lista paginada de vendas do tenant autenticado, com filtros opcionais por `clientId`, `status` e intervalo de datas.

#### Scenario: Listagem padrão
- **WHEN** `GET /sales` é chamado sem filtros
- **THEN** o sistema retorna `200` com array paginado de vendas do tenant, ordenadas por `created_at` decrescente

#### Scenario: Filtro por status
- **WHEN** `GET /sales?status=paid` é chamado
- **THEN** o sistema retorna somente vendas com `status = paid`

#### Scenario: Filtro por cliente
- **WHEN** `GET /sales?clientId=<id>` é chamado
- **THEN** o sistema retorna somente vendas associadas ao cliente informado

#### Scenario: Filtro por intervalo de datas
- **WHEN** `GET /sales?from=<ISO>&to=<ISO>` é chamado
- **THEN** o sistema retorna somente vendas cujo `created_at` está dentro do intervalo

#### Scenario: Isolamento de tenant
- **WHEN** `GET /sales` é chamado
- **THEN** o sistema retorna SOMENTE vendas do tenant do usuário autenticado

#### Scenario: Sem autenticação
- **WHEN** `GET /sales` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Detalhe da venda
O sistema SHALL retornar os dados completos de uma venda incluindo seus itens (produto, quantidade e preço unitário).

#### Scenario: Venda encontrada
- **WHEN** `GET /sales/:id` é chamado com um `id` de venda do tenant
- **THEN** o sistema retorna `200` com o objeto da venda e o array de `items`

#### Scenario: Venda de outro tenant
- **WHEN** `GET /sales/:id` é chamado com `id` de venda de outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Venda inexistente
- **WHEN** `GET /sales/:id` é chamado com `id` inválido
- **THEN** o sistema retorna `404`

#### Scenario: Sem autenticação
- **WHEN** `GET /sales/:id` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Atualizar status da venda
O sistema SHALL permitir que membros com role `owner` ou `financial` atualizem o status de uma venda. As únicas transições válidas são `pending → paid` e `pending → cancelled`. Vendas `paid` ou `cancelled` são imutáveis.

#### Scenario: Venda pendente marcada como paga
- **WHEN** `PATCH /sales/:id/status` é chamado com `status = paid` em venda `pending`
- **THEN** o sistema atualiza o status para `paid` e retorna `200`

#### Scenario: Venda pendente cancelada
- **WHEN** `PATCH /sales/:id/status` é chamado com `status = cancelled` em venda `pending`
- **THEN** o sistema atualiza o status para `cancelled` e retorna `200`

#### Scenario: Transição inválida
- **WHEN** `PATCH /sales/:id/status` é chamado em venda com status `paid` ou `cancelled`
- **THEN** o sistema retorna `409` com mensagem indicando que o status não pode ser alterado

#### Scenario: Role sem permissão
- **WHEN** `PATCH /sales/:id/status` é chamado por membro com role `collaborator`
- **THEN** o sistema retorna `403`

#### Scenario: Venda inexistente
- **WHEN** `PATCH /sales/:id/status` é chamado com `id` inválido ou de outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Sem autenticação
- **WHEN** `PATCH /sales/:id/status` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Bloqueio por assinatura expirada
O sistema SHALL bloquear todas as operações de vendas quando o `subscription_status` do tenant for `expired` ou `cancelled`.

#### Scenario: Tenant com assinatura expirada
- **WHEN** qualquer endpoint de `/sales` é chamado por tenant com `subscription_status = expired`
- **THEN** o sistema retorna `402 Payment Required`

---

### Requirement: Collaborator cannot create sales or change sale status
`POST /sales` and `PATCH /sales/:id/status` SHALL be restricted to owner and financial roles. Collaborator may read sales but cannot create them or change their status. Checks SHALL use `request.ability.cannot("create"|"update", "Sale")`.

#### Scenario: Collaborator cannot create a sale
- **WHEN** an authenticated collaborator sends `POST /sales`
- **THEN** the system returns 403

#### Scenario: Collaborator cannot update sale status
- **WHEN** an authenticated collaborator sends `PATCH /sales/:id/status`
- **THEN** the system returns 403

#### Scenario: Financial can create a sale
- **WHEN** an authenticated financial member sends `POST /sales` with valid payload
- **THEN** the system returns 201

#### Scenario: Owner can change sale status
- **WHEN** an authenticated owner sends `PATCH /sales/:id/status` with valid payload
- **THEN** the system returns 200

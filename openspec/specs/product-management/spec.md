## ADDED Requirements

### Requirement: Criar produto
O sistema SHALL permitir que membros com role `owner` ou `financial` criem um produto, calculando automaticamente o `sale_price` a partir de `cost_price` e `margin_percent`.

#### Scenario: Criação bem-sucedida
- **WHEN** `POST /products` é chamado com `name`, `unitType` (`unit` | `gram`), `costPrice`, `marginPercent` e opcionalmente `barcode`, `sku`, `brand`, `categoryId`, `supplierId`, `minQuantity`, `expiryDate`
- **THEN** o sistema calcula `salePrice = round(costPrice * (1 + marginPercent / 100), 2)`, persiste o produto com `active = true` e `quantity = 0` e retorna `201` com o produto criado incluindo o `salePrice` calculado

#### Scenario: `categoryId` inexistente ou de outro tenant
- **WHEN** `POST /products` é chamado com `categoryId` que não existe ou pertence a outro tenant
- **THEN** o sistema retorna `422`

#### Scenario: `supplierId` inexistente ou de outro tenant
- **WHEN** `POST /products` é chamado com `supplierId` que não existe ou pertence a outro tenant
- **THEN** o sistema retorna `422`

#### Scenario: Role sem permissão
- **WHEN** `POST /products` é chamado por membro com role `collaborator`
- **THEN** o sistema retorna `403`

#### Scenario: Sem autenticação
- **WHEN** `POST /products` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Listar produtos
O sistema SHALL retornar a lista paginada de produtos ativos do tenant autenticado, com filtros opcionais por categoria, fornecedor e nível de estoque.

#### Scenario: Listagem padrão
- **WHEN** `GET /products` é chamado sem filtros
- **THEN** o sistema retorna `200` com array paginado de produtos onde `active = true`, ordenados por `name` crescente

#### Scenario: Filtro por categoria
- **WHEN** `GET /products?categoryId=<id>` é chamado
- **THEN** o sistema retorna somente produtos da categoria informada

#### Scenario: Filtro por fornecedor
- **WHEN** `GET /products?supplierId=<id>` é chamado
- **THEN** o sistema retorna somente produtos vinculados ao fornecedor informado

#### Scenario: Filtro por estoque baixo
- **WHEN** `GET /products?lowStock=true` é chamado
- **THEN** o sistema retorna somente produtos onde `quantity <= min_quantity`

#### Scenario: Isolamento de tenant
- **WHEN** `GET /products` é chamado
- **THEN** o sistema retorna SOMENTE produtos do tenant do usuário autenticado

#### Scenario: Sem autenticação
- **WHEN** `GET /products` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Consultar detalhe de produto
O sistema SHALL retornar os dados completos de um produto específico do tenant autenticado.

#### Scenario: Produto encontrado
- **WHEN** `GET /products/:id` é chamado para um produto do tenant autenticado
- **THEN** o sistema retorna `200` com todos os campos do produto, incluindo `category` (se vinculada) e `supplier` (se vinculado)

#### Scenario: Produto de outro tenant
- **WHEN** `GET /products/:id` é chamado para um produto de outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Produto inexistente
- **WHEN** `GET /products/:id` é chamado com id que não existe
- **THEN** o sistema retorna `404`

#### Scenario: Sem autenticação
- **WHEN** `GET /products/:id` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Atualizar produto
O sistema SHALL permitir que membros com role `owner` ou `financial` atualizem os dados de um produto, recalculando `sale_price` automaticamente quando `cost_price` ou `margin_percent` forem alterados.

#### Scenario: Atualização bem-sucedida
- **WHEN** `PATCH /products/:id` é chamado com quaisquer campos editáveis (`name`, `barcode`, `sku`, `brand`, `categoryId`, `supplierId`, `unitType`, `costPrice`, `marginPercent`, `minQuantity`, `expiryDate`)
- **THEN** o sistema atualiza os campos informados, recalcula `salePrice` se `costPrice` ou `marginPercent` foram alterados, e retorna `200` com o produto atualizado

#### Scenario: `categoryId` ou `supplierId` inválido
- **WHEN** `PATCH /products/:id` é chamado com `categoryId` ou `supplierId` que não existe no tenant
- **THEN** o sistema retorna `422`

#### Scenario: Role sem permissão
- **WHEN** `PATCH /products/:id` é chamado por membro com role `collaborator`
- **THEN** o sistema retorna `403`

#### Scenario: Produto de outro tenant
- **WHEN** `PATCH /products/:id` é chamado para um produto de outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Sem autenticação
- **WHEN** `PATCH /products/:id` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Inativar produto
O sistema SHALL permitir que membros com role `owner` inativem um produto via soft delete, tornando-o invisível nas listagens padrão sem removê-lo do banco.

#### Scenario: Inativação bem-sucedida
- **WHEN** `DELETE /products/:id` é chamado por membro com role `owner` para um produto ativo do tenant
- **THEN** o sistema define `active = false` e retorna `204`

#### Scenario: Produto já inativo
- **WHEN** `DELETE /products/:id` é chamado para um produto com `active = false`
- **THEN** o sistema retorna `422` com mensagem indicando que o produto já está inativo

#### Scenario: Role sem permissão
- **WHEN** `DELETE /products/:id` é chamado por membro com role `financial` ou `collaborator`
- **THEN** o sistema retorna `403`

#### Scenario: Produto de outro tenant
- **WHEN** `DELETE /products/:id` é chamado para um produto de outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Sem autenticação
- **WHEN** `DELETE /products/:id` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Alertas de estoque e validade
O sistema SHALL retornar a lista de produtos que possuem estoque abaixo do mínimo ou com data de validade próxima.

#### Scenario: Produtos com estoque baixo
- **WHEN** `GET /products/alerts` é chamado
- **THEN** o sistema retorna `200` com lista de produtos ativos onde `quantity <= min_quantity`, marcados com `alertType = "low_stock"`

#### Scenario: Produtos com validade próxima
- **WHEN** `GET /products/alerts` é chamado
- **THEN** o sistema inclui na resposta produtos ativos onde `expiry_date <= hoje + 30 dias`, marcados com `alertType = "near_expiry"`

#### Scenario: Produto com ambos os alertas
- **WHEN** um produto possui `quantity <= min_quantity` E `expiry_date <= hoje + 30 dias`
- **THEN** o sistema retorna o produto com `alertTypes = ["low_stock", "near_expiry"]`

#### Scenario: Sem alertas ativos
- **WHEN** `GET /products/alerts` é chamado e nenhum produto possui estoque baixo ou validade próxima
- **THEN** o sistema retorna `200` com array vazio

#### Scenario: Sem autenticação
- **WHEN** `GET /products/alerts` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Bloqueio por assinatura expirada
O sistema SHALL bloquear todas as operações de produtos quando o `subscription_status` do tenant for `expired` ou `cancelled`.

#### Scenario: Tenant com assinatura expirada
- **WHEN** qualquer endpoint de `/products` é chamado por tenant com `subscription_status = expired`
- **THEN** o sistema retorna `402 Payment Required`

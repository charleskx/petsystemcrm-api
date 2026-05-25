## ADDED Requirements

### Requirement: Registrar movimentação de estoque
O sistema SHALL permitir que membros com role `owner` ou `financial` registrem manualmente uma movimentação de entrada ou saída de estoque para um produto, atualizando atomicamente a quantidade do produto.

#### Scenario: Entrada de estoque bem-sucedida
- **WHEN** `POST /stock/movements` é chamado com `productId`, `type = "in"`, `quantity` (positivo inteiro) e `reason`
- **THEN** o sistema cria o registro de movimentação, incrementa `product.quantity` em `quantity` de forma atômica e retorna `201` com a movimentação criada e a nova quantidade do produto

#### Scenario: Saída de estoque bem-sucedida
- **WHEN** `POST /stock/movements` é chamado com `productId`, `type = "out"`, `quantity` (positivo inteiro) e `reason`
- **THEN** o sistema cria o registro de movimentação, decrementa `product.quantity` em `quantity` de forma atômica e retorna `201` com a movimentação criada e a nova quantidade do produto

#### Scenario: Saída com estoque insuficiente
- **WHEN** `POST /stock/movements` é chamado com `type = "out"` e `quantity` maior que `product.quantity` atual
- **THEN** o sistema retorna `422` com mensagem indicando estoque insuficiente

#### Scenario: Produto inativo
- **WHEN** `POST /stock/movements` é chamado com `productId` de um produto com `active = false`
- **THEN** o sistema retorna `422` com mensagem indicando que o produto está inativo

#### Scenario: Produto de outro tenant
- **WHEN** `POST /stock/movements` é chamado com `productId` de outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Role sem permissão
- **WHEN** `POST /stock/movements` é chamado por membro com role `collaborator`
- **THEN** o sistema retorna `403`

#### Scenario: Sem autenticação
- **WHEN** `POST /stock/movements` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Listar histórico de movimentações
O sistema SHALL retornar o histórico paginado de movimentações de estoque do tenant autenticado, com filtros opcionais por produto e tipo.

#### Scenario: Listagem padrão
- **WHEN** `GET /stock/movements` é chamado sem filtros
- **THEN** o sistema retorna `200` com array paginado de movimentações do tenant, ordenadas por `created_at` decrescente

#### Scenario: Filtro por produto
- **WHEN** `GET /stock/movements?productId=<id>` é chamado
- **THEN** o sistema retorna somente movimentações do produto informado

#### Scenario: Filtro por tipo
- **WHEN** `GET /stock/movements?type=in` ou `?type=out` é chamado
- **THEN** o sistema retorna somente movimentações do tipo informado

#### Scenario: Isolamento de tenant
- **WHEN** `GET /stock/movements` é chamado
- **THEN** o sistema retorna SOMENTE movimentações do tenant do usuário autenticado

#### Scenario: Sem autenticação
- **WHEN** `GET /stock/movements` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Bloqueio por assinatura expirada
O sistema SHALL bloquear todas as operações de estoque quando o `subscription_status` do tenant for `expired` ou `cancelled`.

#### Scenario: Tenant com assinatura expirada
- **WHEN** qualquer endpoint de `/stock` é chamado por tenant com `subscription_status = expired`
- **THEN** o sistema retorna `402 Payment Required`

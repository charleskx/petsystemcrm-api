## ADDED Requirements

### Requirement: Criar categoria de produto
O sistema SHALL permitir que membros com role `owner` ou `financial` criem uma categoria de produto para o tenant autenticado.

#### Scenario: Criação bem-sucedida
- **WHEN** `POST /products/categories` é chamado com `name`
- **THEN** o sistema persiste a categoria vinculada ao tenant e retorna `201` com a categoria criada

#### Scenario: Nome duplicado no tenant
- **WHEN** `POST /products/categories` é chamado com `name` já existente no tenant
- **THEN** o sistema retorna `409` com mensagem indicando nome duplicado

#### Scenario: Role sem permissão
- **WHEN** `POST /products/categories` é chamado por membro com role `collaborator`
- **THEN** o sistema retorna `403`

#### Scenario: Sem autenticação
- **WHEN** `POST /products/categories` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Listar categorias de produto
O sistema SHALL retornar a lista de categorias de produto do tenant autenticado.

#### Scenario: Listagem bem-sucedida
- **WHEN** `GET /products/categories` é chamado
- **THEN** o sistema retorna `200` com array de categorias do tenant, ordenadas por `name` crescente

#### Scenario: Isolamento de tenant
- **WHEN** `GET /products/categories` é chamado
- **THEN** o sistema retorna SOMENTE categorias do tenant do usuário autenticado

#### Scenario: Sem autenticação
- **WHEN** `GET /products/categories` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Atualizar categoria de produto
O sistema SHALL permitir que membros com role `owner` ou `financial` renomeiem uma categoria existente.

#### Scenario: Atualização bem-sucedida
- **WHEN** `PATCH /products/categories/:id` é chamado com `name`
- **THEN** o sistema atualiza o nome da categoria e retorna `200` com a categoria atualizada

#### Scenario: Nome duplicado no tenant
- **WHEN** `PATCH /products/categories/:id` é chamado com `name` já usado por outra categoria no tenant
- **THEN** o sistema retorna `409`

#### Scenario: Categoria de outro tenant
- **WHEN** `PATCH /products/categories/:id` é chamado para uma categoria de outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Role sem permissão
- **WHEN** `PATCH /products/categories/:id` é chamado por membro com role `collaborator`
- **THEN** o sistema retorna `403`

#### Scenario: Sem autenticação
- **WHEN** `PATCH /products/categories/:id` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Remover categoria de produto
O sistema SHALL permitir que membros com role `owner` removam uma categoria, desde que ela não esteja vinculada a nenhum produto ativo.

#### Scenario: Remoção bem-sucedida
- **WHEN** `DELETE /products/categories/:id` é chamado por membro com role `owner` para uma categoria sem produtos ativos vinculados
- **THEN** o sistema remove a categoria e retorna `204`

#### Scenario: Categoria com produtos ativos
- **WHEN** `DELETE /products/categories/:id` é chamado para uma categoria que possui produtos ativos
- **THEN** o sistema retorna `422` com mensagem indicando que a categoria possui produtos e não pode ser removida

#### Scenario: Categoria de outro tenant
- **WHEN** `DELETE /products/categories/:id` é chamado para uma categoria de outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Role sem permissão
- **WHEN** `DELETE /products/categories/:id` é chamado por membro com role `financial` ou `collaborator`
- **THEN** o sistema retorna `403`

#### Scenario: Sem autenticação
- **WHEN** `DELETE /products/categories/:id` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Bloqueio por assinatura expirada
O sistema SHALL bloquear todas as operações de categorias quando o `subscription_status` do tenant for `expired` ou `cancelled`.

#### Scenario: Tenant com assinatura expirada
- **WHEN** qualquer endpoint de `/products/categories` é chamado por tenant com `subscription_status = expired`
- **THEN** o sistema retorna `402 Payment Required`

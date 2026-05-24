## ADDED Requirements

### Requirement: Criar cliente
O sistema SHALL permitir que um usuário autenticado crie um cliente associado ao seu tenant, com os campos de contato e endereço obrigatórios.

#### Scenario: Criação bem-sucedida
- **WHEN** `POST /clients` é chamado com `name`, `phone`, `address_zip`, `address_street`, `address_number`, `address_neighborhood`, `address_city`, `address_state` válidos
- **THEN** o sistema persiste o cliente com `tenant_id` do usuário autenticado, `active = true` e retorna `201` com o objeto criado

#### Scenario: Documento CPF inválido
- **WHEN** `POST /clients` é chamado com `document` preenchido e dígito verificador inválido
- **THEN** o sistema retorna `422` com mensagem indicando CPF inválido

#### Scenario: Campos obrigatórios ausentes
- **WHEN** `POST /clients` é chamado sem `name` ou `phone`
- **THEN** o sistema retorna `422` com os campos faltantes

#### Scenario: Sem autenticação
- **WHEN** `POST /clients` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Listar clientes
O sistema SHALL retornar a lista paginada de clientes ativos do tenant autenticado.

#### Scenario: Listagem padrão
- **WHEN** `GET /clients` é chamado sem parâmetros
- **THEN** o sistema retorna `200` com array `data` (máx. 20 registros), `total`, `page` e `limit`

#### Scenario: Filtro por nome
- **WHEN** `GET /clients?name=rex` é chamado
- **THEN** o sistema retorna apenas clientes cujo `name` contém "rex" (case-insensitive)

#### Scenario: Filtro por documento
- **WHEN** `GET /clients?document=12345678900` é chamado
- **THEN** o sistema retorna apenas clientes com aquele documento

#### Scenario: Isolamento de tenant
- **WHEN** `GET /clients` é chamado por um usuário autenticado
- **THEN** o sistema retorna SOMENTE clientes cujo `tenant_id` corresponde ao tenant do usuário

#### Scenario: Paginação
- **WHEN** `GET /clients?page=2&limit=10` é chamado
- **THEN** o sistema retorna os registros da segunda página com no máximo 10 itens

---

### Requirement: Detalhar cliente
O sistema SHALL retornar todos os dados de um cliente específico do tenant.

#### Scenario: Cliente encontrado
- **WHEN** `GET /clients/:id` é chamado com ID de um cliente do tenant autenticado
- **THEN** o sistema retorna `200` com o objeto completo do cliente

#### Scenario: Cliente de outro tenant
- **WHEN** `GET /clients/:id` é chamado com ID de cliente pertencente a outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Cliente inexistente
- **WHEN** `GET /clients/:id` é chamado com ID que não existe
- **THEN** o sistema retorna `404`

---

### Requirement: Atualizar cliente
O sistema SHALL permitir atualização parcial dos dados de um cliente.

#### Scenario: Atualização bem-sucedida
- **WHEN** `PATCH /clients/:id` é chamado com um ou mais campos válidos
- **THEN** o sistema atualiza apenas os campos enviados e retorna `200` com o objeto atualizado

#### Scenario: Documento inválido na atualização
- **WHEN** `PATCH /clients/:id` é chamado com `document` com dígito verificador inválido
- **THEN** o sistema retorna `422`

#### Scenario: Cliente de outro tenant
- **WHEN** `PATCH /clients/:id` é chamado para cliente de outro tenant
- **THEN** o sistema retorna `404`

---

### Requirement: Remover cliente (soft delete)
O sistema SHALL desativar um cliente sem apagar o registro do banco, preservando o histórico de pets e agendamentos.

#### Scenario: Remoção bem-sucedida
- **WHEN** `DELETE /clients/:id` é chamado para cliente ativo do tenant
- **THEN** o sistema seta `active = false` e retorna `204`

#### Scenario: Cliente já inativo
- **WHEN** `DELETE /clients/:id` é chamado para cliente já inativo
- **THEN** o sistema retorna `404`

#### Scenario: Cliente de outro tenant
- **WHEN** `DELETE /clients/:id` é chamado para cliente de outro tenant
- **THEN** o sistema retorna `404`

---

### Requirement: Bloqueio por assinatura expirada
O sistema SHALL bloquear todas as operações de clientes quando o `subscription_status` do tenant for `expired` ou `cancelled`.

#### Scenario: Tenant com assinatura expirada
- **WHEN** qualquer endpoint de `/clients` é chamado por tenant com `subscription_status = expired`
- **THEN** o sistema retorna `402 Payment Required`

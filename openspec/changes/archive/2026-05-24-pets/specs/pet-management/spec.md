## ADDED Requirements

### Requirement: Criar pet
O sistema SHALL permitir que um usuário autenticado crie um pet vinculado a um cliente do seu tenant, com nome, espécie e demais campos opcionais conforme o modelo de domínio.

#### Scenario: Criação bem-sucedida
- **WHEN** `POST /clients/:clientId/pets` é chamado com `name` e `species` válidos, e `clientId` pertence ao tenant autenticado
- **THEN** o sistema persiste o pet com `tenant_id` e `client_id` corretos e retorna `201` com o objeto criado

#### Scenario: Cliente não pertence ao tenant
- **WHEN** `POST /clients/:clientId/pets` é chamado com `clientId` de um cliente de outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Campos obrigatórios ausentes
- **WHEN** `POST /clients/:clientId/pets` é chamado sem `name` ou `species`
- **THEN** o sistema retorna `422` com os campos faltantes

#### Scenario: Valor de `size` inválido
- **WHEN** `POST /clients/:clientId/pets` é chamado com `size` fora do enum `small|medium|large|extra_large`
- **THEN** o sistema retorna `422`

#### Scenario: Sem autenticação
- **WHEN** `POST /clients/:clientId/pets` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Listar pets do cliente
O sistema SHALL retornar todos os pets de um cliente específico, garantindo que o cliente pertence ao tenant autenticado.

#### Scenario: Listagem bem-sucedida
- **WHEN** `GET /clients/:clientId/pets` é chamado com `clientId` pertencente ao tenant autenticado
- **THEN** o sistema retorna `200` com array de pets do cliente (sem paginação)

#### Scenario: Cliente não pertence ao tenant
- **WHEN** `GET /clients/:clientId/pets` é chamado com `clientId` de outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Cliente sem pets
- **WHEN** `GET /clients/:clientId/pets` é chamado e o cliente não possui pets cadastrados
- **THEN** o sistema retorna `200` com array vazio

#### Scenario: Isolamento de tenant
- **WHEN** `GET /clients/:clientId/pets` é chamado por um usuário autenticado
- **THEN** o sistema retorna SOMENTE pets cujo `tenant_id` corresponde ao tenant do usuário

---

### Requirement: Detalhar pet
O sistema SHALL retornar todos os dados de um pet específico do tenant.

#### Scenario: Pet encontrado
- **WHEN** `GET /pets/:id` é chamado com ID de um pet do tenant autenticado
- **THEN** o sistema retorna `200` com o objeto completo do pet

#### Scenario: Pet de outro tenant
- **WHEN** `GET /pets/:id` é chamado com ID de pet pertencente a outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Pet inexistente
- **WHEN** `GET /pets/:id` é chamado com ID que não existe
- **THEN** o sistema retorna `404`

---

### Requirement: Atualizar pet
O sistema SHALL permitir atualização parcial dos dados de um pet.

#### Scenario: Atualização bem-sucedida
- **WHEN** `PATCH /pets/:id` é chamado com um ou mais campos válidos para pet do tenant autenticado
- **THEN** o sistema atualiza apenas os campos enviados e retorna `200` com o objeto atualizado

#### Scenario: Valor de `size` inválido na atualização
- **WHEN** `PATCH /pets/:id` é chamado com `size` fora do enum permitido
- **THEN** o sistema retorna `422`

#### Scenario: Pet de outro tenant
- **WHEN** `PATCH /pets/:id` é chamado para pet de outro tenant
- **THEN** o sistema retorna `404`

---

### Requirement: Remover pet
O sistema SHALL remover fisicamente um pet do banco de dados.

#### Scenario: Remoção bem-sucedida
- **WHEN** `DELETE /pets/:id` é chamado para pet do tenant autenticado
- **THEN** o sistema remove o registro do banco e retorna `204`

#### Scenario: Pet de outro tenant
- **WHEN** `DELETE /pets/:id` é chamado para pet de outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Pet inexistente
- **WHEN** `DELETE /pets/:id` é chamado com ID que não existe
- **THEN** o sistema retorna `404`

---

### Requirement: Bloqueio por assinatura expirada
O sistema SHALL bloquear todas as operações de pets quando o `subscription_status` do tenant for `expired` ou `cancelled`.

#### Scenario: Tenant com assinatura expirada
- **WHEN** qualquer endpoint de `/clients/:clientId/pets` ou `/pets/:id` é chamado por tenant com `subscription_status = expired`
- **THEN** o sistema retorna `402 Payment Required`

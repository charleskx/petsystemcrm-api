## ADDED Requirements

### Requirement: Listar feriados
O sistema SHALL retornar todos os feriados cadastrados pelo tenant autenticado, ordenados por data ascendente.

#### Scenario: Listagem bem-sucedida
- **WHEN** `GET /schedule/holidays` é chamado por usuário autenticado
- **THEN** o sistema retorna `200` com array de objetos contendo `id`, `date` e `description`, ordenados por `date` ascendente

#### Scenario: Tenant sem feriados
- **WHEN** `GET /schedule/holidays` é chamado por tenant sem feriados cadastrados
- **THEN** o sistema retorna `200` com array vazio

#### Scenario: Isolamento de tenant
- **WHEN** `GET /schedule/holidays` é chamado
- **THEN** o sistema retorna SOMENTE feriados cujo `tenant_id` corresponde ao tenant do usuário autenticado

#### Scenario: Sem autenticação
- **WHEN** `GET /schedule/holidays` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Adicionar feriado
O sistema SHALL permitir que usuários com permissão cadastrem uma nova data de feriado para o tenant.

#### Scenario: Criação bem-sucedida
- **WHEN** `POST /schedule/holidays` é chamado com `date` (formato ISO 8601: YYYY-MM-DD) e `description` válidos
- **THEN** o sistema persiste o feriado associado ao `tenant_id` do usuário autenticado e retorna `201` com o objeto criado

#### Scenario: Data duplicada
- **WHEN** `POST /schedule/holidays` é chamado com uma `date` já cadastrada para o tenant
- **THEN** o sistema retorna `409`

#### Scenario: Formato de data inválido
- **WHEN** `POST /schedule/holidays` é chamado com `date` em formato inválido (ex: "25/12/2025")
- **THEN** o sistema retorna `422`

#### Scenario: Campos obrigatórios ausentes
- **WHEN** `POST /schedule/holidays` é chamado sem `date` ou sem `description`
- **THEN** o sistema retorna `422`

#### Scenario: Permissão insuficiente
- **WHEN** `POST /schedule/holidays` é chamado por usuário com role `collaborator`
- **THEN** o sistema retorna `403`

#### Scenario: Sem autenticação
- **WHEN** `POST /schedule/holidays` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Remover feriado
O sistema SHALL permitir que usuários com permissão removam um feriado cadastrado.

#### Scenario: Remoção bem-sucedida
- **WHEN** `DELETE /schedule/holidays/:id` é chamado com ID de feriado pertencente ao tenant autenticado
- **THEN** o sistema remove o registro e retorna `204`

#### Scenario: Feriado de outro tenant
- **WHEN** `DELETE /schedule/holidays/:id` é chamado com ID de feriado pertencente a outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Feriado inexistente
- **WHEN** `DELETE /schedule/holidays/:id` é chamado com ID que não existe
- **THEN** o sistema retorna `404`

#### Scenario: Permissão insuficiente
- **WHEN** `DELETE /schedule/holidays/:id` é chamado por usuário com role `collaborator`
- **THEN** o sistema retorna `403`

#### Scenario: Sem autenticação
- **WHEN** `DELETE /schedule/holidays/:id` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Bloqueio por assinatura expirada
O sistema SHALL bloquear todas as operações de feriados quando o `subscription_status` do tenant for `expired` ou `cancelled`.

#### Scenario: Tenant com assinatura expirada
- **WHEN** qualquer endpoint de `/schedule/holidays` é chamado por tenant com `subscription_status = expired`
- **THEN** o sistema retorna `402 Payment Required`

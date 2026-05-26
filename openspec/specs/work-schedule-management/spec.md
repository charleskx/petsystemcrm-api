## ADDED Requirements

### Requirement: Consultar grade horária
O sistema SHALL retornar a grade horária semanal completa do tenant autenticado, com uma entrada por dia da semana (0 = domingo, 6 = sábado).

#### Scenario: Consulta bem-sucedida
- **WHEN** `GET /schedule` é chamado por usuário autenticado
- **THEN** o sistema retorna `200` com array de 7 objetos, cada um contendo `day_of_week`, `open_time`, `close_time` e `is_closed`

#### Scenario: Tenant sem grade configurada
- **WHEN** `GET /schedule` é chamado por tenant que nunca configurou sua grade
- **THEN** o sistema retorna `200` com array vazio

#### Scenario: Isolamento de tenant
- **WHEN** `GET /schedule` é chamado
- **THEN** o sistema retorna SOMENTE entradas cujo `tenant_id` corresponde ao tenant do usuário autenticado

#### Scenario: Sem autenticação
- **WHEN** `GET /schedule` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Salvar grade horária (bulk PUT)
O sistema SHALL substituir toda a grade horária do tenant em uma única operação atômica.

#### Scenario: Salvamento bem-sucedido
- **WHEN** `PUT /schedule` é chamado com array de objetos contendo `day_of_week` (0–6), `open_time`, `close_time` e `is_closed`
- **THEN** o sistema remove todas as entradas anteriores do tenant, persiste as novas e retorna `200` com a grade atualizada

#### Scenario: Dia marcado como fechado
- **WHEN** `PUT /schedule` é chamado com uma entrada onde `is_closed = true`
- **THEN** o sistema persiste `is_closed = true` para aquele dia; `open_time` e `close_time` são opcionais e ignorados na lógica de slots

#### Scenario: `open_time` maior ou igual a `close_time`
- **WHEN** `PUT /schedule` é chamado com `open_time >= close_time` em alguma entrada
- **THEN** o sistema retorna `422`

#### Scenario: `day_of_week` duplicado
- **WHEN** `PUT /schedule` é chamado com dois objetos com o mesmo `day_of_week`
- **THEN** o sistema retorna `422`

#### Scenario: `day_of_week` fora do intervalo
- **WHEN** `PUT /schedule` é chamado com `day_of_week` menor que 0 ou maior que 6
- **THEN** o sistema retorna `422`

#### Scenario: Permissão insuficiente
- **WHEN** `PUT /schedule` é chamado por usuário com role `collaborator`
- **THEN** o sistema retorna `403`

#### Scenario: Sem autenticação
- **WHEN** `PUT /schedule` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Bloqueio por assinatura expirada
O sistema SHALL bloquear todas as operações de grade horária quando o `subscription_status` do tenant for `expired` ou `cancelled`.

#### Scenario: Tenant com assinatura expirada
- **WHEN** qualquer endpoint de `/schedule` é chamado por tenant com `subscription_status = expired`
- **THEN** o sistema retorna `402 Payment Required`

---

### Requirement: Collaborator cannot modify work schedule or holidays
`PUT /schedule`, `POST /schedule/holidays`, and `DELETE /schedule/holidays/:id` SHALL be restricted to owner and financial roles. Checks SHALL use `request.ability.cannot("update", "WorkSchedule")` and `request.ability.cannot("create"|"delete", "Holiday")`.

#### Scenario: Collaborator cannot update schedule
- **WHEN** an authenticated collaborator sends `PUT /schedule`
- **THEN** the system returns 403

#### Scenario: Collaborator cannot add a holiday
- **WHEN** an authenticated collaborator sends `POST /schedule/holidays`
- **THEN** the system returns 403

#### Scenario: Collaborator cannot delete a holiday
- **WHEN** an authenticated collaborator sends `DELETE /schedule/holidays/:id`
- **THEN** the system returns 403

#### Scenario: Financial can update schedule
- **WHEN** an authenticated financial member sends `PUT /schedule` with valid payload
- **THEN** the system returns 200

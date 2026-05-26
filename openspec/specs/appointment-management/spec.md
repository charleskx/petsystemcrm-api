### Requirement: Criar agendamento
O sistema SHALL permitir que membros autenticados criem um agendamento para um pet de um cliente, associando um ou mais serviços, validando a disponibilidade do slot e resolvendo o preço de cada serviço pelo porte do pet.

#### Scenario: Criação bem-sucedida
- **WHEN** `POST /appointments` é chamado com `clientId`, `petId`, `scheduledAt` (datetime ISO 8601), `paymentMethod`, lista de `serviceIds` e opcionalmente `notes`
- **THEN** o sistema verifica que `scheduledAt` corresponde a um slot disponível (grade horária + feriados + agendamentos existentes), resolve o preço de cada serviço pelo porte do pet, calcula `totalAmount` como soma dos preços, persiste o agendamento com `status = scheduled` e retorna `201` com o agendamento criado incluindo os serviços e preços

#### Scenario: Slot indisponível
- **WHEN** `POST /appointments` é chamado com `scheduledAt` que não corresponde a nenhum slot livre para a duração total dos serviços informados
- **THEN** o sistema retorna `422` com mensagem indicando que o horário não está disponível

#### Scenario: Serviço sem precificação para o porte do pet
- **WHEN** `POST /appointments` é chamado com um `serviceId` cujo `ServicePricing` não possui entrada para o `pet.size` do pet selecionado
- **THEN** o sistema retorna `422` com mensagem indicando ausência de precificação para o porte do pet

#### Scenario: Pet não pertence ao cliente informado
- **WHEN** `POST /appointments` é chamado com `petId` de um pet que não está associado ao `clientId` informado
- **THEN** o sistema retorna `422`

#### Scenario: Cliente não pertence ao tenant
- **WHEN** `POST /appointments` é chamado com `clientId` de um cliente de outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Lista de serviços vazia
- **WHEN** `POST /appointments` é chamado com `serviceIds` vazio ou ausente
- **THEN** o sistema retorna `422`

#### Scenario: Sem autenticação
- **WHEN** `POST /appointments` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Listar agendamentos
O sistema SHALL retornar a lista paginada de agendamentos do tenant autenticado, com filtros opcionais por data, status, cliente e pet.

#### Scenario: Listagem sem filtros
- **WHEN** `GET /appointments` é chamado sem parâmetros de filtro
- **THEN** o sistema retorna `200` com array paginado de agendamentos do tenant, ordenados por `scheduled_at` decrescente

#### Scenario: Filtro por data
- **WHEN** `GET /appointments?date=YYYY-MM-DD` é chamado
- **THEN** o sistema retorna somente agendamentos com `scheduled_at` no dia informado

#### Scenario: Filtro por status
- **WHEN** `GET /appointments?status=scheduled` é chamado
- **THEN** o sistema retorna somente agendamentos com `status = scheduled`

#### Scenario: Filtro por cliente
- **WHEN** `GET /appointments?clientId=<id>` é chamado
- **THEN** o sistema retorna somente agendamentos do cliente informado

#### Scenario: Filtro por pet
- **WHEN** `GET /appointments?petId=<id>` é chamado
- **THEN** o sistema retorna somente agendamentos do pet informado

#### Scenario: Isolamento de tenant
- **WHEN** `GET /appointments` é chamado
- **THEN** o sistema retorna SOMENTE agendamentos do tenant do usuário autenticado

#### Scenario: Sem autenticação
- **WHEN** `GET /appointments` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Consultar detalhe de agendamento
O sistema SHALL retornar os dados completos de um agendamento específico, incluindo cliente, pet e serviços com seus preços.

#### Scenario: Agendamento encontrado
- **WHEN** `GET /appointments/:id` é chamado para um agendamento do tenant autenticado
- **THEN** o sistema retorna `200` com os dados do agendamento, incluindo `client`, `pet`, `services` (com `name`, `price` e `duration_minutes`) e `totalAmount`

#### Scenario: Agendamento de outro tenant
- **WHEN** `GET /appointments/:id` é chamado para um agendamento que pertence a outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Agendamento inexistente
- **WHEN** `GET /appointments/:id` é chamado com um id que não existe
- **THEN** o sistema retorna `404`

#### Scenario: Sem autenticação
- **WHEN** `GET /appointments/:id` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Atualizar agendamento
O sistema SHALL permitir que membros com role `owner` ou `financial` atualizem as observações e o método de pagamento de um agendamento.

#### Scenario: Atualização bem-sucedida
- **WHEN** `PATCH /appointments/:id` é chamado por membro com role `owner` ou `financial` com campos `notes` e/ou `paymentMethod`
- **THEN** o sistema atualiza os campos informados e retorna `200` com o agendamento atualizado

#### Scenario: Role sem permissão
- **WHEN** `PATCH /appointments/:id` é chamado por membro com role `collaborator`
- **THEN** o sistema retorna `403`

#### Scenario: Agendamento cancelado
- **WHEN** `PATCH /appointments/:id` é chamado para um agendamento com `status = cancelled`
- **THEN** o sistema retorna `422` com mensagem indicando que agendamentos cancelados não podem ser editados

#### Scenario: Agendamento de outro tenant
- **WHEN** `PATCH /appointments/:id` é chamado para um agendamento de outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Sem autenticação
- **WHEN** `PATCH /appointments/:id` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Alterar status do agendamento
O sistema SHALL permitir que membros com role `owner` ou `financial` avancem o status de um agendamento segundo o ciclo de vida definido.

#### Scenario: Transição scheduled → in_progress
- **WHEN** `PATCH /appointments/:id/status` é chamado com `status = in_progress` para um agendamento com `status = scheduled`
- **THEN** o sistema atualiza o status e retorna `200`

#### Scenario: Transição in_progress → completed
- **WHEN** `PATCH /appointments/:id/status` é chamado com `status = completed` para um agendamento com `status = in_progress`
- **THEN** o sistema atualiza o status e retorna `200`

#### Scenario: Transição inválida
- **WHEN** `PATCH /appointments/:id/status` é chamado com uma transição não permitida (ex: `completed → scheduled`, `cancelled → in_progress`)
- **THEN** o sistema retorna `422` com mensagem de transição inválida

#### Scenario: Role sem permissão
- **WHEN** `PATCH /appointments/:id/status` é chamado por membro com role `collaborator`
- **THEN** o sistema retorna `403`

#### Scenario: Agendamento de outro tenant
- **WHEN** `PATCH /appointments/:id/status` é chamado para um agendamento de outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Sem autenticação
- **WHEN** `PATCH /appointments/:id/status` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Cancelar agendamento
O sistema SHALL permitir que membros com role `owner` ou `financial` cancelem um agendamento, alterando seu status para `cancelled` sem remoção física do registro.

#### Scenario: Cancelamento bem-sucedido
- **WHEN** `DELETE /appointments/:id` é chamado por membro com role `owner` ou `financial` para um agendamento com status `scheduled` ou `in_progress`
- **THEN** o sistema atualiza `status = cancelled` e retorna `204`

#### Scenario: Agendamento já cancelado
- **WHEN** `DELETE /appointments/:id` é chamado para um agendamento já com `status = cancelled`
- **THEN** o sistema retorna `422` com mensagem indicando que o agendamento já está cancelado

#### Scenario: Agendamento concluído
- **WHEN** `DELETE /appointments/:id` é chamado para um agendamento com `status = completed`
- **THEN** o sistema retorna `422` com mensagem indicando que agendamentos concluídos não podem ser cancelados

#### Scenario: Role sem permissão
- **WHEN** `DELETE /appointments/:id` é chamado por membro com role `collaborator`
- **THEN** o sistema retorna `403`

#### Scenario: Agendamento de outro tenant
- **WHEN** `DELETE /appointments/:id` é chamado para um agendamento de outro tenant
- **THEN** o sistema retorna `404`

#### Scenario: Sem autenticação
- **WHEN** `DELETE /appointments/:id` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

---

### Requirement: Bloqueio por assinatura expirada
O sistema SHALL bloquear todas as operações de agendamento quando o `subscription_status` do tenant for `expired` ou `cancelled`.

#### Scenario: Tenant com assinatura expirada
- **WHEN** qualquer endpoint de `/appointments` é chamado por tenant com `subscription_status = expired`
- **THEN** o sistema retorna `402 Payment Required`

---

### Requirement: Collaborator cannot update, change status, or delete appointments
`PATCH /appointments/:id`, `PATCH /appointments/:id/status`, and `DELETE /appointments/:id` SHALL be restricted to owner and financial roles. The check SHALL use `request.ability.cannot("update"|"delete", "Appointment")`.

#### Scenario: Collaborator cannot update an appointment
- **WHEN** an authenticated collaborator sends `PATCH /appointments/:id`
- **THEN** the system returns 403

#### Scenario: Collaborator cannot change appointment status
- **WHEN** an authenticated collaborator sends `PATCH /appointments/:id/status`
- **THEN** the system returns 403

#### Scenario: Collaborator cannot delete an appointment
- **WHEN** an authenticated collaborator sends `DELETE /appointments/:id`
- **THEN** the system returns 403

#### Scenario: Owner can update an appointment
- **WHEN** an authenticated owner sends `PATCH /appointments/:id` with valid payload
- **THEN** the system returns 200

#### Scenario: Financial can update an appointment
- **WHEN** an authenticated financial member sends `PATCH /appointments/:id` with valid payload
- **THEN** the system returns 200

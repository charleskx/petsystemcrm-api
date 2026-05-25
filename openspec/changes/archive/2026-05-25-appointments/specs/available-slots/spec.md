## MODIFIED Requirements

### Requirement: Consultar slots disponíveis
O sistema SHALL calcular e retornar os horários disponíveis para uma data e duração informadas, considerando a grade horária do tenant, feriados cadastrados e agendamentos existentes com status `scheduled` ou `in_progress`.

#### Scenario: Data em dia útil com grade configurada
- **WHEN** `GET /schedule/available-slots?date=YYYY-MM-DD&duration=60` é chamado para uma data que não é feriado e cujo dia da semana tem `is_closed = false` na grade
- **THEN** o sistema retorna `200` com array de strings no formato `HH:MM`, representando os horários de início dos slots livres, calculados de `open_time` até `close_time - duration` em intervalos de `duration` minutos, excluindo os horários já ocupados por agendamentos `scheduled` ou `in_progress` do mesmo tenant na data informada

#### Scenario: Slot ocupado por agendamento existente
- **WHEN** `GET /schedule/available-slots?date=YYYY-MM-DD&duration=60` é chamado e existe um agendamento com `status = scheduled` ou `status = in_progress` para o mesmo tenant com `scheduled_at` coincidindo com um dos slots calculados
- **THEN** o sistema retorna `200` excluindo do array o slot ocupado pelo agendamento existente

#### Scenario: Data em feriado
- **WHEN** `GET /schedule/available-slots?date=YYYY-MM-DD&duration=60` é chamado para uma data cadastrada como feriado do tenant
- **THEN** o sistema retorna `200` com array vazio

#### Scenario: Dia da semana marcado como fechado
- **WHEN** `GET /schedule/available-slots?date=YYYY-MM-DD&duration=60` é chamado para uma data cujo dia da semana tem `is_closed = true` na grade
- **THEN** o sistema retorna `200` com array vazio

#### Scenario: Dia sem grade configurada
- **WHEN** `GET /schedule/available-slots?date=YYYY-MM-DD&duration=60` é chamado para uma data cujo dia da semana não possui entrada em `work_schedules`
- **THEN** o sistema retorna `200` com array vazio

#### Scenario: Duração maior que o horário de funcionamento
- **WHEN** `GET /schedule/available-slots?date=YYYY-MM-DD&duration=600` é chamado e a diferença entre `close_time` e `open_time` for menor que `duration`
- **THEN** o sistema retorna `200` com array vazio

#### Scenario: Parâmetro `date` ausente
- **WHEN** `GET /schedule/available-slots?duration=60` é chamado sem o parâmetro `date`
- **THEN** o sistema retorna `422`

#### Scenario: Parâmetro `duration` ausente
- **WHEN** `GET /schedule/available-slots?date=YYYY-MM-DD` é chamado sem o parâmetro `duration`
- **THEN** o sistema retorna `422`

#### Scenario: Formato de `date` inválido
- **WHEN** `GET /schedule/available-slots?date=25-12-2025&duration=60` é chamado com data em formato inválido
- **THEN** o sistema retorna `422`

#### Scenario: `duration` menor ou igual a zero
- **WHEN** `GET /schedule/available-slots?date=YYYY-MM-DD&duration=0` é chamado
- **THEN** o sistema retorna `422`

#### Scenario: Isolamento de tenant
- **WHEN** `GET /schedule/available-slots` é chamado
- **THEN** o sistema usa SOMENTE a grade horária, os feriados e os agendamentos do tenant do usuário autenticado

#### Scenario: Sem autenticação
- **WHEN** `GET /schedule/available-slots` é chamado sem cookie de sessão válido
- **THEN** o sistema retorna `401`

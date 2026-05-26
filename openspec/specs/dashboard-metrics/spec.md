## ADDED Requirements

### Requirement: GET /dashboard retorna métricas agregadas do tenant
O sistema SHALL fornecer o endpoint `GET /dashboard` que retorna métricas, KPIs, alertas e dados de gráfico em uma única resposta estruturada, filtrada por `tenantId` do usuário autenticado.

#### Scenario: Tenant autenticado recebe a dashboard completa
- **WHEN** um usuário autenticado envia `GET /dashboard`
- **THEN** o sistema retorna `200` com um objeto JSON contendo as seções `subscription`, `today`, `thisMonth`, `totals`, `upcomingAppointments`, `productAlerts` e `revenueChart`

#### Scenario: Usuário não autenticado recebe 401
- **WHEN** uma requisição sem sessão válida é enviada para `GET /dashboard`
- **THEN** o sistema retorna `401 Unauthorized`

---

### Requirement: Seção `today` sempre presente
A seção `today` SHALL estar presente em todas as respostas, independentemente do plano ou status da assinatura. Contém os agendamentos do dia atual (fuso horário do servidor).

#### Scenario: Today reflete apenas o dia corrente
- **WHEN** `GET /dashboard` é chamado
- **THEN** `today.appointmentsScheduled` contém a contagem de agendamentos com `status = "scheduled"` e `scheduled_at` dentro do dia atual
- **AND** `today.appointmentsCompleted` contém a contagem de agendamentos com `status = "completed"` no dia atual
- **AND** `today.appointmentRevenue` contém a soma de `total_amount` dos agendamentos `completed` do dia atual (número, default `0`)

---

### Requirement: Seção `subscription` sempre presente
A seção `subscription` SHALL estar sempre presente e refletir o estado atual da assinatura do tenant.

#### Scenario: Subscription retorna plano e status
- **WHEN** `GET /dashboard` é chamado
- **THEN** `subscription.plan` contém `"essential"` ou `"premium"`
- **AND** `subscription.status` contém o `subscription_status` atual do tenant
- **AND** `subscription.trialEndsAt` está presente quando o status for `"trial"`

---

### Requirement: Métricas completas disponíveis para assinatura ativa
Quando `subscription_status` é `trial`, `active` ou `past_due`, o endpoint SHALL retornar as seções `thisMonth`, `totals`, `upcomingAppointments`, `productAlerts` e `revenueChart`.

#### Scenario: thisMonth agrega dados do mês corrente
- **WHEN** o tenant tem assinatura ativa e `GET /dashboard` é chamado
- **THEN** `thisMonth.appointmentsCompleted` contém a contagem de agendamentos completados no mês corrente
- **AND** `thisMonth.appointmentRevenue` contém a soma de `total_amount` dos agendamentos completados no mês corrente
- **AND** `thisMonth.newClients` contém a contagem de clientes criados no mês corrente

#### Scenario: totals contém contagens globais do tenant
- **WHEN** o tenant tem assinatura ativa e `GET /dashboard` é chamado
- **THEN** `totals.clients` contém o total de clientes ativos do tenant
- **AND** `totals.pets` contém o total de pets do tenant
- **AND** `totals.activeProducts` contém o total de produtos com `active = true`

#### Scenario: upcomingAppointments lista os próximos 5 agendamentos
- **WHEN** o tenant tem assinatura ativa e `GET /dashboard` é chamado
- **THEN** `upcomingAppointments` é um array com os próximos agendamentos com `status = "scheduled"` e `scheduled_at >= agora`, ordenados por `scheduled_at` ASC, limitado a 5 itens
- **AND** cada item contém `id`, `scheduledAt`, `clientName`, `petName` e `services` (array de nomes dos serviços)

#### Scenario: productAlerts lista produtos em alerta
- **WHEN** o tenant tem assinatura ativa e `GET /dashboard` é chamado
- **THEN** `productAlerts.lowStock` contém até 10 produtos com `quantity <= min_quantity` e `active = true`, cada um com `id`, `name`, `quantity`, `minQuantity`
- **AND** `productAlerts.nearExpiry` contém até 10 produtos com `expiry_date <= hoje + 30 dias` e `active = true`, cada um com `id`, `name`, `expiryDate`, `quantity`

#### Scenario: revenueChart retorna os últimos 30 dias
- **WHEN** o tenant tem assinatura ativa e `GET /dashboard` é chamado
- **THEN** `revenueChart` é um array de até 30 objetos, um por dia com receita > 0, cada um contendo `date` (formato `YYYY-MM-DD`) e `appointmentRevenue` (soma dos agendamentos completados naquele dia)
- **AND** dias sem receita NÃO aparecem no array (array esparso)

---

### Requirement: Seções premium omitidas no plano essential
Quando `plan = "essential"`, as seções de vendas SHALL ser `null` na resposta. O frontend usa `null` para decidir não renderizar os cards de vendas.

#### Scenario: Plano essential não retorna dados de vendas
- **WHEN** um tenant com `plan = "essential"` e assinatura ativa envia `GET /dashboard`
- **THEN** `salesThisMonth` é `null` na resposta
- **AND** `revenueChart` contém apenas `appointmentRevenue` por dia (sem `salesRevenue`)

#### Scenario: Plano premium retorna dados de vendas
- **WHEN** um tenant com `plan = "premium"` e assinatura ativa envia `GET /dashboard`
- **THEN** `salesThisMonth.count` contém a contagem de vendas com `status = "paid"` no mês corrente
- **AND** `salesThisMonth.revenue` contém a soma de `total_amount` das vendas `paid` do mês corrente
- **AND** `salesThisMonth.byChannel.in_store` e `salesThisMonth.byChannel.online` contêm as contagens por canal
- **AND** cada item do `revenueChart` contém também `salesRevenue` com a soma de vendas `paid` daquele dia

---

### Requirement: Modo degradado quando assinatura está bloqueada
Quando `subscription_status` é `expired` ou `cancelled`, o endpoint SHALL retornar apenas `subscription` e `today`. As demais seções SHALL ser `null`.

#### Scenario: Tenant expirado recebe apenas today e subscription
- **WHEN** um tenant com `subscription_status = "expired"` envia `GET /dashboard`
- **THEN** o sistema retorna `200` (não 402)
- **AND** `subscription` e `today` estão presentes
- **AND** `thisMonth`, `totals`, `upcomingAppointments`, `productAlerts`, `revenueChart` e `salesThisMonth` são `null`

#### Scenario: Tenant cancelado também recebe modo degradado
- **WHEN** um tenant com `subscription_status = "cancelled"` envia `GET /dashboard`
- **THEN** o sistema retorna `200`
- **AND** apenas `subscription` e `today` têm valores; demais seções são `null`

---

### Requirement: /dashboard é acessível independentemente do subscription-guard
O `subscription-guard` SHALL ignorar a rota `/dashboard`, permitindo que todos os status de assinatura (incluindo `expired`, `cancelled` e `past_due`) acessem o endpoint sem receber `402`.

#### Scenario: Subscription-guard não bloqueia /dashboard
- **WHEN** um tenant com `subscription_status = "expired"` envia `GET /dashboard`
- **THEN** o `subscription-guard` não intercepta a requisição com `402`
- **AND** o endpoint retorna `200` com o modo degradado

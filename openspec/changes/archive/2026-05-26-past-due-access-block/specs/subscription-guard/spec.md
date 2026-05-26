## MODIFIED Requirements

### Requirement: Tenant com pagamento atrasado não acessa endpoints operacionais
Quando `subscription_status = "past_due"`, o sistema SHALL bloquear todos os endpoints operacionais com `402 Payment Required`, da mesma forma que `expired` e `cancelled`. Apenas `/billing/*` SHALL permanecer acessível.

#### Scenario: Tenant past_due recebe 402 em endpoint operacional
- **WHEN** um tenant autenticado com `subscription_status = "past_due"` envia qualquer request a um endpoint operacional (ex: `GET /services`)
- **THEN** o sistema retorna `402 Payment Required`
- **AND** o body contém `{ "error": "..." }` orientando o usuário a regularizar o pagamento

#### Scenario: Tenant past_due ainda acessa /billing
- **WHEN** um tenant autenticado com `subscription_status = "past_due"` envia request a `GET /billing/subscription`
- **THEN** o sistema retorna `200` com os dados da assinatura

#### Scenario: Tenant past_due ainda acessa /billing/portal
- **WHEN** um tenant autenticado com `subscription_status = "past_due"` envia `POST /billing/portal`
- **THEN** o sistema retorna `200` com a URL do portal Stripe para atualizar o método de pagamento

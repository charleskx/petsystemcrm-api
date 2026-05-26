## ADDED Requirements

### Requirement: Guard is applied to all authenticated routes
The `subscriptionGuard` preHandler SHALL be applied to all authenticated routes except: `/auth/*`, `/payments/stripe/webhook`, `/billing/*`, and `/health`. The `premiumGuard` preHandler SHALL be applied only to premium-only routes (`/suppliers`, `/sales`).

#### Scenario: Operational route calls subscription guard
- **WHEN** an authenticated request is made to `/clients`
- **THEN** the `subscriptionGuard` SHALL be invoked before the route handler

#### Scenario: Billing route bypasses guard
- **WHEN** an authenticated request is made to `/billing/subscription`
- **THEN** the `subscriptionGuard` SHALL NOT be invoked and the request SHALL proceed normally

#### Scenario: Webhook route bypasses guard
- **WHEN** a request is made to `/payments/stripe/webhook`
- **THEN** the `subscriptionGuard` SHALL NOT be invoked

---

### Requirement: Expired subscription blocks operational requests with 402
If a tenant's `subscription_status` is `"expired"` or `"cancelled"`, the system SHALL return 402 on all routes except the bypass paths listed above.

#### Scenario: Expired tenant is blocked
- **WHEN** an authenticated tenant with `subscription_status = "expired"` requests `GET /clients`
- **THEN** the system SHALL return 402 with an appropriate error message

#### Scenario: Cancelled tenant is blocked
- **WHEN** an authenticated tenant with `subscription_status = "cancelled"` requests `GET /appointments`
- **THEN** the system SHALL return 402 with an appropriate error message

#### Scenario: Expired tenant can still access billing
- **WHEN** an authenticated tenant with `subscription_status = "expired"` requests `GET /billing/subscription`
- **THEN** the system SHALL return 200

---

### Requirement: Trial tenant has full premium access
A tenant with `subscription_status = "trial"` and `trial_ends_at > now` SHALL have unrestricted access to all routes including premium-only routes.

#### Scenario: Active trial accesses premium route
- **WHEN** a tenant in active trial requests `GET /suppliers`
- **THEN** the system SHALL return 200

---

### Requirement: Lazy trial expiry updates subscription_status
If `subscription_status = "trial"` and `trial_ends_at < now`, the system SHALL atomically update `subscription_status` to `"expired"` in the database before enforcing the 402 response.

#### Scenario: Expired trial is lazily marked and blocked
- **WHEN** a tenant with `subscription_status = "trial"` and `trial_ends_at` in the past makes a request to an operational route
- **THEN** the system SHALL update `subscription_status` to `"expired"` in the database
- **THEN** the system SHALL return 402 on the same request

---

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

---

### Requirement: Essential-plan tenant is blocked from premium routes with 403
If `subscription_status = "active"` and `plan = "essential"`, the system SHALL return 403 when the tenant accesses a premium-only route (`/suppliers`, `/sales`).

#### Scenario: Essential tenant blocked from suppliers
- **WHEN** an authenticated tenant with `plan = "essential"` and `subscription_status = "active"` requests `GET /suppliers`
- **THEN** the system SHALL return 403

#### Scenario: Essential tenant blocked from sales
- **WHEN** an authenticated tenant with `plan = "essential"` and `subscription_status = "active"` requests `GET /sales`
- **THEN** the system SHALL return 403

#### Scenario: Essential tenant in trial accesses premium route
- **WHEN** an authenticated tenant with `plan = "essential"` and `subscription_status = "trial"` (active) requests `GET /suppliers`
- **THEN** the system SHALL return 200 (trial grants full access regardless of plan)

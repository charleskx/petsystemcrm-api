## ADDED Requirements

### Requirement: Exempt routes bypass the guard
The subscription guard SHALL NOT apply to requests matching the following path prefixes: `/auth/`, `/billing/`, `/payments/stripe/webhook`, `/health`. These routes SHALL always be accessible regardless of subscription status.

#### Scenario: Billing route with expired status
- **WHEN** a tenant with `subscription_status = expired` requests `GET /billing/subscription`
- **THEN** the guard does not block the request and the route handler responds normally

#### Scenario: Health check with no auth
- **WHEN** an unauthenticated request is made to `GET /health`
- **THEN** the guard does not apply and the route responds normally

### Requirement: Lazy trial expiry transition
If `subscription_status = trial` and `trial_ends_at < now()`, the guard SHALL atomically update `subscription_status` to `expired` (using a conditional update that only fires if the status is still `trial`) before evaluating access. This ensures a single transition even under concurrent requests.

#### Scenario: Trial expired on request
- **WHEN** a tenant's `trial_ends_at` is in the past and `subscription_status` is still `trial`
- **THEN** the guard updates `subscription_status` to `expired` and then applies expired-tenant rules to the current request

### Requirement: Block expired and cancelled tenants
If `subscription_status` is `expired` or `cancelled` (after the lazy expiry check), the guard SHALL return `402 Payment Required` with the message "Assinatura expirada. Acesse /billing para renovar."

#### Scenario: Expired tenant on operational route
- **WHEN** a tenant with `subscription_status = expired` requests `GET /clients`
- **THEN** the guard returns `402 Payment Required`

#### Scenario: Cancelled tenant on operational route
- **WHEN** a tenant with `subscription_status = cancelled` requests `POST /appointments`
- **THEN** the guard returns `402 Payment Required`

### Requirement: Block essential tenants from premium routes
If `subscription_status = active` and `plan = essential`, the guard SHALL return `403 Forbidden` with the message "Esta funcionalidade requer o plano Premium." for requests to premium-only routes: `/suppliers` and `/sales`.

#### Scenario: Essential tenant on premium route
- **WHEN** a tenant with `plan = essential` requests `GET /suppliers`
- **THEN** the guard returns `403 Forbidden`

#### Scenario: Essential tenant on essential route
- **WHEN** a tenant with `plan = essential` requests `GET /products`
- **THEN** the guard allows the request through

#### Scenario: Premium tenant on premium route
- **WHEN** a tenant with `plan = premium` requests `GET /sales`
- **THEN** the guard allows the request through

### Requirement: Trial tenants have full access
If `subscription_status = trial` and `trial_ends_at >= now()`, the guard SHALL allow access to all routes as if the tenant had a `premium` plan.

#### Scenario: Active trial on premium route
- **WHEN** a tenant with `subscription_status = trial` and a future `trial_ends_at` requests `GET /suppliers`
- **THEN** the guard allows the request through

### Requirement: past_due tenants retain access
If `subscription_status = past_due`, the guard SHALL allow the request through (Stripe will retry payment; access is not immediately revoked).

#### Scenario: Past due tenant on operational route
- **WHEN** a tenant with `subscription_status = past_due` requests `GET /clients`
- **THEN** the guard allows the request through

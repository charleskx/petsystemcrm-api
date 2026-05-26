## ADDED Requirements

### Requirement: Get subscription status
The system SHALL expose a `GET /billing/subscription` endpoint that returns the tenant's current subscription details. This endpoint SHALL be accessible regardless of `subscription_status` (including `expired` and `cancelled`).

#### Scenario: Active subscription
- **WHEN** a tenant with `subscription_status = active` calls `GET /billing/subscription`
- **THEN** the system returns `200` with `{ status, plan, trialEndsAt, stripeSubscriptionId }`

#### Scenario: Trial subscription
- **WHEN** a tenant with `subscription_status = trial` calls `GET /billing/subscription`
- **THEN** the system returns `200` with `status = "trial"` and a non-null `trialEndsAt`

#### Scenario: Expired subscription
- **WHEN** a tenant with `subscription_status = expired` calls `GET /billing/subscription`
- **THEN** the system returns `200` with `status = "expired"` (not blocked by subscription guard)

### Requirement: Create Stripe checkout session
The system SHALL expose a `POST /billing/checkout` endpoint that creates a Stripe Checkout Session and returns the session URL. The request body SHALL include `plan` (`essential` | `premium`).

If the tenant has no `stripe_customer_id`, the system SHALL create a Stripe Customer and persist the ID before creating the session.

#### Scenario: Checkout for new subscriber
- **WHEN** a tenant with no `stripe_customer_id` calls `POST /billing/checkout` with `{ plan: "premium" }`
- **THEN** the system creates a Stripe customer, persists `stripe_customer_id`, creates a checkout session, and returns `200` with `{ url: "<stripe_checkout_url>" }`

#### Scenario: Checkout for existing customer
- **WHEN** a tenant with an existing `stripe_customer_id` calls `POST /billing/checkout`
- **THEN** the system skips customer creation and directly creates a checkout session

#### Scenario: Invalid plan value
- **WHEN** a request is made with an unrecognized `plan` value
- **THEN** the system returns `400` with a validation error

### Requirement: Open Stripe customer portal
The system SHALL expose a `POST /billing/portal` endpoint that creates a Stripe Billing Portal session and returns the portal URL. The tenant MUST have a `stripe_customer_id` to use this endpoint.

#### Scenario: Portal for subscribed tenant
- **WHEN** a tenant with a valid `stripe_customer_id` calls `POST /billing/portal`
- **THEN** the system creates a portal session and returns `200` with `{ url: "<stripe_portal_url>" }`

#### Scenario: Portal without customer
- **WHEN** a tenant with no `stripe_customer_id` calls `POST /billing/portal`
- **THEN** the system returns `400` with the message "Nenhuma assinatura ativa encontrada"

### Requirement: Change subscription plan
The system SHALL expose a `PATCH /billing/plan` endpoint to upgrade or downgrade the tenant's plan. The request body SHALL include `plan` (`essential` | `premium`).

Upgrades SHALL take effect immediately. Downgrades SHALL be scheduled for the end of the current billing period and SHALL NOT change the local `plan` field immediately (the webhook updates it).

#### Scenario: Upgrade to premium
- **WHEN** an `essential` tenant calls `PATCH /billing/plan` with `{ plan: "premium" }`
- **THEN** the system updates the Stripe subscription immediately and returns `200`

#### Scenario: Downgrade to essential
- **WHEN** a `premium` tenant calls `PATCH /billing/plan` with `{ plan: "essential" }`
- **THEN** the system schedules the plan change at period end and returns `200` with a message indicating the change applies at the next billing cycle

#### Scenario: No active subscription
- **WHEN** a tenant with no `stripe_subscription_id` calls `PATCH /billing/plan`
- **THEN** the system returns `400` with the message "Nenhuma assinatura ativa encontrada"

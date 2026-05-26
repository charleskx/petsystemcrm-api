## ADDED Requirements

### Requirement: Verify Stripe webhook signature
The system SHALL verify every incoming Stripe webhook request using the `stripe-signature` header and the raw request body before processing any event. Requests with invalid signatures SHALL be rejected.

#### Scenario: Valid signature
- **WHEN** Stripe calls `POST /payments/stripe/webhook` with a valid `stripe-signature` header
- **THEN** the system processes the event and returns `200`

#### Scenario: Invalid signature
- **WHEN** a request arrives at `POST /payments/stripe/webhook` with a missing or invalid `stripe-signature`
- **THEN** the system returns `400` without processing the event

### Requirement: Handle subscription activated event
The system SHALL handle the `checkout.session.completed` event. When the session mode is `subscription`, the system SHALL update the tenant's `subscription_status` to `active`, store `stripe_subscription_id`, and set `plan` based on the purchased price ID.

#### Scenario: Checkout completed for premium plan
- **WHEN** Stripe sends `checkout.session.completed` with `mode = "subscription"` and a premium price ID
- **THEN** the system sets `subscription_status = active`, `plan = premium`, and stores `stripe_subscription_id`

#### Scenario: Checkout completed for essential plan
- **WHEN** Stripe sends `checkout.session.completed` with `mode = "subscription"` and an essential price ID
- **THEN** the system sets `subscription_status = active`, `plan = essential`, and stores `stripe_subscription_id`

### Requirement: Handle subscription updated event
The system SHALL handle the `customer.subscription.updated` event to synchronize `subscription_status` and `plan` when Stripe changes the subscription (e.g., after a scheduled downgrade takes effect or a plan change).

#### Scenario: Subscription updated
- **WHEN** Stripe sends `customer.subscription.updated`
- **THEN** the system updates `subscription_status` and `plan` on the tenant to match the Stripe subscription state

### Requirement: Handle subscription cancelled or expired event
The system SHALL handle `customer.subscription.deleted` and `invoice.payment_failed` events to mark the tenant's subscription as `cancelled` or `past_due` respectively.

#### Scenario: Subscription deleted
- **WHEN** Stripe sends `customer.subscription.deleted`
- **THEN** the system sets `subscription_status = cancelled`

#### Scenario: Invoice payment failed
- **WHEN** Stripe sends `invoice.payment_failed`
- **THEN** the system sets `subscription_status = past_due`

### Requirement: Idempotent event processing
The system SHALL process webhook events idempotently. Receiving the same event twice SHALL NOT result in inconsistent state (the second write is a no-op or overwrites with the same value).

#### Scenario: Duplicate event
- **WHEN** the same Stripe event is delivered twice
- **THEN** the system returns `200` both times and the tenant's data remains consistent

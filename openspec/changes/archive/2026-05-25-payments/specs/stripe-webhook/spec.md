## ADDED Requirements

### Requirement: Webhook signature verification
The system SHALL verify the Stripe webhook signature on every `POST /payments/stripe/webhook` request using the `stripe-signature` header and `STRIPE_WEBHOOK_SECRET`. Requests with missing or invalid signatures SHALL be rejected.

#### Scenario: Missing stripe-signature header
- **WHEN** a POST request is made to `/payments/stripe/webhook` without a `stripe-signature` header
- **THEN** the system SHALL return 400 with `{ "error": "Assinatura do webhook inválida" }`

#### Scenario: Invalid stripe-signature header
- **WHEN** a POST request is made to `/payments/stripe/webhook` with a malformed `stripe-signature` value
- **THEN** the system SHALL return 400 with `{ "error": "Assinatura do webhook inválida" }`

#### Scenario: Valid signature accepted
- **WHEN** a POST request is made with a valid Stripe-signed body
- **THEN** the system SHALL return 200 with `{ "received": true }`

---

### Requirement: Raw body parsing for webhook
The system SHALL parse the request body as a raw `Buffer` for `POST /payments/stripe/webhook`. This is required for Stripe signature verification.

#### Scenario: Body is not pre-parsed as JSON
- **WHEN** the webhook route receives an `application/json` request
- **THEN** the body SHALL be passed to the Stripe SDK as a `Buffer` (not a parsed object)

---

### Requirement: checkout.session.completed activates subscription
On receiving a valid `checkout.session.completed` event with `mode === "subscription"`, the system SHALL retrieve the subscription from Stripe and update the tenant record.

#### Scenario: Successful checkout activates tenant
- **WHEN** Stripe sends `checkout.session.completed` with a valid `tenantId` in `metadata`
- **THEN** the system SHALL set `subscription_status = "active"`, `plan` derived from the Stripe price ID, and `stripe_subscription_id` on the tenant
- **THEN** the system SHALL return 200 with `{ "received": true }`

#### Scenario: Event without tenantId in metadata is ignored
- **WHEN** Stripe sends `checkout.session.completed` with no `tenantId` in `session.metadata`
- **THEN** the system SHALL take no action and return 200 with `{ "received": true }`

---

### Requirement: customer.subscription.updated syncs plan and status
On receiving `customer.subscription.updated`, the system SHALL update the tenant's `subscription_status` and `plan` fields based on the Stripe subscription data.

#### Scenario: Subscription updated to active
- **WHEN** Stripe sends `customer.subscription.updated` with `status = "active"` for a known customer
- **THEN** the system SHALL update the tenant's `subscription_status` to `"active"` and `plan` to the value derived from the Stripe price ID

#### Scenario: Subscription updated to past_due
- **WHEN** Stripe sends `customer.subscription.updated` with `status = "past_due"` for a known customer
- **THEN** the system SHALL update the tenant's `subscription_status` to `"past_due"`

#### Scenario: Unknown customer is ignored
- **WHEN** Stripe sends `customer.subscription.updated` for a `customer` ID not found in the tenants table
- **THEN** the system SHALL take no action and return 200

---

### Requirement: customer.subscription.deleted marks tenant as cancelled
On receiving `customer.subscription.deleted`, the system SHALL set the tenant's `subscription_status` to `"cancelled"`.

#### Scenario: Subscription deleted for known customer
- **WHEN** Stripe sends `customer.subscription.deleted` for a known `customer` ID
- **THEN** the system SHALL set `subscription_status = "cancelled"` on the matching tenant

---

### Requirement: invoice.payment_failed marks tenant as past_due
On receiving `invoice.payment_failed`, the system SHALL set the tenant's `subscription_status` to `"past_due"`.

#### Scenario: Payment failure recorded
- **WHEN** Stripe sends `invoice.payment_failed` for a known `customer` ID
- **THEN** the system SHALL set `subscription_status = "past_due"` on the matching tenant

---

### Requirement: Unhandled event types are silently ignored
The system SHALL accept any valid Stripe event type that is not explicitly handled, take no action, and return 200.

#### Scenario: Unknown event type
- **WHEN** Stripe sends a valid signed event with an unrecognized type
- **THEN** the system SHALL return 200 with `{ "received": true }` and make no DB changes

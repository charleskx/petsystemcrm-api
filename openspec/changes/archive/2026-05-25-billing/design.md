## Context

The platform has a 14-day trial model where all tenants start with full premium access. After trial expiry, tenants must subscribe via Stripe to continue. The `tenants` table already has `plan`, `subscription_status`, `trial_ends_at`, `stripe_customer_id`, and `stripe_subscription_id` columns per the domain model. There is currently no billing code or middleware.

Stripe is the payment processor. The system uses Fastify, Drizzle ORM, and better-auth for the auth/JWT context on each request.

## Goals / Non-Goals

**Goals:**
- Expose billing endpoints that are always accessible (even for expired tenants)
- Implement the subscription guard middleware as a Fastify hook
- Handle Stripe webhooks to keep `subscription_status` in sync (source of truth)
- Support checkout (new subscription) and portal (manage existing subscription)
- Allow plan upgrade/downgrade via Stripe portal or API

**Non-Goals:**
- Payment UI — this is an API-only project
- Supporting any payment processor other than Stripe
- Prorated billing logic — managed entirely by Stripe
- Storing payment history locally — Stripe is the source of truth

## Decisions

### 1. Subscription guard as a Fastify `onRequest` hook

Register a global `onRequest` hook in the server bootstrap. The hook checks `subscription_status` after the auth plugin extracts `tenantId` from the JWT. Routes under `/auth/*`, `/billing/*`, `/payments/stripe/webhook`, and `/health` are exempt via prefix check.

**Why hook over per-route middleware**: billing enforcement is a cross-cutting concern — a hook ensures no route is accidentally left unprotected and avoids repetition.

### 2. Lazy trial expiry evaluation

Instead of a cron job that flips `subscription_status` at midnight, the guard checks `trial_ends_at < now()` on every request and updates to `expired` in place. This avoids a separate background job, keeps writes minimal (only one transition per tenant), and handles time zone edge cases naturally.

**Alternative**: scheduled job every hour. Rejected — adds complexity and still has a window where an expired tenant has unblocked access between runs.

### 3. Stripe Checkout for new subscriptions

`POST /billing/checkout` creates a Stripe Checkout Session with the desired price ID (plan). On success, Stripe redirects to a configurable URL. The webhook then confirms payment and updates `subscription_status = active`.

**Why not Payment Intents directly**: Checkout handles card collection, SCA compliance, and retry logic without custom UI. Simpler and more secure.

### 4. Stripe Customer Portal for self-service management

`POST /billing/portal` creates a Stripe Billing Portal session for the tenant's `stripe_customer_id`. Tenants can cancel, update payment method, or view invoices without calling our API.

### 5. Webhook verification via raw body

Stripe requires the raw request body to verify the `stripe-signature` header. Fastify's `@fastify/rawbody` plugin (or `addContentTypeParser`) captures the raw buffer before JSON parsing. The webhook route is exempt from the subscription guard and uses this raw body for `stripe.webhooks.constructEvent`.

### 6. Plan downgrade is deferred to next billing cycle

`PATCH /billing/plan` for a downgrade calls the Stripe Subscriptions API to schedule a plan change at period end (`proration_behavior: 'none'`, `billing_cycle_anchor: 'unchanged'`). The local `plan` field is only updated when the Stripe `customer.subscription.updated` webhook fires.

**Why**: Business rule — downgrade applies at next cycle. Avoids confusion from immediate access revocation.

## Risks / Trade-offs

- **Webhook replay attacks** → Mitigated by Stripe signature verification and idempotent event handling (check event type before updating)
- **Race condition on lazy expiry update** → Two concurrent requests from the same expired tenant both try to update. Mitigation: use `UPDATE ... WHERE subscription_status = 'trial'` so only one write lands
- **Missing `stripe_customer_id` on checkout** → If the tenant has no Stripe customer yet, create one via `stripe.customers.create` before creating the checkout session
- **Plan mismatch between Stripe and DB** → Webhook is source of truth; if they diverge, the next webhook event self-heals

## Migration Plan

1. Verify tenant schema columns (`stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `plan`, `trial_ends_at`) exist — they are already in the domain model
2. Deploy new code with webhook registered before enabling the Stripe webhook in the Stripe dashboard
3. Register `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in environment

No rollback complexity — billing routes are additive and the guard defaults to passthrough if `tenantId` is absent.

## Open Questions

- Which Stripe Price IDs map to `essential` and `premium` plans? These should be in environment variables (`STRIPE_PRICE_ESSENTIAL`, `STRIPE_PRICE_PREMIUM`).
- What URLs should Stripe redirect to after checkout success/cancel? Probably `SUCCESS_URL` and `CANCEL_URL` env vars.

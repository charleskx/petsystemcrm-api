## Why

The platform receives Stripe lifecycle events and must process them reliably to keep `subscription_status` in sync — without this the guard that blocks expired tenants from the API cannot function correctly. The webhook handler and subscription guard were implemented as part of the billing feature but were never formally specced or tested at the integration level.

## What Changes

- `POST /payments/stripe/webhook` verifies the Stripe signature and handles four event types: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed`
- Subscription guard middleware runs on every authenticated request (except `/auth/*`, `/payments/stripe/webhook`, `/billing/*`, `/health`) and enforces 402 for `expired`/`cancelled` tenants; lazily marks `trial` as `expired` when `trial_ends_at` has passed
- Premium guard middleware blocks essential-plan tenants from premium-only routes (`/suppliers`, `/sales`) with 403
- Integration tests covering webhook signature validation, guard behavior across all subscription states

## Capabilities

### New Capabilities
- `stripe-webhook`: Receive Stripe webhook events at `POST /payments/stripe/webhook`; verify signature; update `subscription_status` and `plan` on the tenant for each supported event type
- `subscription-guard`: Fastify preHandler enforcing subscription-based access control — 402 for expired/cancelled, lazy trial expiry, 403 for essential tenants on premium routes

### Modified Capabilities

## Impact

- Files: `src/interfaces/http/routes/payments.ts`, `src/interfaces/http/middlewares/subscription-guard.ts`, `src/interfaces/http/middlewares/premium-guard.ts`, `src/interfaces/http/routes/billing.test.ts`
- Env vars required: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Webhook must be registered before authenticated routes so Fastify's body parser is set to raw buffer before better-auth consumes it
- No schema migrations needed — all tenant columns (`subscription_status`, `plan`, `stripe_customer_id`, `stripe_subscription_id`) already exist

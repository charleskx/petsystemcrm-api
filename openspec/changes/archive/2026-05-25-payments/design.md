## Context

The Stripe integration is implemented directly in route handlers without a dedicated payment service layer. The webhook route at `POST /payments/stripe/webhook` must be registered before authenticated routes because it overrides Fastify's JSON body parser to receive a raw `Buffer` — required for Stripe signature verification. The subscription guard and premium guard run as Fastify `preHandler` hooks on authenticated routes.

Current implementation:
- `src/interfaces/http/routes/payments.ts` — webhook handler
- `src/interfaces/http/middlewares/subscription-guard.ts` — 402 enforcement + lazy trial expiry
- `src/interfaces/http/middlewares/premium-guard.ts` — 403 enforcement for essential plan
- Tenant columns already exist: `subscription_status`, `plan`, `stripe_customer_id`, `stripe_subscription_id`, `trial_ends_at`

## Goals / Non-Goals

**Goals:**
- Formal spec coverage for the webhook endpoint and guard middleware
- Integration test coverage for webhook signature validation and guard behavior across all subscription states (`trial`, `active`, `past_due`, `expired`, `cancelled`)
- Verify that `/billing/*` and `/payments/stripe/webhook` are always reachable regardless of subscription state

**Non-Goals:**
- Refactoring the webhook handler into a service layer (no business requirement for it yet)
- Support for additional Stripe event types beyond the four already handled
- Idempotency key storage for webhook events (Stripe retries are safe because DB updates are idempotent)

## Decisions

**Raw body parsing scoped to payments route only**
The webhook route uses `addContentTypeParser` to override `application/json` and return a raw `Buffer`. This is registered on the `paymentsRoutes` plugin instance, not globally, so it does not affect other routes. Alternative: register globally and check path — rejected because it would complicate the body type for all other handlers.

**Guard as preHandler hooks, not global middleware**
`subscriptionGuard` and `premiumGuard` are attached per-route via `preHandler` arrays rather than as Fastify hooks. This gives precise control over which routes they apply to without maintaining an allowlist inside the middleware itself. Alternative: global `onRequest` hook with an exclusion list — rejected because the exclusion list would drift as routes are added.

**Lazy trial expiry**
Trial expiry is evaluated on the first authenticated request after `trial_ends_at`. This avoids a scheduled job and keeps the system simple. The DB write happens synchronously inside `subscriptionGuard` before the 402 is returned. The downside is a single extra write on the first post-expiry request — acceptable given low frequency.

**Webhook as source of truth for subscription_status**
The `PATCH /billing/plan` route updates `plan` in the DB immediately for upgrades but defers downgrade changes to the next billing cycle (via Stripe). The webhook then reconciles the actual state. This means there is a window where the local `plan` column could be ahead of Stripe (upgrade case) — acceptable because Stripe will confirm via `customer.subscription.updated`.

## Risks / Trade-offs

[Webhook replay / ordering] Stripe may deliver events out of order. `customer.subscription.updated` may arrive before `checkout.session.completed`. The current implementation is last-write-wins per event type, which is idempotent for status updates but could briefly show a stale state. → Mitigation: acceptable for MVP; no user-visible operation depends on strict ordering.

[Missing STRIPE_WEBHOOK_SECRET in dev] If the env var is absent, the webhook returns 500 instead of 400. → Mitigation: the guard in `paymentsRoutes` returns 500 with a clear message; developers should set the var via Stripe CLI for local testing.

[premiumGuard not called on subscription-guard-exempt routes] `/billing/*` bypasses `subscriptionGuard` but also bypasses `premiumGuard`. This is intentional — billing routes must be accessible to expired and essential-plan tenants. → No mitigation needed; this is correct behavior.

## Migration Plan

No schema migrations required. The implementation is already deployed to the codebase as untracked files. The change formalises specs and tests for the existing code; no deployment steps beyond committing.

## Open Questions

- Should `past_due` tenants eventually be blocked (402) after a grace period? Currently they retain full access indefinitely. This is a business decision deferred to a future billing cycle change.

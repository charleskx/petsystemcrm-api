## Why

The platform needs a billing system to monetize tenants after their 14-day trial ends. Without it, there's no way for tenants to subscribe, and all premium features remain locked once the trial expires. This is the last major module needed before the platform can be released.

## What Changes

- New `/billing` routes: subscription status, Stripe checkout session, Stripe customer portal, plan upgrade/downgrade
- New `/payments/stripe/webhook` route to receive Stripe events and keep `subscription_status` in sync
- Subscription guard middleware reads `subscription_status` and `plan` to enforce access rules
- Lazy trial expiry evaluation: if `trial_ends_at < now`, mark status as `expired` on first authenticated request

## Capabilities

### New Capabilities
- `billing-subscription`: View current subscription status, plan, and trial expiry; create Stripe checkout session; open Stripe customer portal; upgrade/downgrade plan
- `stripe-webhook`: Receive and verify Stripe webhook events; update `subscription_status` and `plan` on the tenant accordingly
- `subscription-guard`: Middleware that enforces subscription-based access control on every authenticated request (blocks expired/cancelled tenants with 402; blocks essential tenants from premium routes with 403)

### Modified Capabilities

## Impact

- New routes: `GET /billing/subscription`, `POST /billing/checkout`, `POST /billing/portal`, `PATCH /billing/plan`, `POST /payments/stripe/webhook`
- New middleware: `src/interfaces/http/middlewares/subscription-guard.ts`
- Tenant schema gains: `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `plan`, `trial_ends_at`
- Dependencies: `stripe` npm package
- Middleware must be registered globally but exempt `/auth/*`, `/payments/stripe/webhook`, `/billing/*`, `/health`

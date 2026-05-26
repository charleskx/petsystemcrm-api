## 1. Dependencies & Configuration

- [x] 1.1 Install `stripe` npm package via pnpm
- [x] 1.2 Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ESSENTIAL`, `STRIPE_PRICE_PREMIUM`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL` to `.env.example` and `src/main/config/`

## 2. Subscription Guard Middleware

- [x] 2.1 Create `src/interfaces/http/middlewares/subscription-guard.ts` — `onRequest` hook that reads `tenantId` from the JWT session
- [x] 2.2 Implement exempt-route check (skip guard for `/auth/`, `/billing/`, `/payments/stripe/webhook`, `/health`)
- [x] 2.3 Implement lazy trial expiry: if `subscription_status = trial` and `trial_ends_at < now()`, run `UPDATE tenants SET subscription_status = 'expired' WHERE id = ? AND subscription_status = 'trial'`
- [x] 2.4 Block `expired` and `cancelled` tenants with `402 Payment Required` and message `"Assinatura expirada. Acesse /billing para renovar."`
- [x] 2.5 Block `essential` plan tenants from `/suppliers` and `/sales` routes with `403 Forbidden` and message `"Esta funcionalidade requer o plano Premium."`
- [x] 2.6 Allow `trial` (not expired) and `past_due` tenants full access
- [x] 2.7 Register the middleware as a global `onRequest` hook in `src/main/server.ts`

## 3. Billing Routes

- [x] 3.1 Create `src/interfaces/http/routes/billing.ts` with a Fastify plugin
- [x] 3.2 Implement `GET /billing/subscription` — query tenant fields (`subscriptionStatus`, `plan`, `trialEndsAt`, `stripeSubscriptionId`) and return them
- [x] 3.3 Implement `POST /billing/checkout` — validate `plan` body, create Stripe customer if missing, persist `stripeCustomerId`, create Stripe Checkout Session, return `{ url }`
- [x] 3.4 Implement `POST /billing/portal` — guard that `stripeCustomerId` exists (400 if not), create Stripe Billing Portal session, return `{ url }`
- [x] 3.5 Implement `PATCH /billing/plan` — validate `plan` body, guard that `stripeSubscriptionId` exists (400 if not), upgrade immediately or schedule downgrade at period end via Stripe API
- [x] 3.6 Register billing routes in `src/main/server.ts` under `/billing` prefix

## 4. Stripe Webhook Route

- [x] 4.1 Create `src/interfaces/http/routes/payments.ts` with the `/payments/stripe/webhook` `POST` endpoint
- [x] 4.2 Configure raw body parsing for this route using `addContentTypeParser` so Stripe signature verification receives the raw buffer
- [x] 4.3 Implement signature verification via `stripe.webhooks.constructEvent` — return `400` on failure
- [x] 4.4 Handle `checkout.session.completed` — map price ID to plan, set `subscription_status = active`, persist `stripeSubscriptionId` and `plan`
- [x] 4.5 Handle `customer.subscription.updated` — update `subscription_status` and `plan` from the Stripe subscription object
- [x] 4.6 Handle `customer.subscription.deleted` — set `subscription_status = cancelled`
- [x] 4.7 Handle `invoice.payment_failed` — set `subscription_status = past_due`
- [x] 4.8 Register payments route in `src/main/server.ts` under `/payments` prefix

## 5. Integration Tests

- [x] 5.1 Create `src/interfaces/http/routes/billing.test.ts` with tests for all four billing endpoints
- [x] 5.2 Test subscription guard: expired tenant gets 402, essential tenant gets 403 on premium route, active trial tenant passes
- [x] 5.3 Test webhook: valid signature processes events, invalid signature returns 400

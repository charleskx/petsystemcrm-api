## 1. Spec Registration

- [x] 1.1 Copy `specs/stripe-webhook/spec.md` to `openspec/specs/stripe-webhook/spec.md`
- [x] 1.2 Copy `specs/subscription-guard/spec.md` to `openspec/specs/subscription-guard/spec.md`

## 2. Implementation Verification

- [x] 2.1 Verify `src/interfaces/http/routes/payments.ts` handles all four event types per spec: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [x] 2.2 Verify `src/interfaces/http/middlewares/subscription-guard.ts` lazily marks trial as expired and returns 402 for `expired`/`cancelled` tenants
- [x] 2.3 Verify `src/interfaces/http/middlewares/premium-guard.ts` returns 403 for `active` + `essential` tenants on `/suppliers` and `/sales`; verify trial tenants bypass the premium guard
- [x] 2.4 Verify `POST /payments/stripe/webhook` is registered before authenticated routes in `src/main/server.ts` so the raw body parser override does not conflict with other routes

## 3. Integration Tests

- [x] 3.1 Add test for `POST /payments/stripe/webhook` — confirm 400 on missing `stripe-signature`
- [x] 3.2 Add test for `POST /payments/stripe/webhook` — confirm 400 on invalid `stripe-signature`
- [x] 3.3 Add test for subscription guard — expired tenant gets 402 on operational route
- [x] 3.4 Add test for subscription guard — cancelled tenant gets 402 on operational route
- [x] 3.5 Add test for subscription guard — `past_due` tenant retains full access (200)
- [x] 3.6 Add test for subscription guard — active trial gets 200 on premium route (`/suppliers`)
- [x] 3.7 Add test for premium guard — essential + active plan gets 403 on `/suppliers`
- [x] 3.8 Add test for premium guard — essential + active plan gets 403 on `/sales`
- [x] 3.9 Verify `GET /billing/subscription` returns 200 for expired tenant (guard bypass)

## 4. Environment & Configuration

- [x] 4.1 Confirm `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ESSENTIAL`, `STRIPE_PRICE_PREMIUM`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL` are documented in `.env.example`

## 5. Commit

- [x] 5.1 Stage and commit `src/interfaces/http/routes/billing.ts`, `payments.ts`, `billing.test.ts`
- [x] 5.2 Stage and commit `src/interfaces/http/middlewares/subscription-guard.ts`, `premium-guard.ts`
- [x] 5.3 Stage and commit `src/main/config/env.ts`, `src/main/server.ts` changes

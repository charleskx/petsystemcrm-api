## Why

Authorization is currently enforced via scattered `if (request.role === "collaborator")` and `if (request.role !== "owner")` guards inside every route handler — 20+ inline checks across 9 files with no single source of truth. Adding or changing a permission requires hunting through every route, making it error-prone and hard to audit.

## What Changes

- Introduce CASL.js (`@casl/ability`) as the authorization layer
- Define a central `defineAbilityFor(role)` factory that encodes all permissions for `owner`, `financial`, and `collaborator`
- Replace all inline `if (request.role === ...)` checks in routes with `ability.cannot(action, subject)` calls
- Add a `request.ability` property on the Fastify request type (via `authenticate` middleware decoration)
- Remove the redundant per-route role comparisons that are now encoded in the ability definition

## Capabilities

### New Capabilities

- `casl-ability-definition`: Central CASL ability factory mapping roles to allowed actions/subjects across all modules

### Modified Capabilities

- `member-management`: Permission check for invite/update-role/remove now via ability instead of `request.role !== "owner"`
- `service-management`: Create/update/delete/pricing-write guards replaced with ability checks
- `appointment-management`: Update/status-change/delete guards replaced with ability checks
- `product-management`: Create/update/delete and category-write guards replaced with ability checks
- `stock-management`: Guards replaced with ability checks
- `supplier-management`: Create/update/delete guards replaced with ability checks
- `sale-management`: Create and status-change guards replaced with ability checks
- `work-schedule-management`: PUT schedule and holiday write guards replaced with ability checks
- `tenant-management`: Update-tenant and upload-logo guards replaced with ability checks

## Impact

- New dependency: `@casl/ability`
- Modified files: `src/infra/auth/ability.ts` (new), `src/interfaces/http/middlewares/authenticate.ts`, all 9 route files with inline role checks
- No API contract changes — HTTP status codes remain the same (403 for unauthorized)
- No database changes
- Tests remain green — behavior is identical, only the implementation mechanism changes

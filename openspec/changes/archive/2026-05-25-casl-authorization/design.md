## Context

The API has three roles per tenant: `owner`, `financial`, `collaborator`. Authorization is currently enforced inline in every route handler: `if (request.role === "collaborator") return reply.status(403)...`. This pattern is repeated 20+ times across 9 route files. There is no central place to read or change what each role can do.

CASL.js is already planned in the stack (CLAUDE.md) as the authorization layer. The dependency just hasn't been wired in yet.

## Goals / Non-Goals

**Goals:**
- Define all role permissions in one place (`src/infra/auth/ability.ts`)
- Decorate `request.ability` in the `authenticate` middleware so routes can call `ability.cannot(action, subject)`
- Replace every inline `if (request.role === ...)` guard with a CASL ability check
- Keep HTTP response codes identical (403 for forbidden)

**Non-Goals:**
- Attribute-level permissions (e.g., "financial can read only their own sales") — current role model is action/subject only
- Field-level masking or data filtering based on role
- Changing any API contract or adding new endpoints

## Decisions

### Use `@casl/ability` with plain `createMongoAbility` (no ORM integration)

Alternatives considered:
- `@casl/prisma` / `@casl/drizzle`: Not needed — we don't need row-level filtering in DB queries. Role restrictions are at the action level, not the row level.
- Manual permission map (plain object): Simpler, but gives up the `ability.cannot()` API, TypeScript inference, and composability.

Decision: `createMongoAbility` from `@casl/ability` is the lightest integration that gives a typed `ability.cannot(action, subject)` API without committing to ORM coupling.

### Action/subject model

Actions: `create`, `read`, `update`, `delete`, `manage` (CASL wildcard for all)  
Subjects: `Tenant`, `Member`, `Client`, `Pet`, `Service`, `ServicePricing`, `WorkSchedule`, `Holiday`, `Appointment`, `Product`, `ProductCategory`, `StockMovement`, `Supplier`, `Sale`

Permission matrix:

| Role | Permissions |
|------|------------|
| `owner` | `manage all` (full access) |
| `financial` | `read all`, `create`/`update`/`delete` Sale, `create`/`update`/`delete` StockMovement, `read`/`create`/`update`/`delete` Appointment |
| `collaborator` | `read all`, `create`/`update`/`delete` Appointment, `create`/`update` StockMovement |

This matrix is derived by inverting the existing inline guards throughout the codebase.

### Decorate ability on request in `authenticate` middleware

After resolving `tenantId` and `role`, call `defineAbilityFor(role)` and attach the result as `request.ability`. Routes then call `request.ability.cannot(action, subject)`.

Alternative: pass ability via closure in a Fastify hook — rejected because it complicates the preHandler chain and makes testing harder.

### Route guards call `ability.cannot()` directly (no separate guard middleware)

Keeps each route's authorization visible at the call site. A shared `requireAbility(action, subject)` preHandler factory is offered as an optional helper but not mandated.

## Risks / Trade-offs

- [Risk] Permission matrix inferred from scattered inline guards may have gaps → Mitigation: cross-reference every `request.role` occurrence in all route files before writing the matrix; existing tests act as regression net
- [Risk] CASL `manage all` for owner might be over-broad if fine-grained restrictions are added later → Mitigation: owner is the tenant administrator by design; if restriction is ever needed, it can be expressed as `cannot` rules layered on top
- [Risk] Breaking existing tests if any guard is mis-translated → Mitigation: run full 275-test suite after each file is refactored; commit per module

## Migration Plan

1. Install `@casl/ability`
2. Create `src/infra/auth/ability.ts` with `defineAbilityFor`
3. Extend Fastify types with `ability` on request
4. Decorate `request.ability` in `authenticate` middleware
5. Refactor routes one module at a time (members → tenants → schedule → services → appointments → products → stock → suppliers → sales)
6. Run tests after each module; fix before moving on
7. No DB migration needed; no rollback risk (pure TypeScript refactor)

## 1. Setup

- [x] 1.1 Install `@casl/ability` via `pnpm add @casl/ability`
- [x] 1.2 Create `src/infra/auth/ability.ts` with `defineAbilityFor(role)` factory covering the full permission matrix (owner → manage all; financial → read all + write Sale/StockMovement/Appointment; collaborator → read all + write Appointment + create/update StockMovement)
- [x] 1.3 Add `AppAbility` type export from `ability.ts` for use in type declarations
- [x] 1.4 Extend Fastify types in `src/interfaces/http/types.d.ts` (or existing type augmentation file) to add `ability: AppAbility` to `FastifyRequest`
- [x] 1.5 Decorate `request.ability = defineAbilityFor(request.role)` in `src/interfaces/http/middlewares/authenticate.ts` after role is resolved

## 2. Route Refactoring — Members & Tenants

- [x] 2.1 Replace `request.role !== "owner"` guard in `POST /tenants/:id/members/invite` with `request.ability.cannot("create", "Member")`
- [x] 2.2 Replace `request.role !== "owner"` guard in `PATCH /tenants/:id/members/:userId` with `request.ability.cannot("update", "Member")`
- [x] 2.3 Replace `request.role !== "owner"` guard in `DELETE /tenants/:id/members/:userId` with `request.ability.cannot("delete", "Member")`
- [x] 2.4 Replace `request.role !== "owner"` guard in `PATCH /tenants/:id` with `request.ability.cannot("update", "Tenant")`
- [x] 2.5 Replace `request.role !== "owner"` guard in `POST /tenants/:id/logo` with `request.ability.cannot("update", "Tenant")`

## 3. Route Refactoring — Schedule

- [x] 3.1 Replace `request.role === "collaborator"` guard in `PUT /schedule` with `request.ability.cannot("update", "WorkSchedule")`
- [x] 3.2 Replace `request.role === "collaborator"` guard in `POST /schedule/holidays` with `request.ability.cannot("create", "Holiday")`
- [x] 3.3 Replace `request.role === "collaborator"` guard in `DELETE /schedule/holidays/:id` with `request.ability.cannot("delete", "Holiday")`

## 4. Route Refactoring — Services

- [x] 4.1 Replace `request.role === "collaborator"` guard in `POST /services` with `request.ability.cannot("create", "Service")`
- [x] 4.2 Replace `request.role === "collaborator"` guard in `PATCH /services/:id` with `request.ability.cannot("update", "Service")`
- [x] 4.3 Replace `request.role === "collaborator"` guard in `DELETE /services/:id` with `request.ability.cannot("delete", "Service")`
- [x] 4.4 Replace `request.role === "collaborator"` guard in `PUT /services/:id/pricing` with `request.ability.cannot("update", "ServicePricing")`

## 5. Route Refactoring — Appointments

- [x] 5.1 Replace `request.role === "collaborator"` guard in `PATCH /appointments/:id` with `request.ability.cannot("update", "Appointment")`
- [x] 5.2 Replace `request.role === "collaborator"` guard in `PATCH /appointments/:id/status` with `request.ability.cannot("update", "Appointment")`
- [x] 5.3 Replace `request.role === "collaborator"` guard in `DELETE /appointments/:id` with `request.ability.cannot("delete", "Appointment")`

## 6. Route Refactoring — Products & Categories

- [x] 6.1 Replace `request.role === "collaborator"` guard in `POST /products` with `request.ability.cannot("create", "Product")`
- [x] 6.2 Replace `request.role === "collaborator"` guard in `PATCH /products/:id` with `request.ability.cannot("update", "Product")`
- [x] 6.3 Replace `request.role === "collaborator"` guard in `DELETE /products/:id` with `request.ability.cannot("delete", "Product")`
- [x] 6.4 Replace `request.role === "collaborator"` guard in `POST /products/categories` with `request.ability.cannot("create", "ProductCategory")`
- [x] 6.5 Replace `request.role === "collaborator"` guard in `PATCH /products/categories/:id` with `request.ability.cannot("update", "ProductCategory")`
- [x] 6.6 Replace `request.role !== "owner"` guard in `DELETE /products/categories/:id` with `request.ability.cannot("delete", "ProductCategory")`

## 7. Route Refactoring — Stock, Suppliers & Sales

- [x] 7.1 Verify existing stock route guards and replace with `request.ability.cannot("create", "StockMovement")` where applicable
- [x] 7.2 Replace `request.role === "financial"` guard in `POST /suppliers` with `request.ability.cannot("create", "Supplier")`
- [x] 7.3 Replace `request.role === "financial"` guard in `PATCH /suppliers/:id` with `request.ability.cannot("update", "Supplier")`
- [x] 7.4 Replace `request.role === "financial"` guard in `DELETE /suppliers/:id` with `request.ability.cannot("delete", "Supplier")`
- [x] 7.5 Replace `request.role === "collaborator"` guard in `POST /sales` with `request.ability.cannot("create", "Sale")`
- [x] 7.6 Replace `request.role === "collaborator"` guard in `PATCH /sales/:id/status` with `request.ability.cannot("update", "Sale")`

## 8. Verification

- [x] 8.1 Run full test suite (`make test`) — all 275 tests must pass
- [x] 8.2 Confirm no `request.role` comparisons remain in any route file (`grep -r "request\.role" src/interfaces/http/routes/`)
- [x] 8.3 Run `make typecheck` — no TypeScript errors

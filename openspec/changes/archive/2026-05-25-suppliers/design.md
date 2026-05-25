## Context

The `suppliers` table already exists in the Drizzle schema (with all required columns) and is already referenced by the `products` table via `supplier_id`. The `create-product` and `update-product` use cases already validate that a `supplierId` belongs to the same tenant before linking it. What is missing is the supplier management surface itself: domain entity, use cases, and HTTP routes.

The project follows a Clean Architecture pattern: domain entities → application use cases → infra (Drizzle queries inlined in use cases, no repository layer) → HTTP routes. All similar modules (clients, products, services) follow this pattern.

Suppliers are a **premium-only** resource, enforced by the `subscriptionGuard` middleware at the route level — no additional middleware needed.

## Goals / Non-Goals

**Goals:**
- CRUD endpoints for suppliers under `/suppliers`
- Soft-delete (`active = false`) to preserve referential integrity with existing products
- Pagination and `active` filter on list endpoint
- Role-based access: `owner` and `collaborator` full CRUD; `financial` read-only
- Document/CPF/CNPJ validation on create and update (consistent with client module)

**Non-Goals:**
- Supplier-level reporting or analytics
- Linking suppliers directly to stock movements (movements reference products, which reference suppliers)
- Any changes to the `products` schema or use cases (FK already in place)

## Decisions

**Soft-delete instead of hard-delete**
Suppliers can be referenced by existing products. Hard-deleting would either cascade-nullify the FK (losing data) or block deletion entirely. Soft-delete (`active = false`) preserves the relationship and mirrors how products are deactivated in this project. The list endpoint filters `active = true` by default but accepts `?active=false` to show inactive ones.

**Role authorization at the route handler level**
The project has no CASL integration currently — role checks are done inline in route handlers by reading `request.role`. `financial` role gets 403 on write operations (POST, PATCH, DELETE). This is the same pattern used in other modules.

**No dedicated domain entity class**
Other modules like `product` use a plain TypeScript interface (`ProductProps`) rather than a class. Suppliers will follow the same pattern: a `SupplierProps` interface in `src/domain/supplier/supplier.entity.ts`.

**Validation of document (CPF/CNPJ)**
The `document` field is optional on suppliers, but when provided it must pass digit-verification. This mirrors the client module's behavior and rule #9.

## Risks / Trade-offs

- **Soft-delete complexity**: The list endpoint must default to `active = true`. Callers querying by `supplierId` in the product module don't check `active`, so a deactivated supplier can still be referenced by new products — acceptable since the validation only checks existence and tenant ownership, not active status. This is a deliberate trade-off to avoid blocking product edits when a supplier is soft-deleted.

- **No migration needed**: The table already exists and migrations are up to date. If a schema change is ever needed later, a new migration must be generated with `make migrate-gen`.

## Migration Plan

No database migration required — table already exists. Steps:
1. Add domain entity (`src/domain/supplier/supplier.entity.ts`)
2. Add use cases in `src/application/supplier/`
3. Add route file `src/interfaces/http/routes/suppliers.ts`
4. Register route in server entry point
5. Run typecheck and tests

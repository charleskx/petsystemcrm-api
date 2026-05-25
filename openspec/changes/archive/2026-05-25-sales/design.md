## Context

The project already implements the `product-management` and `stock-management` modules with a `createStockMovement` use case that handles transactional stock deduction. The `suppliers` route serves as the canonical pattern for premium-only modules: it applies the `[authenticate, subscriptionGuard, premiumGuard]` preHandler chain and enforces role-based restrictions inline.

All modules follow a flat, function-based use-case pattern (no class repositories), direct Drizzle ORM queries from within use cases, and Fastify route files that own both Zod validation and error mapping.

## Goals / Non-Goals

**Goals:**
- Implement `Sale` and `SaleItem` DB schema and domain entities
- Expose `GET /sales`, `POST /sales`, `GET /sales/:id`, `PATCH /sales/:id/status`
- Automatically create a `StockMovement type=out` (via the existing `createStockMovement`) for each item when a sale is created — within the same DB transaction
- Restrict to premium plan; allow `owner` and `financial` to create/update; `collaborator` read-only
- Multi-tenant isolation on every query

**Non-Goals:**
- Returns / refunds (out of scope for v1)
- PDF receipts or invoice generation
- Pagination cursor (offset/limit is sufficient, matching the existing pattern)
- Online channel integration (the `channel` field is stored but no external system is wired)

## Decisions

### 1. Stock deduction inside CreateSaleUseCase transaction

The `createStockMovement` use case already runs its own `db.transaction`. However, for a sale with multiple items, each item would get its own independent transaction, meaning a partial failure on item 3 would leave items 1–2 already committed.

**Decision**: `CreateSaleUseCase` opens a single top-level `db.transaction` that inserts `Sale`, all `SaleItem` rows, updates each product's quantity, and inserts all `StockMovement` rows inline — without delegating to `createStockMovement`. This guarantees atomicity across the whole sale.

**Alternative considered**: Call `createStockMovement` per item — rejected because Drizzle does not support nested transactions in the standard sense; each call would start and commit its own transaction independently.

### 2. Role permissions

Following the existing `suppliers` pattern:
- `collaborator` → `403 Forbidden` on `POST /sales` and `PATCH /sales/:id/status` (read-only access)
- `owner` and `financial` → full access

**Rationale**: Financial reporting is within the `financial` role's remit; sales creation and status updates affect cash flow, so `financial` must be allowed.

### 3. Sale status transitions

Valid transitions: `pending → paid`, `pending → cancelled`. A `paid` or `cancelled` sale cannot be changed. Enforced in `UpdateSaleStatusUseCase` with a domain error.

### 4. No separate `SaleRepository` class

The project uses plain async functions per use case, not repository classes. We follow the same pattern.

### 5. `total_amount` computed at creation

`total_amount` is the sum of `(quantity × unit_price)` for all items, computed in `CreateSaleUseCase` and stored denormalized for fast listing/reporting. The `sale_price` of each product at the time of sale is captured in `SaleItem.unit_price`.

## Risks / Trade-offs

- **Stale price on re-read**: `unit_price` in `SaleItem` is a snapshot. If a product's `sale_price` changes later, the historical sale reflects the correct price at time of sale — this is intentional.
- **Inline stock deduction**: Skipping `createStockMovement` means stock logic is partially duplicated. Mitigation: extract shared validation helpers (product active check, insufficient stock check) if they diverge.
- **No refund path**: Cancelling a sale does NOT re-credit stock in v1. This is a known limitation to address in a future change.

## Migration Plan

1. Add `src/infra/database/drizzle/schema/sales.ts` with `sales` and `sale_items` tables
2. Export from `schema/index.ts`
3. Run `make migrate-gen` then `make migrate`
4. Implement use cases, route, and register route in server
5. No data migration needed (new tables)

## Open Questions

- Should `GET /sales` support filtering by `client_id`, `status`, and date range? (Assumed yes for usability; mirrors the `appointments` list filter pattern.)
- Should `collaborator` see all sales or only ones they created? (Assumed all sales in the tenant, read-only — consistent with how `appointments` works.)

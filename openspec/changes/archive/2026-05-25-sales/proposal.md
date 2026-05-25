## Why

The sales module is the point-of-sale (PDV) feature that enables premium-plan petshops to record product sales, automatically debit stock, and track revenue. Without it, the product and stock management modules have no way to capture outbound sales transactions.

## What Changes

- Introduce `Sale` and `SaleItem` domain entities and their database tables
- Expose four REST endpoints under `/sales` (list, create, detail, update status)
- On sale creation, automatically generate a `StockMovement` of type `out` for each item sold
- Restrict all `/sales` routes to tenants with the `premium` plan (enforced by `subscription-guard`)
- Apply multi-tenant filtering (`tenant_id`) on every query

## Capabilities

### New Capabilities

- `sale-management`: Full lifecycle management of product sales — listing, recording a new sale (with automatic stock deduction), viewing a sale's detail, and updating its payment status.

### Modified Capabilities

- `stock-management`: When a sale is created, stock is automatically debited via `StockMovement type=out` referencing the sale ID. No existing endpoint changes, but a new programmatic trigger is added.

## Impact

- **New DB tables**: `sales`, `sale_items`
- **New DB schema file**: `src/infra/database/drizzle/schema/sales.ts`
- **New repository**: `src/infra/database/repositories/sale.repository.ts`
- **New domain entities**: `Sale`, `SaleItem` in `src/domain/`
- **New use cases**: `CreateSaleUseCase`, `ListSalesUseCase`, `GetSaleUseCase`, `UpdateSaleStatusUseCase` in `src/application/`
- **New HTTP layer**: route file, controller, Zod schemas under `src/interfaces/http/`
- **Existing module touched**: `StockMovement` creation is triggered from within `CreateSaleUseCase`
- **Authorization**: CASL ability check — premium plan only; `owner` and `financial` roles can manage sales; `collaborator` read-only or blocked (TBD by design)
- **No breaking changes**

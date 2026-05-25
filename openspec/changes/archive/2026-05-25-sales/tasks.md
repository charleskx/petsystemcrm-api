## 1. Database Schema

- [x] 1.1 Create `src/infra/database/drizzle/schema/sales.ts` with `sales` and `sale_items` table definitions (columns: per domain model in CLAUDE.md)
- [x] 1.2 Export `sales` and `saleItems` from `src/infra/database/drizzle/schema/index.ts`
- [x] 1.3 Run `make migrate-gen` to generate the migration file
- [x] 1.4 Run `make migrate` to apply the migration

## 2. Domain Entities

- [x] 2.1 Create `src/domain/sale/sale.entity.ts` with `SaleProps`, `SaleStatus`, `SaleChannel`, and `SalePaymentMethod` types
- [x] 2.2 Create `src/domain/sale/sale-item.entity.ts` with `SaleItemProps` type

## 3. Use Cases

- [x] 3.1 Create `src/application/sale/create-sale.use-case.ts` — opens a single DB transaction that inserts `Sale`, all `SaleItem` rows, debits stock (inline, not via `createStockMovement`), creates `StockMovement` records with `referenceId = saleId`, computes and stores `total_amount`
- [x] 3.2 Create `src/application/sale/list-sales.use-case.ts` — paginated list filtered by `tenantId`, optional `clientId`, `status`, `from`/`to` date range; ordered by `created_at` DESC
- [x] 3.3 Create `src/application/sale/get-sale.use-case.ts` — fetches sale with its items; returns `404` if not found or belongs to another tenant
- [x] 3.4 Create `src/application/sale/update-sale-status.use-case.ts` — validates transition (`pending → paid` or `pending → cancelled`); returns `409` on invalid transition

## 4. HTTP Layer

- [x] 4.1 Create `src/interfaces/http/routes/sales.ts` with `salesRoutes` function and all four endpoints (`GET /sales`, `POST /sales`, `GET /sales/:id`, `PATCH /sales/:id/status`) using `[authenticate, subscriptionGuard, premiumGuard]` preHandler
- [x] 4.2 Add `collaborator` role check on `POST /sales` and `PATCH /sales/:id/status` (return `403`)
- [x] 4.3 Register `salesRoutes` in `src/main/server.ts` (or wherever routes are registered)

## 5. Validation & Error Mapping

- [x] 5.1 Define Zod schemas in the route file: `createSaleBody` (items array with min 1 item, paymentMethod enum, optional clientId and channel), `updateSaleStatusBody` (status enum), `listSalesQuery` (filters + pagination)
- [x] 5.2 Map domain errors to HTTP responses: `ProductNotFoundError` / `ProductInactiveError` → `422`, `InsufficientStockError` → `422`, `SaleNotFoundError` → `404`, `InvalidSaleStatusTransitionError` → `409`

## 6. Tests

- [x] 6.1 Create `src/interfaces/http/routes/sales.test.ts` with integration tests covering: successful sale creation (stock debited), insufficient stock, collaborator blocked, expired subscription, list with filters, get by id (own vs other tenant), valid and invalid status transitions

## Context

The PetSystem CRM already handles clients, pets, appointments, and scheduling. Products, categories, and stock are the next pillar — they allow petshops to manage their retail shelf, track inventory, and surface operational alerts (low stock, near expiry). This module is available on both `essential` and `premium` plans.

The domain entities are: `Product`, `ProductCategory`, `StockMovement`. Suppliers (`Supplier`) already exist in the domain (premium-only) and are an optional FK on `Product`. The `Sale` module (premium-only, future) will create `StockMovement type=out` entries automatically; that path is out of scope here.

## Goals / Non-Goals

**Goals:**
- Full CRUD for products (with soft delete via `active` flag)
- Full CRUD for product categories
- Manual stock movement recording (`in` / `out`)
- Movement history list
- Low-stock and near-expiry alert endpoint
- `sale_price` auto-computed server-side from `cost_price` and `margin_percent`
- Tenant isolation on all queries

**Non-Goals:**
- Automatic stock debit from sales (belongs to the Sales module)
- Barcode scanning or image upload for products
- Multi-warehouse / location tracking

## Decisions

### 1. Soft delete for products (`active` flag)
Products are inactivated (`DELETE /products/:id` sets `active = false`) rather than physically deleted. Rationale: products appear as line items in historical stock movements and (future) sales; hard deletion would orphan those records. `GET /products` filters `active = true` by default; an `?active=false` query param exposes inactive items to owners if needed.

**Alternative considered:** Hard delete with FK `ON DELETE SET NULL` on movements — rejected because it destroys audit trail and complicates reporting.

### 2. `sale_price` auto-computed on write
`sale_price` is NOT accepted as a direct input. The API computes it as `round(cost_price * (1 + margin_percent / 100), 2)` whenever a product is created or `cost_price`/`margin_percent` is updated. The stored `sale_price` is the source of truth for pricing at point-of-sale.

**Alternative considered:** Accept `sale_price` directly and validate it matches formula — rejected because it opens drift between stored price and margin, causing confusion.

### 3. Stock movements are append-only
`StockMovement` records are never updated or deleted. Corrections are done by a counter-movement (`type=in` to offset an erroneous `out`, or vice versa). This preserves a complete audit trail.

**Alternative considered:** Allow deletion of erroneous movements — rejected because it undermines inventory auditability.

### 4. Alert thresholds are fixed business rules
Low-stock alert: `quantity <= min_quantity`. Near-expiry alert: `expiry_date <= today + 30 days`. These thresholds are not configurable per tenant in this iteration. Future enhancement could make them tenant-level settings.

### 5. Category and supplier as optional FKs
Both `category_id` and `supplier_id` are nullable on `Product`. Supplier is premium-only but the product table is available on essential; allowing a null supplier avoids plan-gating at the schema level. When essential-plan tenants have no suppliers, they simply leave it null.

## Risks / Trade-offs

- **Computed `sale_price` drift on plan changes** → If the formula changes in a future version, existing stored prices will not be retroactively recalculated. Mitigated by treating `sale_price` as a snapshot price; a background job can be added later to re-sync.
- **No stock-level locking** → Concurrent stock movement writes could race. Mitigation: wrap each movement in a DB transaction that reads current `quantity` and writes atomically using a `UPDATE products SET quantity = quantity + $delta WHERE id = $id` pattern.
- **Alerts endpoint is full-scan** → `GET /products/alerts` scans all active products for the tenant. Acceptable for petshop scale (hundreds of products). Add index on `(tenant_id, quantity, min_quantity)` and `(tenant_id, expiry_date)` if performance degrades.

## Migration Plan

1. Generate Drizzle migration for `product_categories`, `products`, `stock_movements` tables.
2. No existing data to migrate.
3. Rollback: drop the three tables (no FK constraints from existing tables point to them yet).

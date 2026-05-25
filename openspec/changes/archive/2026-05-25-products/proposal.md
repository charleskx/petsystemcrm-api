## Why

The PetSystem CRM needs product and inventory management to complete the core operational loop for petshops — they need to track their retail products, manage stock levels, and receive alerts when items run low or near expiry.

## What Changes

- Introduce full CRUD for products with barcode, SKU, brand, unit type, cost/margin/sale price fields
- Introduce product categories CRUD
- Introduce stock movement tracking (manual entries and out movements)
- Introduce product alerts for low stock and near-expiry items
- Available to both essential and premium plans

## Capabilities

### New Capabilities

- `product-management`: Create, read, update, and soft-delete products with pricing, supplier linkage, category linkage, and barcode/SKU support
- `product-category-management`: Create, read, update, and delete product categories
- `stock-management`: Record manual stock movements (in/out), list movement history, and surface low-stock / near-expiry alerts

### Modified Capabilities

_None_

## Impact

- New routes: `GET|POST /products`, `GET|PATCH|DELETE /products/:id`, `GET /products/alerts`, `GET|POST|PATCH|DELETE /products/categories/:id`, `POST /stock/movements`, `GET /stock/movements`
- New domain entities: `Product`, `ProductCategory`, `StockMovement`
- New Drizzle schema tables: `products`, `product_categories`, `stock_movements`
- Subscription guard must allow these routes for both `essential` and `premium` plans
- `sale_price` is auto-computed from `cost_price` and `margin_percent` on write
- Depends on existing `Supplier` entity (premium-only suppliers can optionally be linked to products; product creation is still available on essential plan — supplier linkage is an optional FK)

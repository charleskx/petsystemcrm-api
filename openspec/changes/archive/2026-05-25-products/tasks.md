## 1. Database Schema

- [x] 1.1 Create Drizzle schema for `product_categories` table (`id`, `tenant_id`, `name`)
- [x] 1.2 Create Drizzle schema for `products` table (`id`, `tenant_id`, `supplier_id?`, `category_id?`, `name`, `barcode?`, `sku?`, `brand?`, `unit_type`, `cost_price`, `margin_percent`, `sale_price`, `quantity`, `min_quantity`, `expiry_date?`, `active`, `created_at`)
- [x] 1.3 Create Drizzle schema for `stock_movements` table (`id`, `tenant_id`, `product_id`, `type`, `quantity`, `reason`, `reference_id?`, `created_at`)
- [x] 1.4 Generate and run migration for the three new tables
- [x] 1.5 Add indexes: `(tenant_id, active)` on products; `(tenant_id, quantity, min_quantity)` on products; `(tenant_id, expiry_date)` on products; `(tenant_id, product_id)` on stock_movements

## 2. Domain & Repository Interfaces

- [x] 2.1 Define domain entities: `ProductCategory`, `Product`, `StockMovement`
- [x] 2.2 Define repository interfaces: `IProductCategoryRepository`, `IProductRepository`, `IStockMovementRepository`

## 3. Infrastructure — Repositories

- [x] 3.1 Implement `DrizzleProductCategoryRepository` (create, findById, findByName, listByTenant, update, delete)
- [x] 3.2 Implement `DrizzleProductRepository` (create, findById, listByTenant with filters, update, softDelete, incrementQuantity, decrementQuantity)
- [x] 3.3 Implement `DrizzleStockMovementRepository` (create, listByTenant with filters)

## 4. Application — Use Cases (Product Category)

- [x] 4.1 `CreateProductCategoryUseCase` — validate unique name per tenant, persist
- [x] 4.2 `ListProductCategoriesUseCase` — return ordered list for tenant
- [x] 4.3 `UpdateProductCategoryUseCase` — validate unique name, update
- [x] 4.4 `DeleteProductCategoryUseCase` — block if category has active products, delete

## 5. Application — Use Cases (Product)

- [x] 5.1 `CreateProductUseCase` — validate `categoryId`/`supplierId` belong to tenant, compute `salePrice`, persist with `quantity = 0`
- [x] 5.2 `ListProductsUseCase` — paginated list with filters (`categoryId`, `supplierId`, `lowStock`)
- [x] 5.3 `GetProductUseCase` — fetch with category and supplier relations
- [x] 5.4 `UpdateProductUseCase` — validate FKs, recompute `salePrice` if `costPrice`/`marginPercent` changed
- [x] 5.5 `DeactivateProductUseCase` — verify `active = true`, set `active = false`
- [x] 5.6 `GetProductAlertsUseCase` — query products with `quantity <= min_quantity` OR `expiry_date <= today + 30 days`, aggregate `alertTypes` per product

## 6. Application — Use Cases (Stock)

- [x] 6.1 `CreateStockMovementUseCase` — validate product belongs to tenant and is active, block `out` if insufficient stock, atomically update `product.quantity`, persist movement
- [x] 6.2 `ListStockMovementsUseCase` — paginated list with filters (`productId`, `type`)

## 7. HTTP Layer — Routes & Controllers (Product Category)

- [x] 7.1 `POST /products/categories` — controller + Zod schema, `owner`/`financial` only
- [x] 7.2 `GET /products/categories` — controller + Zod schema
- [x] 7.3 `PATCH /products/categories/:id` — controller + Zod schema, `owner`/`financial` only
- [x] 7.4 `DELETE /products/categories/:id` — controller, `owner` only

## 8. HTTP Layer — Routes & Controllers (Product)

- [x] 8.1 `POST /products` — controller + Zod schema, `owner`/`financial` only
- [x] 8.2 `GET /products` — controller + Zod schema (pagination + filters)
- [x] 8.3 `GET /products/alerts` — controller (must be registered before `GET /products/:id` to avoid route collision)
- [x] 8.4 `GET /products/:id` — controller
- [x] 8.5 `PATCH /products/:id` — controller + Zod schema, `owner`/`financial` only
- [x] 8.6 `DELETE /products/:id` — controller, `owner` only

## 9. HTTP Layer — Routes & Controllers (Stock)

- [x] 9.1 `POST /stock/movements` — controller + Zod schema, `owner`/`financial` only
- [x] 9.2 `GET /stock/movements` — controller + Zod schema (pagination + filters)

## 10. Authorization & Subscription Guard

- [x] 10.1 Register `/products` and `/products/categories` and `/stock` as `essential`-plan routes in subscription guard
- [x] 10.2 Add CASL ability rules: `owner` and `financial` can manage products/categories/stock; `collaborator` can only read

## 11. Factories & Wiring

- [x] 11.1 Create factories for product category use cases
- [x] 11.2 Create factories for product use cases
- [x] 11.3 Create factories for stock use cases
- [x] 11.4 Register all new routes in the Fastify server

## 12. OpenAPI Documentation

- [x] 12.1 Add Swagger/OpenAPI schemas for product category endpoints
- [x] 12.2 Add Swagger/OpenAPI schemas for product endpoints (include `alertTypes` enum in alerts response)
- [x] 12.3 Add Swagger/OpenAPI schemas for stock movement endpoints

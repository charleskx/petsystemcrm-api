## Why

Petshops need to track who supplies their products — for reorders, negotiations, and audits. Suppliers are a premium-only feature required to close the product domain: products already have a `supplier_id` FK but no endpoint to manage the supplier entity.

## What Changes

- Full CRUD API for suppliers (`/suppliers`), restricted to `premium` plan tenants
- Supplier entity linked to products via `supplier_id` (FK already exists in schema)
- Soft-delete (set `active = false`) on supplier removal to preserve referential integrity with products and stock history

## Capabilities

### New Capabilities

- `supplier-management`: Create, read, update, and soft-delete suppliers; list with pagination and active filter; supplier linked to products via FK

### Modified Capabilities

<!-- No existing spec-level behavior changes -->

## Impact

- **New routes**: `GET /suppliers`, `POST /suppliers`, `GET /suppliers/:id`, `PATCH /suppliers/:id`, `DELETE /suppliers/:id`
- **Authorization**: premium-only (blocked by subscription-guard for essential plan)
- **DB**: `suppliers` table already exists in Drizzle schema; no migration needed
- **Products**: `product.supplier_id` FK already present — no product schema changes
- **Roles**: `owner` full access; `collaborator` read + write; `financial` read-only (or no access — to be decided in design)

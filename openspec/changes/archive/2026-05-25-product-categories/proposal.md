## Why

The product categories endpoints (`POST|GET|PATCH|DELETE /products/categories`) were implemented as part of the products module but have no integration tests — unlike every other route module in the project, which all have a corresponding `*.test.ts` file. This gap leaves the spec's scenarios unverified and allows regressions to go undetected.

## What Changes

- Add `products.test.ts` with integration tests covering all four product category endpoints
- Tests verify all scenarios from the `product-category-management` spec: successful CRUD, duplicate name conflict, tenant isolation, role-based permission enforcement, auth enforcement, and subscription expiry guard

## Capabilities

### New Capabilities

_None_

### Modified Capabilities

- `product-category-management`: Add test coverage for all existing requirements (no spec-level changes — the requirements themselves are already correct and complete)

## Impact

- New file: `src/interfaces/http/routes/products.test.ts`
- No changes to routes, use cases, domain entities, schema, or migrations
- Follows the same test structure and helpers as `services.test.ts`, `appointments.test.ts`, and other existing test files

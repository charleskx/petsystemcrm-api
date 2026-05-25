## Context

The product categories CRUD endpoints live in `src/interfaces/http/routes/products.ts` alongside product and stock endpoints. All application and domain layers are fully implemented. No other file touches category logic. The gap is a `products.test.ts` covering the four category routes.

All other route modules follow the same integration test pattern: a single `*.test.ts` file next to its route file, using Fastify's `app.inject`, real Drizzle/Postgres, `createTenantAndLogin` and `addCollaborator` helpers, and dedicated CNPJs per describe block to prevent tenant collision.

## Goals / Non-Goals

**Goals:**
- Full integration test coverage for `POST|GET|PATCH|DELETE /products/categories`
- Verify all scenarios from the `product-category-management` spec: success paths, `409` duplicate name, `404` cross-tenant isolation, `403` role enforcement, `401` missing auth, `402` expired subscription, `422` deletion blocked by active products

**Non-Goals:**
- Tests for product or stock endpoints (separate concern)
- Unit tests for use cases (not the project's testing pattern)
- Changes to any non-test file

## Decisions

**Test file name: `products.test.ts`**  
All route test files are named after their route file. Categories live in `products.ts`, so the test file is `products.test.ts`. Alternative (separate `product-categories.test.ts`) would work but diverges from the convention established by every other module.

**CNPJ block allocation**  
Each `describe` block gets its own pair of CNPJs (one self, one other-tenant) to ensure tenant isolation tests don't leak. The CNPJs must be valid (pass the check-digit algorithm) and must not conflict with CNPJs used in other test files.

**`CategoryHasProducts` scenario via `products.ts`**  
To test that DELETE returns `422` when the category has active products, the test must create a product linked to the category first. This requires calling `POST /products`, which is implemented in the same route file. The test creates a minimal valid product (required fields only) and then attempts deletion.

**Role enforcement**  
- `POST` and `PATCH`: blocked for `collaborator` (returns `403`), allowed for `owner` and `financial`  
- `DELETE`: allowed only for `owner`; both `financial` and `collaborator` get `403`

## Risks / Trade-offs

[Product creation required for `CategoryHasProducts` test] → The `POST /products` request needs all required fields. If the product schema changes, this test setup will break. Mitigation: use minimal valid values and leave a comment linking to the test's intent.

[CNPJ collision with other test files] → CNPJs must be globally unique across the test suite to avoid `409` on tenant registration. Mitigation: allocate a range not used by any existing test file (confirmed by grepping before writing).

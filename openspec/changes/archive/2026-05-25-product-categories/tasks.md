## 1. Test File Setup

- [x] 1.1 Create `src/interfaces/http/routes/products.test.ts` with standard imports (`vitest`, `buildApp`, `db`, Drizzle schema) and `beforeAll`/`afterAll` lifecycle hooks
- [x] 1.2 Allocate unique valid CNPJs for each describe block (grep existing test files to confirm no collisions) and define `createTenantAndLogin` and `addCollaborator` helpers matching the pattern in `services.test.ts`

## 2. POST /products/categories

- [x] 2.1 Test successful creation returns `201` with `id` and `name`
- [x] 2.2 Test duplicate name in same tenant returns `409`
- [x] 2.3 Test `collaborator` role returns `403`
- [x] 2.4 Test unauthenticated request returns `401`
- [x] 2.5 Test missing or empty `name` returns `422`

## 3. GET /products/categories

- [x] 3.1 Test successful list returns `200` with array ordered by `name` ascending
- [x] 3.2 Test tenant isolation — categories from another tenant are not returned

## 4. PATCH /products/categories/:id

- [x] 4.1 Test successful rename returns `200` with updated `name`
- [x] 4.2 Test duplicate name in same tenant returns `409`
- [x] 4.3 Test category belonging to another tenant returns `404`
- [x] 4.4 Test `collaborator` role returns `403`
- [x] 4.5 Test unauthenticated request returns `401`

## 5. DELETE /products/categories/:id

- [x] 5.1 Test successful deletion by `owner` returns `204`
- [x] 5.2 Test deletion of category with active products returns `422` (create a product linked to the category first via `POST /products`)
- [x] 5.3 Test category belonging to another tenant returns `404`
- [x] 5.4 Test `financial` role returns `403`
- [x] 5.5 Test `collaborator` role returns `403`
- [x] 5.6 Test unauthenticated request returns `401`

## 6. Subscription Guard

- [x] 6.1 Test that `GET /products/categories` returns `402` when tenant `subscription_status` is `expired` (update status directly via Drizzle after login)

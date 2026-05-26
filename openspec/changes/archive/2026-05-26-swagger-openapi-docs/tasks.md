## 1. Shared Infrastructure

- [x] 1.1 Create `src/interfaces/http/schemas/shared.ts` exporting `errorSchema` (common `{ error: string }` shape) and `notFoundSchema`, `unauthorizedSchema`, `forbiddenSchema`, `unprocessableSchema`, `paymentRequiredSchema` constants
- [x] 1.2 Extend `server.ts` swagger config: add `servers`, `tags` array listing all module names, and confirm `cookieAuth` security scheme is declared

## 2. Health & Auth Routes

- [x] 2.1 Add schema to `GET /health` — tag `Health`, no auth, response 200
- [x] 2.2 Add schema to `ALL /auth/*` — tag `Auth`, note it proxies to better-auth; response 200

## 3. Tenants & Members Routes

- [x] 3.1 Add schema to `POST /tenants` — tag `Tenants`, body (tenantName, document, documentType, userName, email, password), response 201
- [x] 3.2 Add schema to `GET /tenants/:id` — tag `Tenants`, params, security, response 200
- [x] 3.3 Add schema to `PATCH /tenants/:id` — tag `Tenants`, params, body, security, response 200
- [x] 3.4 Add schema to `POST /tenants/:id/logo` — tag `Tenants`, params, security, response 200 (multipart — mark `consumes: multipart/form-data`)
- [x] 3.5 Add schema to `GET /tenants/:tenantId/members` — tag `Members`, params, security, response 200
- [x] 3.6 Add schema to `POST /tenants/:tenantId/members/invite` — tag `Members`, params, body, security, response 201/202
- [x] 3.7 Add schema to `POST /tenants/:tenantId/members/accept-invite` — tag `Members`, params, querystring (token), body, response 201
- [x] 3.8 Add schema to `PATCH /tenants/:tenantId/members/:userId` — tag `Members`, params, body, security, response 200
- [x] 3.9 Add schema to `DELETE /tenants/:tenantId/members/:userId` — tag `Members`, params, security, response 204

## 4. Clients & Pets Routes

- [x] 4.1 Add schema to `GET /clients` — tag `Clients`, security, querystring (page, limit, search), response 200
- [x] 4.2 Add schema to `POST /clients` — tag `Clients`, security, body, response 201
- [x] 4.3 Add schema to `GET /clients/:id` — tag `Clients`, security, params, response 200
- [x] 4.4 Add schema to `PATCH /clients/:id` — tag `Clients`, security, params, body, response 200
- [x] 4.5 Add schema to `DELETE /clients/:id` — tag `Clients`, security, params, response 204
- [x] 4.6 Add schema to `GET /clients/address/autocomplete` — tag `Clients`, security, querystring (q), response 200
- [x] 4.7 Add schema to `GET /clients/:clientId/pets` — tag `Pets`, security, params, response 200
- [x] 4.8 Add schema to `POST /clients/:clientId/pets` — tag `Pets`, security, params, body, response 201
- [x] 4.9 Add schema to `GET /pets/:id` — tag `Pets`, security, params, response 200
- [x] 4.10 Add schema to `PATCH /pets/:id` — tag `Pets`, security, params, body, response 200
- [x] 4.11 Add schema to `DELETE /pets/:id` — tag `Pets`, security, params, response 204
- [x] 4.12 Add schema to `POST /pets/:id/photo` — tag `Pets`, security, params, response 200

## 5. Services & Schedule Routes

- [x] 5.1 Add schema to `GET /services` — tag `Services`, security, response 200
- [x] 5.2 Add schema to `POST /services` — tag `Services`, security, body, response 201
- [x] 5.3 Add schema to `GET /services/:id` — tag `Services`, security, params, response 200
- [x] 5.4 Add schema to `PATCH /services/:id` — tag `Services`, security, params, body, response 200
- [x] 5.5 Add schema to `DELETE /services/:id` — tag `Services`, security, params, response 204
- [x] 5.6 Add schema to `GET /services/:id/pricing` — tag `Services`, security, params, response 200
- [x] 5.7 Add schema to `PUT /services/:id/pricing` — tag `Services`, security, params, body, response 200
- [x] 5.8 Add schema to `GET /schedule` — tag `Schedule`, security, response 200
- [x] 5.9 Add schema to `PUT /schedule` — tag `Schedule`, security, body, response 200
- [x] 5.10 Add schema to `GET /schedule/holidays` — tag `Schedule`, security, response 200
- [x] 5.11 Add schema to `POST /schedule/holidays` — tag `Schedule`, security, body, response 201
- [x] 5.12 Add schema to `DELETE /schedule/holidays/:id` — tag `Schedule`, security, params, response 204
- [x] 5.13 Add schema to `GET /schedule/available-slots` — tag `Schedule`, security, querystring (date, duration), response 200

## 6. Appointments Routes

- [x] 6.1 Add schema to `GET /appointments` — tag `Appointments`, security, querystring (date, status, petId, clientId), response 200
- [x] 6.2 Add schema to `POST /appointments` — tag `Appointments`, security, body, response 201
- [x] 6.3 Add schema to `GET /appointments/:id` — tag `Appointments`, security, params, response 200
- [x] 6.4 Add schema to `PATCH /appointments/:id` — tag `Appointments`, security, params, body, response 200
- [x] 6.5 Add schema to `PATCH /appointments/:id/status` — tag `Appointments`, security, params, body, response 200
- [x] 6.6 Add schema to `DELETE /appointments/:id` — tag `Appointments`, security, params, response 204

## 7. Products, Categories & Stock Routes

- [x] 7.1 Add schema to `GET /products` — tag `Products`, security, querystring (categoryId, supplierId, lowStock), response 200
- [x] 7.2 Add schema to `POST /products` — tag `Products`, security, body, response 201
- [x] 7.3 Add schema to `GET /products/alerts` — tag `Products`, security, response 200
- [x] 7.4 Add schema to `GET /products/:id` — tag `Products`, security, params, response 200
- [x] 7.5 Add schema to `PATCH /products/:id` — tag `Products`, security, params, body, response 200
- [x] 7.6 Add schema to `DELETE /products/:id` — tag `Products`, security, params, response 204
- [x] 7.7 Add schema to `GET /products/categories` — tag `Products`, security, response 200
- [x] 7.8 Add schema to `POST /products/categories` — tag `Products`, security, body, response 201
- [x] 7.9 Add schema to `PATCH /products/categories/:id` — tag `Products`, security, params, body, response 200
- [x] 7.10 Add schema to `DELETE /products/categories/:id` — tag `Products`, security, params, response 204
- [x] 7.11 Add schema to `POST /stock/movements` — tag `Stock`, security, body, response 201
- [x] 7.12 Add schema to `GET /stock/movements` — tag `Stock`, security, querystring (productId, type), response 200

## 8. Suppliers, Sales, Billing & Payments Routes

- [x] 8.1 Add schema to `GET /suppliers` — tag `Suppliers`, security, response 200
- [x] 8.2 Add schema to `POST /suppliers` — tag `Suppliers`, security, body, response 201
- [x] 8.3 Add schema to `GET /suppliers/:id` — tag `Suppliers`, security, params, response 200
- [x] 8.4 Add schema to `PATCH /suppliers/:id` — tag `Suppliers`, security, params, body, response 200
- [x] 8.5 Add schema to `DELETE /suppliers/:id` — tag `Suppliers`, security, params, response 204
- [x] 8.6 Add schema to `GET /sales` — tag `Sales`, security, querystring (status, channel), response 200
- [x] 8.7 Add schema to `POST /sales` — tag `Sales`, security, body, response 201
- [x] 8.8 Add schema to `GET /sales/:id` — tag `Sales`, security, params, response 200
- [x] 8.9 Add schema to `PATCH /sales/:id/status` — tag `Sales`, security, params, body, response 200
- [x] 8.10 Add schema to `GET /billing/subscription` — tag `Billing`, security, response 200
- [x] 8.11 Add schema to `POST /billing/checkout` — tag `Billing`, security, body, response 200
- [x] 8.12 Add schema to `POST /billing/portal` — tag `Billing`, security, response 200
- [x] 8.13 Add schema to `PATCH /billing/plan` — tag `Billing`, security, body, response 200
- [x] 8.14 Add schema to `POST /payments/stripe/webhook` — tag `Payments`, no auth, response 200

## 9. Verification

- [x] 9.1 Start the server locally and open `http://localhost:3333/documentation` — confirm all modules appear as tags with populated paths
- [x] 9.2 Verify `GET /documentation/json` returns non-empty `paths` object with all 14+ modules
- [x] 9.3 Run `make typecheck` — no TypeScript errors
- [x] 9.4 Run `make test` — all 275 tests still pass

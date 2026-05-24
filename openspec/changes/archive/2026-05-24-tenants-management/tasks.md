## 1. Use Cases

- [x] 1.1 Create `src/application/tenant/get-tenant.use-case.ts` — fetch tenant by id, throw `TenantNotFoundError` if missing
- [x] 1.2 Create `src/application/tenant/update-tenant.use-case.ts` — partial update of name, pixKey, pixKeyType; return updated tenant
- [x] 1.3 Create `src/application/tenant/upload-tenant-logo.use-case.ts` — validate MIME type, delete old R2 object if present, upload new file, persist logo_url

## 2. Routes

- [x] 2.1 Add `GET /tenants/:id` to `src/interfaces/http/routes/tenants.ts` — authenticate middleware, param vs. JWT tenantId check, call get-tenant use case
- [x] 2.2 Add `PATCH /tenants/:id` to `src/interfaces/http/routes/tenants.ts` — authenticate middleware, owner-only check, Zod schema for name/pixKey/pixKeyType, call update-tenant use case
- [x] 2.3 Add `POST /tenants/:id/logo` to `src/interfaces/http/routes/tenants.ts` — authenticate middleware, owner-only check, multipart handling with 5 MB limit and MIME validation, call upload-tenant-logo use case

## 3. Storage Infrastructure

- [x] 3.1 Create `src/infra/storage/r2.ts` — thin wrapper around the AWS S3-compatible R2 API: `upload(key, stream, contentType)` → public URL, `delete(key)` → void
- [x] 3.2 Wire R2 credentials from env (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`) in `src/main/config/env.ts`

## 4. Tests

- [x] 4.1 Add integration tests for `GET /tenants/:id` in `src/interfaces/http/routes/tenants.test.ts` — 200 owner, 200 collaborator, 403 cross-tenant, 401 unauthenticated, 404 not found
- [x] 4.2 Add integration tests for `PATCH /tenants/:id` — 200 owner update name, 200 clear pix key, 403 non-owner, 403 cross-tenant, 200 empty body no-op
- [x] 4.3 Add integration tests for `POST /tenants/:id/logo` — 200 valid upload, 422 file too large, 422 unsupported type, 403 non-owner, 403 cross-tenant

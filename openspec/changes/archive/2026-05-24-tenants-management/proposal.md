## Why

Tenant registration is already implemented, but petshops have no way to view or update their own company data after signing up — name, Pix key, and logo are all locked at creation time. This change unlocks the operational profile management that every onboarded tenant immediately needs.

## What Changes

- `GET /tenants/:id` — authenticated owner or member fetches their tenant's public profile (name, document, plan, subscription status, Pix key)
- `PATCH /tenants/:id` — owner updates mutable company fields (name, Pix key/type)
- `POST /tenants/:id/logo` — owner uploads the company logo (JPEG/PNG/WebP, ≤5 MB) to Cloudflare R2; `logo_url` is persisted to the tenant record
- Route-level authorization: only members of the target tenant may access these endpoints; only `owner` role may mutate

## Capabilities

### New Capabilities

- `tenant-management`: Read and update tenant profile (GET, PATCH) and upload logo (POST multipart)

### Modified Capabilities

- `tenant-registration`: No requirement changes — existing spec covers registration only; `GET /tenants/:id` response shape implicitly extends the registered model but adds no conflicting rules

## Impact

- New routes added to `src/interfaces/http/routes/tenants.ts`
- New use cases: `get-tenant.use-case.ts`, `update-tenant.use-case.ts`, `upload-tenant-logo.use-case.ts`
- `@fastify/multipart` (already listed in stack) used for logo upload
- Cloudflare R2 integration via existing `src/infra/storage/` layer
- `authenticate` middleware applied to all three new routes
- Authorization check: `tenantId` from JWT must match the `:id` param; `owner` role required for PATCH and logo upload

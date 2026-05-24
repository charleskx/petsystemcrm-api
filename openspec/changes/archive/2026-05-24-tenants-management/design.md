## Context

`POST /tenants` (registration) is live. The three remaining tenant routes — `GET /tenants/:id`, `PATCH /tenants/:id`, and `POST /tenants/:id/logo` — share the same authorization model and fit neatly into the existing clean-architecture layout. The main design question is where to draw the authorization boundary and how to wire the R2 logo upload without creating a bespoke storage abstraction.

## Goals / Non-Goals

**Goals:**
- Let any tenant member read their own tenant profile
- Let `owner`-role members update mutable company fields and logo
- Keep authorization consistent with the pattern used by the `clients` module

**Non-Goals:**
- Admin/super-user view of any tenant (no cross-tenant reads)
- Stripe-linked field updates (plan, subscription status) — those belong to `/billing`
- Changing the document (CPF/CNPJ) after registration — treated as immutable identity

## Decisions

### Authorization: param check vs. CASL

**Decision:** Inline param check (`req.tenantId === params.id`) plus a role check (`req.tenantRole === 'owner'`) rather than introducing CASL rules for these three routes.

**Rationale:** CASL is listed in the stack but not yet wired into any route. Adding it just for these three endpoints would create an inconsistent half-integration. The clients module uses the same simple inline checks. Introduce CASL globally when the project reaches the authorization consolidation milestone.

**Alternative considered:** Full CASL policy on `Tenant` entity — rejected because it requires defining the policy store, ability builder, and middleware wiring that don't exist yet.

---

### Logo upload: stream directly to R2

**Decision:** Receive the file via `@fastify/multipart` (already registered globally), stream it directly to R2 via the `infra/storage` layer, then persist the returned public URL to the tenant record.

**Rationale:** Buffering the entire file in memory before uploading is simpler but wastes memory for large images. Streaming is the idiomatic `@fastify/multipart` approach and keeps memory flat.

**File constraints enforced at the route layer:** `image/jpeg`, `image/png`, `image/webp`; ≤ 5 MB. The limit is enforced via `@fastify/multipart` `limits.fileSize` per request (not globally, to avoid affecting other multipart routes).

---

### Mutable vs. immutable fields

**Decision:** `PATCH /tenants/:id` accepts only: `name`, `pixKey`, `pixKeyType`. Document, plan, and subscription fields are excluded from the schema so they cannot be accidentally modified via this endpoint.

## Risks / Trade-offs

- **Old logos accumulate in R2** → Each upload overwrites the DB `logo_url` but the previous R2 object is not deleted. Mitigation: delete the previous object before uploading the new one if `logo_url` is set; this adds one R2 API call per upload, which is acceptable.
- **Multipart fileSize limit is per-route** → If `@fastify/multipart` is later registered globally with a lower limit, it would shadow the route-level limit. Mitigation: document the per-route override in the route file.

## Migration Plan

No schema migration needed — `logo_url`, `pix_key`, and `pix_key_type` columns already exist in the `tenants` table. Deploy is a code-only change.

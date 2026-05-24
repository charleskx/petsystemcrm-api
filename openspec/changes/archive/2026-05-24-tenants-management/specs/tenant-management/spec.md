## ADDED Requirements

### Requirement: Tenant member can fetch their own company profile
The system SHALL allow any authenticated member of a tenant to retrieve that tenant's profile data, including name, document, plan, subscription status, trial expiry, and Pix key. Cross-tenant reads are forbidden.

#### Scenario: Owner fetches own tenant profile
- **WHEN** an authenticated request with a valid JWT (tenantId = T) is sent to `GET /tenants/T`
- **THEN** the system returns 200 with the tenant's name, document, documentType, plan, subscriptionStatus, trialEndsAt, pixKey, pixKeyType, and logoUrl fields

#### Scenario: Collaborator fetches own tenant profile
- **WHEN** an authenticated request from a user with role `collaborator` on tenant T is sent to `GET /tenants/T`
- **THEN** the system returns 200 with the tenant profile (same response shape as owner)

#### Scenario: Member cannot read a different tenant
- **WHEN** an authenticated request with JWT tenantId = T1 is sent to `GET /tenants/T2` (T1 ≠ T2)
- **THEN** the system returns 403 Forbidden

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request without a valid JWT is sent to `GET /tenants/:id`
- **THEN** the system returns 401 Unauthorized

#### Scenario: Tenant not found
- **WHEN** an authenticated owner sends `GET /tenants/:id` with an id that does not exist in the database
- **THEN** the system returns 404 Not Found

### Requirement: Owner can update mutable company fields
The system SHALL allow a tenant `owner` to update the company name, Pix key, and Pix key type via `PATCH /tenants/:id`. Non-owner roles and cross-tenant requests SHALL be rejected.

#### Scenario: Owner updates company name
- **WHEN** an owner sends `PATCH /tenants/:id` with `{ "name": "New Name" }`
- **THEN** the system updates the tenant name, returns 200 with the updated tenant data

#### Scenario: Owner updates Pix key and type
- **WHEN** an owner sends `PATCH /tenants/:id` with `{ "pixKey": "11999999999", "pixKeyType": "phone" }`
- **THEN** the system persists both fields and returns 200 with the updated tenant data

#### Scenario: Owner clears Pix key
- **WHEN** an owner sends `PATCH /tenants/:id` with `{ "pixKey": null, "pixKeyType": null }`
- **THEN** the system sets both fields to null and returns 200

#### Scenario: Non-owner member cannot update tenant
- **WHEN** an authenticated user with role `collaborator` or `financial` sends `PATCH /tenants/:id`
- **THEN** the system returns 403 Forbidden without modifying the tenant

#### Scenario: Cross-tenant update is rejected
- **WHEN** an authenticated owner of tenant T1 sends `PATCH /tenants/T2` (T1 ≠ T2)
- **THEN** the system returns 403 Forbidden

#### Scenario: Empty PATCH body is a no-op
- **WHEN** an owner sends `PATCH /tenants/:id` with `{}`
- **THEN** the system returns 200 with the current tenant data unchanged

#### Scenario: Attempt to update immutable fields is ignored
- **WHEN** an owner sends `PATCH /tenants/:id` with `{ "document": "12345678000195" }`
- **THEN** the system ignores the unknown field, returns 200, and the document remains unchanged

### Requirement: Owner can upload or replace company logo
The system SHALL allow a tenant `owner` to upload a logo image (JPEG, PNG, or WebP; max 5 MB) via `POST /tenants/:id/logo`. The file is stored in Cloudflare R2 and the public URL is persisted to the tenant record. A previous logo object in R2 SHALL be deleted before the new one is stored.

#### Scenario: Owner uploads a valid logo
- **WHEN** an owner sends `POST /tenants/:id/logo` with a multipart/form-data body containing a valid JPEG, PNG, or WebP file ≤ 5 MB under the field name `logo`
- **THEN** the system stores the file in R2, deletes any previous logo object, updates `logo_url` on the tenant, and returns 200 with the new `logoUrl`

#### Scenario: File exceeds 5 MB is rejected
- **WHEN** an owner sends `POST /tenants/:id/logo` with a file larger than 5 MB
- **THEN** the system returns 422 Unprocessable Entity with an error message indicating the file is too large

#### Scenario: Unsupported file type is rejected
- **WHEN** an owner sends `POST /tenants/:id/logo` with a file whose MIME type is not `image/jpeg`, `image/png`, or `image/webp`
- **THEN** the system returns 422 Unprocessable Entity with an error message indicating the unsupported format

#### Scenario: Non-owner member cannot upload logo
- **WHEN** an authenticated user with role `collaborator` or `financial` sends `POST /tenants/:id/logo`
- **THEN** the system returns 403 Forbidden

#### Scenario: Cross-tenant logo upload is rejected
- **WHEN** an authenticated owner of tenant T1 sends `POST /tenants/T2/logo` (T1 ≠ T2)
- **THEN** the system returns 403 Forbidden

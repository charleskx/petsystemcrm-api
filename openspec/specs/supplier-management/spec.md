## ADDED Requirements

### Requirement: List suppliers
The system SHALL return a paginated list of suppliers for the authenticated tenant. By default only active suppliers are returned. The caller MAY pass `?active=false` to include inactive ones.

#### Scenario: List active suppliers (default)
- **WHEN** an authenticated premium-plan user sends `GET /suppliers`
- **THEN** the system returns 200 with an array of active suppliers and pagination metadata

#### Scenario: List including inactive suppliers
- **WHEN** an authenticated premium-plan user sends `GET /suppliers?active=false`
- **THEN** the system returns 200 with all suppliers (active and inactive)

#### Scenario: Essential plan blocked
- **WHEN** an authenticated user on the essential plan sends `GET /suppliers`
- **THEN** the system returns 403 Forbidden

---

### Requirement: Create supplier
The system SHALL allow `owner` and `collaborator` roles to create a new supplier for the tenant. The `name` field is required. All other fields are optional. When `document` is provided, it MUST pass CPF or CNPJ digit-verification before persisting.

#### Scenario: Successful creation
- **WHEN** an `owner` or `collaborator` sends `POST /suppliers` with a valid `name`
- **THEN** the system persists the supplier with `active = true` and returns 201 with the created resource

#### Scenario: Invalid document rejected
- **WHEN** a user sends `POST /suppliers` with a `document` that fails digit-verification
- **THEN** the system returns 400 with a validation error

#### Scenario: Financial role blocked
- **WHEN** a `financial` role user sends `POST /suppliers`
- **THEN** the system returns 403 Forbidden

---

### Requirement: Get supplier detail
The system SHALL return the full details of a single supplier by ID, scoped to the authenticated tenant.

#### Scenario: Supplier found
- **WHEN** an authenticated user sends `GET /suppliers/:id` for a supplier that belongs to their tenant
- **THEN** the system returns 200 with the supplier data

#### Scenario: Supplier not found or wrong tenant
- **WHEN** an authenticated user sends `GET /suppliers/:id` for an ID that does not exist or belongs to a different tenant
- **THEN** the system returns 404 Not Found

---

### Requirement: Update supplier
The system SHALL allow `owner` and `collaborator` roles to partially update a supplier's fields. All fields are optional in the PATCH body. When `document` is provided, it MUST pass digit-verification.

#### Scenario: Successful update
- **WHEN** an `owner` or `collaborator` sends `PATCH /suppliers/:id` with valid fields
- **THEN** the system updates only the provided fields and returns 200 with the updated resource

#### Scenario: Invalid document on update
- **WHEN** a user sends `PATCH /suppliers/:id` with a `document` that fails digit-verification
- **THEN** the system returns 400 with a validation error

#### Scenario: Supplier not found
- **WHEN** a user sends `PATCH /suppliers/:id` for a non-existent or cross-tenant supplier
- **THEN** the system returns 404 Not Found

#### Scenario: Financial role blocked
- **WHEN** a `financial` role user sends `PATCH /suppliers/:id`
- **THEN** the system returns 403 Forbidden

---

### Requirement: Deactivate supplier
The system SHALL allow `owner` and `collaborator` roles to soft-delete a supplier by setting `active = false`. The supplier SHALL remain in the database and products referencing it SHALL NOT be affected.

#### Scenario: Successful deactivation
- **WHEN** an `owner` or `collaborator` sends `DELETE /suppliers/:id` for an existing supplier
- **THEN** the system sets `active = false` and returns 204 No Content

#### Scenario: Supplier not found
- **WHEN** a user sends `DELETE /suppliers/:id` for a non-existent or cross-tenant supplier
- **THEN** the system returns 404 Not Found

#### Scenario: Already inactive
- **WHEN** a user sends `DELETE /suppliers/:id` for a supplier that is already inactive
- **THEN** the system returns 409 Conflict

#### Scenario: Financial role blocked
- **WHEN** a `financial` role user sends `DELETE /suppliers/:id`
- **THEN** the system returns 403 Forbidden

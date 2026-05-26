## MODIFIED Requirements

### Requirement: Only owner can update tenant data or upload logo
`PATCH /tenants/:id` and `POST /tenants/:id/logo` SHALL be restricted to the owner role. Checks SHALL use `request.ability.cannot("update", "Tenant")` instead of `request.role !== "owner"`.

#### Scenario: Owner can update tenant data
- **WHEN** an authenticated owner sends `PATCH /tenants/:id` with valid payload
- **THEN** the system returns 200

#### Scenario: Financial cannot update tenant data
- **WHEN** an authenticated financial member sends `PATCH /tenants/:id`
- **THEN** the system returns 403

#### Scenario: Collaborator cannot update tenant data
- **WHEN** an authenticated collaborator sends `PATCH /tenants/:id`
- **THEN** the system returns 403

#### Scenario: Owner can upload tenant logo
- **WHEN** an authenticated owner sends `POST /tenants/:id/logo` with a valid image
- **THEN** the system returns 200

#### Scenario: Non-owner cannot upload tenant logo
- **WHEN** an authenticated financial or collaborator sends `POST /tenants/:id/logo`
- **THEN** the system returns 403

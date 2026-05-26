## MODIFIED Requirements

### Requirement: Collaborator cannot create sales or change sale status
`POST /sales` and `PATCH /sales/:id/status` SHALL be restricted to owner and financial roles. Collaborator may read sales but cannot create them or change their status. Checks SHALL use `request.ability.cannot("create"|"update", "Sale")`.

#### Scenario: Collaborator cannot create a sale
- **WHEN** an authenticated collaborator sends `POST /sales`
- **THEN** the system returns 403

#### Scenario: Collaborator cannot update sale status
- **WHEN** an authenticated collaborator sends `PATCH /sales/:id/status`
- **THEN** the system returns 403

#### Scenario: Financial can create a sale
- **WHEN** an authenticated financial member sends `POST /sales` with valid payload
- **THEN** the system returns 201

#### Scenario: Owner can change sale status
- **WHEN** an authenticated owner sends `PATCH /sales/:id/status` with valid payload
- **THEN** the system returns 200

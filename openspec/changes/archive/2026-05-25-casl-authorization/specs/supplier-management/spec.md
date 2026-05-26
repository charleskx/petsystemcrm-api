## MODIFIED Requirements

### Requirement: Financial cannot mutate suppliers
`POST`, `PATCH`, and `DELETE` on `/suppliers` SHALL be restricted to owner only. Financial may read suppliers but cannot create, update, or delete them. Collaborator cannot access suppliers at all (premium-only route blocked at subscription guard). Checks SHALL use `request.ability.cannot("create"|"update"|"delete", "Supplier")`.

#### Scenario: Financial cannot create a supplier
- **WHEN** an authenticated financial member sends `POST /suppliers`
- **THEN** the system returns 403

#### Scenario: Financial cannot update a supplier
- **WHEN** an authenticated financial member sends `PATCH /suppliers/:id`
- **THEN** the system returns 403

#### Scenario: Financial cannot delete a supplier
- **WHEN** an authenticated financial member sends `DELETE /suppliers/:id`
- **THEN** the system returns 403

#### Scenario: Owner can create a supplier
- **WHEN** an authenticated owner sends `POST /suppliers` with valid payload
- **THEN** the system returns 201

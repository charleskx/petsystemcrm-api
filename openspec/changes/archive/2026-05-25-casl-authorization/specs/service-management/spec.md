## MODIFIED Requirements

### Requirement: Only owner and financial can mutate services
`POST`, `PATCH`, and `DELETE` on `/services` and `PUT /services/:id/pricing` SHALL be restricted to owner and financial roles. The check SHALL use `request.ability.cannot("create"|"update"|"delete", "Service")` and `request.ability.cannot("update", "ServicePricing")`.

#### Scenario: Owner creates a service
- **WHEN** an authenticated owner sends `POST /services` with valid payload
- **THEN** the system returns 201

#### Scenario: Collaborator cannot create a service
- **WHEN** an authenticated collaborator sends `POST /services`
- **THEN** the system returns 403

#### Scenario: Collaborator cannot update pricing
- **WHEN** an authenticated collaborator sends `PUT /services/:id/pricing`
- **THEN** the system returns 403

#### Scenario: Financial can update pricing
- **WHEN** an authenticated financial member sends `PUT /services/:id/pricing`
- **THEN** the system returns 200

## MODIFIED Requirements

### Requirement: Collaborator can only create stock movements, not delete
`POST /stock/movements` SHALL be allowed for collaborator (create only). Collaborator cannot delete movements. Financial can create and delete. Owner has full access. Checks SHALL use `request.ability.cannot("create"|"delete", "StockMovement")`.

#### Scenario: Collaborator can register a stock movement
- **WHEN** an authenticated collaborator sends `POST /stock/movements` with valid payload
- **THEN** the system returns 201

#### Scenario: Financial can register a stock movement
- **WHEN** an authenticated financial member sends `POST /stock/movements` with valid payload
- **THEN** the system returns 201

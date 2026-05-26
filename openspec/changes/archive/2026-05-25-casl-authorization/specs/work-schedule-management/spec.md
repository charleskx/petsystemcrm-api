## MODIFIED Requirements

### Requirement: Collaborator cannot modify work schedule or holidays
`PUT /schedule`, `POST /schedule/holidays`, and `DELETE /schedule/holidays/:id` SHALL be restricted to owner and financial roles. Checks SHALL use `request.ability.cannot("update", "WorkSchedule")` and `request.ability.cannot("create"|"delete", "Holiday")`.

#### Scenario: Collaborator cannot update schedule
- **WHEN** an authenticated collaborator sends `PUT /schedule`
- **THEN** the system returns 403

#### Scenario: Collaborator cannot add a holiday
- **WHEN** an authenticated collaborator sends `POST /schedule/holidays`
- **THEN** the system returns 403

#### Scenario: Collaborator cannot delete a holiday
- **WHEN** an authenticated collaborator sends `DELETE /schedule/holidays/:id`
- **THEN** the system returns 403

#### Scenario: Financial can update schedule
- **WHEN** an authenticated financial member sends `PUT /schedule` with valid payload
- **THEN** the system returns 200

## MODIFIED Requirements

### Requirement: Collaborator cannot update, change status, or delete appointments
`PATCH /appointments/:id`, `PATCH /appointments/:id/status`, and `DELETE /appointments/:id` SHALL be restricted to owner and financial roles. The check SHALL use `request.ability.cannot("update"|"delete", "Appointment")`.

#### Scenario: Collaborator cannot update an appointment
- **WHEN** an authenticated collaborator sends `PATCH /appointments/:id`
- **THEN** the system returns 403

#### Scenario: Collaborator cannot change appointment status
- **WHEN** an authenticated collaborator sends `PATCH /appointments/:id/status`
- **THEN** the system returns 403

#### Scenario: Collaborator cannot delete an appointment
- **WHEN** an authenticated collaborator sends `DELETE /appointments/:id`
- **THEN** the system returns 403

#### Scenario: Owner can update an appointment
- **WHEN** an authenticated owner sends `PATCH /appointments/:id` with valid payload
- **THEN** the system returns 200

#### Scenario: Financial can update an appointment
- **WHEN** an authenticated financial member sends `PATCH /appointments/:id` with valid payload
- **THEN** the system returns 200

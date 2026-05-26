### Requirement: Central ability factory defines all role permissions
The system SHALL provide a `defineAbilityFor(role)` function in `src/infra/auth/ability.ts` that returns a CASL `MongoAbility` instance encoding the complete permission set for a given tenant role.

#### Scenario: Owner receives full access
- **WHEN** `defineAbilityFor("owner")` is called
- **THEN** the returned ability allows `manage` on `all` subjects

#### Scenario: Financial receives read access and write access to sales, stock, and appointments
- **WHEN** `defineAbilityFor("financial")` is called
- **THEN** the ability allows `read` on all subjects
- **AND** allows `create`, `update`, `delete` on `Sale`
- **AND** allows `create`, `update`, `delete` on `StockMovement`
- **AND** allows `create`, `update`, `delete` on `Appointment`

#### Scenario: Collaborator receives read access and limited write access
- **WHEN** `defineAbilityFor("collaborator")` is called
- **THEN** the ability allows `read` on all subjects
- **AND** allows `create`, `update`, `delete` on `Appointment`
- **AND** allows `create`, `update` on `StockMovement`
- **AND** does NOT allow `create`, `update`, `delete` on `Service`
- **AND** does NOT allow `create`, `update`, `delete` on `Product`
- **AND** does NOT allow `create`, `update`, `delete` on `Supplier`
- **AND** does NOT allow `create`, `update`, `delete` on `Sale`

---

### Requirement: Ability is attached to every authenticated request
The `authenticate` middleware SHALL call `defineAbilityFor(request.role)` after resolving the session and decorate `request.ability` with the result, so all route handlers can call `request.ability.cannot(action, subject)` without importing or constructing the ability themselves.

#### Scenario: Authenticated request has ability available
- **WHEN** a request passes through `authenticate` successfully
- **THEN** `request.ability` is defined and reflects the member's role

#### Scenario: Unauthorized request has no ability
- **WHEN** a request has no valid session
- **THEN** `authenticate` returns 401 before `request.ability` is set

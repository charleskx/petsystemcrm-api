## MODIFIED Requirements

### Requirement: Only owner can invite members
Only tenant members with the `owner` role SHALL be able to invite new members. The check SHALL use `request.ability.cannot("create", "Member")` instead of `request.role !== "owner"`.

#### Scenario: Owner invites a new member
- **WHEN** an authenticated owner sends `POST /tenants/:tenantId/members/invite` with valid payload
- **THEN** the system returns 201 (added) or 202 (invited)

#### Scenario: Non-owner cannot invite
- **WHEN** an authenticated financial or collaborator sends `POST /tenants/:tenantId/members/invite`
- **THEN** the system returns 403

### Requirement: Only owner can change member roles
Only tenant members with the `owner` role SHALL be able to change another member's role via `PATCH /tenants/:tenantId/members/:userId`. The check SHALL use `request.ability.cannot("update", "Member")`.

#### Scenario: Owner updates a member's role
- **WHEN** an authenticated owner sends `PATCH /tenants/:tenantId/members/:userId` with a valid role
- **THEN** the system returns 200

#### Scenario: Non-owner cannot change roles
- **WHEN** an authenticated financial or collaborator sends `PATCH /tenants/:tenantId/members/:userId`
- **THEN** the system returns 403

### Requirement: Only owner can remove members
Only tenant members with the `owner` role SHALL be able to remove a member via `DELETE /tenants/:tenantId/members/:userId`. The check SHALL use `request.ability.cannot("delete", "Member")`.

#### Scenario: Owner removes a member
- **WHEN** an authenticated owner sends `DELETE /tenants/:tenantId/members/:userId`
- **THEN** the system returns 204

#### Scenario: Non-owner cannot remove members
- **WHEN** an authenticated financial or collaborator sends `DELETE /tenants/:tenantId/members/:userId`
- **THEN** the system returns 403

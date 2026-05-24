## ADDED Requirements

### Requirement: List tenant members
The system SHALL return all active members of a tenant with their user info and role.

#### Scenario: Owner lists members
- **WHEN** an authenticated member sends `GET /tenants/:tenantId/members`
- **THEN** the system returns 200 with an array of members, each containing `userId`, `name`, `email`, `role`, and `joinedAt`

#### Scenario: Request for another tenant is denied
- **WHEN** an authenticated member sends `GET /tenants/:tenantId/members` for a tenantId that is not theirs
- **THEN** the system returns 403 Forbidden

---

### Requirement: Invite member by email
The system SHALL allow an `owner` to invite a person to the tenant by their email address, assigning a role at invitation time.

#### Scenario: Invite existing user
- **WHEN** an owner sends `POST /tenants/:tenantId/members/invite` with `{ email, role }` and the email belongs to an existing user
- **THEN** the system adds the user to `tenant_members` with the given role and returns 201

#### Scenario: Invite new user — pending invitation created
- **WHEN** an owner sends `POST /tenants/:tenantId/members/invite` with `{ email, role }` and the email does not belong to any existing user
- **THEN** the system creates a pending invitation in `tenant_invitations` with a unique token and 7-day expiry, sends an invite email via Resend with the acceptance link, and returns 202

#### Scenario: Non-owner cannot invite
- **WHEN** a member with role `financial` or `collaborator` sends `POST /tenants/:tenantId/members/invite`
- **THEN** the system returns 403 Forbidden

#### Scenario: Invalid role in invite
- **WHEN** an owner sends an invite with a `role` value outside `(owner|financial|collaborator)`
- **THEN** the system returns 422 Unprocessable Entity

#### Scenario: User already a member
- **WHEN** an owner invites an email that already belongs to an active member of the tenant
- **THEN** the system returns 409 Conflict

---

### Requirement: Accept invitation (new user)
The system SHALL allow a new user to accept a pending invitation, create their account, and be added to the tenant.

#### Scenario: Valid token accepted
- **WHEN** a POST is sent to `/tenants/:tenantId/members/accept-invite` with a valid non-expired token and `{ name, password }`
- **THEN** the system creates the user account, adds them to `tenant_members` with the role stored in the invitation, invalidates the token, and returns 201

#### Scenario: Expired token rejected
- **WHEN** a POST is sent to `/tenants/:tenantId/members/accept-invite` with a token whose `expires_at` is in the past
- **THEN** the system returns 410 Gone

#### Scenario: Invalid token rejected
- **WHEN** a POST is sent to `/tenants/:tenantId/members/accept-invite` with a token that does not exist
- **THEN** the system returns 404 Not Found

---

### Requirement: Update member role
The system SHALL allow an `owner` to change the role of any member except when doing so would leave the tenant with no owners.

#### Scenario: Owner updates a member's role
- **WHEN** an owner sends `PATCH /tenants/:tenantId/members/:userId` with `{ role }`
- **THEN** the system updates the role in `tenant_members` and returns 200 with the updated member

#### Scenario: Downgrading last owner is rejected
- **WHEN** an owner sends `PATCH /tenants/:tenantId/members/:userId` to change the last `owner` to a non-owner role
- **THEN** the system returns 409 Conflict with an error message in Portuguese

#### Scenario: Non-owner cannot change roles
- **WHEN** a member with role `financial` or `collaborator` sends `PATCH /tenants/:tenantId/members/:userId`
- **THEN** the system returns 403 Forbidden

---

### Requirement: Remove member
The system SHALL allow an `owner` to remove a member from the tenant, except when removing the last owner.

#### Scenario: Owner removes a member
- **WHEN** an owner sends `DELETE /tenants/:tenantId/members/:userId` for a member who is not the last owner
- **THEN** the system deletes the record from `tenant_members` and returns 204

#### Scenario: Removing last owner is rejected
- **WHEN** an owner sends `DELETE /tenants/:tenantId/members/:userId` that would remove the last `owner`
- **THEN** the system returns 409 Conflict with an error message in Portuguese

#### Scenario: Non-owner cannot remove members
- **WHEN** a member with role `financial` or `collaborator` sends `DELETE /tenants/:tenantId/members/:userId`
- **THEN** the system returns 403 Forbidden

#### Scenario: Member not found
- **WHEN** an owner sends `DELETE /tenants/:tenantId/members/:userId` for a userId that is not a member of the tenant
- **THEN** the system returns 404 Not Found

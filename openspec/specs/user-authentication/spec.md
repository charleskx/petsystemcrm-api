## ADDED Requirements

### Requirement: User can sign in with email and password
The system SHALL authenticate a user via email and password through better-auth's email/password provider and issue a session stored in an httpOnly cookie.

#### Scenario: Successful login
- **WHEN** a POST /auth/sign-in/email request is received with a valid email and correct password
- **THEN** the system returns 200 with user data and sets a session cookie with httpOnly and Secure flags

#### Scenario: Wrong password is rejected
- **WHEN** a POST /auth/sign-in/email request is received with a valid email but incorrect password
- **THEN** the system returns 401 Unauthorized

#### Scenario: Non-existent email is rejected
- **WHEN** a POST /auth/sign-in/email request is received with an email not registered in the system
- **THEN** the system returns 401 Unauthorized (no user enumeration — same response as wrong password)

### Requirement: Authenticated session provides tenant context
The system SHALL extract `tenantId`, `userId`, and `role` from the active session and inject them into every authenticated request.

#### Scenario: Valid session grants access with tenant context
- **WHEN** an authenticated request arrives with a valid session cookie and the user belongs to exactly one tenant
- **THEN** the `authenticate` middleware injects `tenantId`, `userId`, and `role` into the request context and allows the request to proceed

#### Scenario: Missing session returns 401
- **WHEN** a request arrives at a protected endpoint without a session cookie or with an expired session
- **THEN** the system returns 401 Unauthorized

#### Scenario: Public routes are accessible without a session
- **WHEN** a request arrives at /auth/*, POST /tenants, or GET /health without a session cookie
- **THEN** the system processes the request without invoking the authenticate middleware

### Requirement: User can sign out
The system SHALL invalidate the current session when the user signs out.

#### Scenario: Successful logout
- **WHEN** a POST /auth/sign-out request is received with a valid session cookie
- **THEN** the system invalidates the session in the database and clears the session cookie, returning 200

### Requirement: Session can be refreshed
The system SHALL automatically refresh the session token before expiry so users remain logged in across long-running sessions.

#### Scenario: Session refresh extends validity
- **WHEN** better-auth's session refresh mechanism is triggered (managed internally by better-auth)
- **THEN** the session expiry is extended and the updated cookie is sent in the response

### Requirement: Authenticated request carries role from tenant membership
The system SHALL resolve the user's role within the active tenant from `tenant_members` and make it available in the request context.

#### Scenario: Owner role is resolved
- **WHEN** an authenticated user is an owner of the tenant
- **THEN** `request.role` equals `owner`

#### Scenario: Collaborator role is resolved
- **WHEN** an authenticated user is a collaborator of the tenant
- **THEN** `request.role` equals `collaborator`

#### Scenario: Financial role is resolved
- **WHEN** an authenticated user has the financial role in the tenant
- **THEN** `request.role` equals `financial`

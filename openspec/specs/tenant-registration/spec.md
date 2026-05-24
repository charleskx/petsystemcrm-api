## ADDED Requirements

### Requirement: New tenant registration creates company and owner atomically
The system SHALL register a new petshop (tenant) together with its first user (owner) in a single atomic transaction. On success, a 14-day trial period SHALL begin with full premium access.

#### Scenario: Successful tenant registration
- **WHEN** a POST /tenants request is received with valid company name, document, user name, email, and password
- **THEN** the system creates the user account via better-auth, inserts a tenant record with `subscription_status = trial` and `trial_ends_at = now + 14 days`, inserts a `tenant_members` entry with `role = owner`, and returns 201 with the tenant id and trial expiry date

#### Scenario: Duplicate company document is rejected
- **WHEN** a POST /tenants request is received with a document (CPF/CNPJ) that already exists in the system
- **THEN** the system returns 409 Conflict with an error message indicating the document is already registered

#### Scenario: Duplicate user email is rejected
- **WHEN** a POST /tenants request is received with an email already registered in the system
- **THEN** the system returns 409 Conflict with an error message indicating the email is already in use

#### Scenario: Invalid CPF/CNPJ is rejected
- **WHEN** a POST /tenants request is received with a document that fails check-digit validation
- **THEN** the system returns 422 Unprocessable Entity with a validation error identifying the invalid field

#### Scenario: Missing required fields are rejected
- **WHEN** a POST /tenants request is received with any required field absent (company name, document, user name, email, or password)
- **THEN** the system returns 422 Unprocessable Entity listing the missing fields

#### Scenario: Partial failure rolls back completely
- **WHEN** any step of the registration transaction fails after user creation (e.g., tenant insert fails)
- **THEN** the system rolls back all database writes so no orphaned records are left

### Requirement: Registered tenant receives trial access
The system SHALL grant the newly registered tenant `subscription_status = trial` with `trial_ends_at` set to exactly 14 days from the registration timestamp.

#### Scenario: Trial fields are set on registration
- **WHEN** a tenant is successfully registered
- **THEN** `subscription_status` equals `trial` and `trial_ends_at` is within a 1-second window of `now + 14 days`

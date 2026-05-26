## ADDED Requirements

### Requirement: Tenant can create a service
The system SHALL allow authenticated users with role `owner` or `financial` to create a service scoped to their tenant. A service requires a name and duration in minutes; description and active flag are optional (default active = true).

#### Scenario: Successful service creation
- **WHEN** an `owner` or `financial` user sends `POST /services` with valid name and duration_minutes
- **THEN** the system creates the service under the user's tenant and returns 201 with the created service

#### Scenario: Collaborator cannot create a service
- **WHEN** a `collaborator` user sends `POST /services`
- **THEN** the system returns 403 Forbidden

#### Scenario: Missing required fields
- **WHEN** the user sends `POST /services` without name or duration_minutes
- **THEN** the system returns 400 with a validation error

#### Scenario: Duration must be positive
- **WHEN** the user sends `POST /services` with duration_minutes <= 0
- **THEN** the system returns 400 with a validation error

### Requirement: Tenant can list their services
The system SHALL allow any authenticated tenant member to list all services belonging to their tenant, ordered by name.

#### Scenario: Successful listing
- **WHEN** any tenant member sends `GET /services`
- **THEN** the system returns 200 with an array of the tenant's services

#### Scenario: Only own tenant services returned
- **WHEN** a user from tenant A requests `GET /services`
- **THEN** the response MUST NOT include services from tenant B

### Requirement: Tenant can retrieve a service by ID
The system SHALL allow any authenticated tenant member to retrieve a single service by its ID.

#### Scenario: Service found
- **WHEN** any tenant member sends `GET /services/:id` for an existing service in their tenant
- **THEN** the system returns 200 with the service data

#### Scenario: Service not found or belongs to another tenant
- **WHEN** the user sends `GET /services/:id` for an ID that does not exist or belongs to another tenant
- **THEN** the system returns 404 Not Found

### Requirement: Tenant can update a service
The system SHALL allow users with role `owner` or `financial` to update a service's name, description, duration, or active flag.

#### Scenario: Successful update
- **WHEN** an `owner` or `financial` user sends `PATCH /services/:id` with valid fields
- **THEN** the system updates the service and returns 200 with the updated service

#### Scenario: Collaborator cannot update a service
- **WHEN** a `collaborator` user sends `PATCH /services/:id`
- **THEN** the system returns 403 Forbidden

#### Scenario: Cannot update service of another tenant
- **WHEN** the user sends `PATCH /services/:id` for a service belonging to another tenant
- **THEN** the system returns 404 Not Found

### Requirement: Tenant can delete a service
The system SHALL allow users with role `owner` or `financial` to permanently delete a service and its associated pricing tiers.

#### Scenario: Successful deletion
- **WHEN** an `owner` or `financial` user sends `DELETE /services/:id` for an existing service in their tenant
- **THEN** the system deletes the service and all its pricing tiers and returns 204 No Content

#### Scenario: Collaborator cannot delete a service
- **WHEN** a `collaborator` user sends `DELETE /services/:id`
- **THEN** the system returns 403 Forbidden

#### Scenario: Cannot delete service of another tenant
- **WHEN** the user sends `DELETE /services/:id` for a service belonging to another tenant
- **THEN** the system returns 404 Not Found

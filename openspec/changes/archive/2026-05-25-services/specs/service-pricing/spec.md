## ADDED Requirements

### Requirement: Tenant can configure pricing tiers for a service
The system SHALL allow users with role `owner` or `financial` to set pricing tiers for a service using a bulk PUT operation. The PUT replaces all existing pricing tiers for the service atomically. At least one tier MUST be provided.

#### Scenario: Successful pricing configuration
- **WHEN** an `owner` or `financial` user sends `PUT /services/:id/pricing` with a valid array of 1–4 pricing entries
- **THEN** the system replaces all existing pricing tiers for the service and returns 200 with the full updated list

#### Scenario: Empty array is rejected
- **WHEN** the user sends `PUT /services/:id/pricing` with an empty array
- **THEN** the system returns 400 with a validation error indicating at least one tier is required

#### Scenario: Duplicate pet sizes are rejected
- **WHEN** the user sends `PUT /services/:id/pricing` with two entries sharing the same pet_size
- **THEN** the system returns 400 with a validation error

#### Scenario: Collaborator cannot update pricing
- **WHEN** a `collaborator` user sends `PUT /services/:id/pricing`
- **THEN** the system returns 403 Forbidden

#### Scenario: Service belongs to another tenant
- **WHEN** the user sends `PUT /services/:id/pricing` for a service in a different tenant
- **THEN** the system returns 404 Not Found

### Requirement: Tenant can list pricing tiers for a service
The system SHALL allow any authenticated tenant member to retrieve all pricing tiers for a service.

#### Scenario: Successful pricing retrieval
- **WHEN** any tenant member sends `GET /services/:id/pricing`
- **THEN** the system returns 200 with an array of pricing entries, each containing pet_size and price

#### Scenario: Service not found
- **WHEN** the user sends `GET /services/:id/pricing` for a non-existent or cross-tenant service
- **THEN** the system returns 404 Not Found

### Requirement: Appointment price resolution uses service pricing by pet size
The system SHALL resolve the appointment service price by looking up the `ServicePricing` entry matching the pet's size. If no pricing entry exists for that pet size, the system SHALL return a validation error preventing the appointment from being created.

#### Scenario: Price found for pet size
- **WHEN** an appointment is created for a service and the pet has a size with a matching pricing tier
- **THEN** the system copies the tier's price into AppointmentService.price

#### Scenario: No pricing tier for pet size
- **WHEN** an appointment is being created for a service and no pricing tier exists for the pet's size
- **THEN** the system returns 422 with an error indicating no price is configured for that pet size

## MODIFIED Requirements

### Requirement: Collaborator cannot mutate products or categories
`POST`, `PATCH`, `DELETE` on `/products` and `/products/categories` SHALL be restricted. Collaborator may only read. Financial may read and write products but cannot delete categories. Only owner can delete categories. Checks SHALL use CASL ability instead of inline role comparisons.

#### Scenario: Collaborator cannot create a product
- **WHEN** an authenticated collaborator sends `POST /products`
- **THEN** the system returns 403

#### Scenario: Collaborator cannot update a product
- **WHEN** an authenticated collaborator sends `PATCH /products/:id`
- **THEN** the system returns 403

#### Scenario: Collaborator cannot create a category
- **WHEN** an authenticated collaborator sends `POST /products/categories`
- **THEN** the system returns 403

#### Scenario: Financial cannot delete a category
- **WHEN** an authenticated financial member sends `DELETE /products/categories/:id`
- **THEN** the system returns 403

#### Scenario: Owner can delete a category
- **WHEN** an authenticated owner sends `DELETE /products/categories/:id`
- **THEN** the system returns 204

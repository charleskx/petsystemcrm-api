## 1. Database migration

- [x] 1.1 Create migration `add_tenant_invitations_table` with columns: `id`, `tenant_id` (FK → tenants), `email`, `role` (member_role enum), `token` (UNIQUE), `expires_at`, `created_at`
- [x] 1.2 Add `tenant_invitations` Drizzle schema to `src/infra/database/drizzle/schema/tenants.ts`
- [x] 1.3 Export the new table from `src/infra/database/drizzle/schema/index.ts`

## 2. Domain & use cases

- [x] 2.1 Create `list-members.use-case.ts` in `src/application/member/` — queries `tenant_members` joined with `user`, returns array of `{ userId, name, email, role, joinedAt }`
- [x] 2.2 Create `invite-member.use-case.ts` — checks if user exists by email; if yes, inserts into `tenant_members` (checking duplicate); if no, creates `tenant_invitations` record (UUID token, `expires_at = now + 7 days`) and sends invite email via Resend
- [x] 2.3 Create `accept-invite.use-case.ts` — validates token (exists + not expired), creates user via `auth.api.signUpEmail`, inserts into `tenant_members`, deletes the invitation record
- [x] 2.4 Create `update-member-role.use-case.ts` — counts owners before downgrading; throws `LastOwnerError` if count === 1; updates `tenant_members.role`
- [x] 2.5 Create `remove-member.use-case.ts` — counts owners before removing; throws `LastOwnerError` if removing last owner; deletes from `tenant_members`

## 3. Email template

- [x] 3.1 Create Resend/React Email template for invite email in `src/infra/email/templates/` with the accept-invite link (`{API_URL}/tenants/{tenantId}/members/accept-invite?token={token}`)

## 4. HTTP routes

- [x] 4.1 Create `src/interfaces/http/routes/members.ts` with all 5 endpoints:
  - `GET /tenants/:tenantId/members`
  - `POST /tenants/:tenantId/members/invite`
  - `POST /tenants/:tenantId/members/accept-invite` (public — no `authenticate` preHandler)
  - `PATCH /tenants/:tenantId/members/:userId`
  - `DELETE /tenants/:tenantId/members/:userId`
- [x] 4.2 Add Zod validation schemas for each request body/params
- [x] 4.3 Map use case errors to HTTP status codes: `LastOwnerError → 409`, `MemberAlreadyExistsError → 409`, `InviteNotFoundError → 404`, `InviteExpiredError → 410`
- [x] 4.4 Register `membersRoutes` plugin in `src/main/server.ts`

## 5. Authorization checks

- [x] 5.1 In each mutating handler (`invite`, `update-role`, `remove`), check `request.tenantId === params.tenantId` and `request.role === 'owner'`; return 403 otherwise
- [x] 5.2 In `GET` handler, check `request.tenantId === params.tenantId`; return 403 otherwise

## 6. Tests

- [x] 6.1 Create `src/interfaces/http/routes/members.test.ts` covering:
  - List members (authenticated member of correct tenant)
  - Invite existing user (201)
  - Invite new user (202 + invitation record created)
  - Accept invite with valid token (201)
  - Accept invite with expired token (410)
  - Update role (200)
  - Downgrade last owner (409)
  - Remove member (204)
  - Remove last owner (409)
  - Non-owner attempts (403)
  - Wrong tenant access (403)

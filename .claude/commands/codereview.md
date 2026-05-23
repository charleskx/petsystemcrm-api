# Code Review

Perform a structured code review of the current branch changes.

## Steps

1. Run in parallel:
   - `git log main..HEAD --oneline` — understand the scope
   - `git diff main..HEAD` — see all changes
2. For each modified file, check:
   - **Correctness**: logic bugs, off-by-one errors, incorrect conditions, missing edge cases
   - **Security**: SQL/command injection, broken auth, sensitive data exposure, OWASP Top 10
   - **Quality**: naming clarity, unnecessary complexity, duplication, missing boundary validation
   - **Alignment**: does the implementation match what the commit messages describe?
3. Output findings grouped by severity

## Severity levels

**Critical** — must fix before merge
Data loss, security vulnerability, broken core functionality

**High** — should fix before merge
Significant bugs, poor security posture, incorrect business logic

**Medium** — fix soon
Code quality issues, maintainability problems

**Low** — consider fixing
Style inconsistencies, minor improvements

## Output format

```
[CRITICAL] src/infra/repositories/tenant-repository.ts:42
Missing tenant_id filter — query returns data across tenants.
Suggestion: add `.where(eq(tenants.tenantId, tenantId))` before executing.

[HIGH] src/interfaces/http/routes/products.ts:78
User input passed directly to filename without sanitization.
Suggestion: use a UUID-based filename on upload, discard the original name.
```

End with a one-line overall assessment: safe to merge / needs changes / blocking issues found.

## Project-specific checks

- All DB queries must filter by `tenant_id`
- Zod schemas must validate at HTTP boundary — no raw `req.body` access
- Subscription guard must be applied on all routes except `/auth/*`, `/billing/*`, `/payments/stripe/webhook`, `/health`
- Image uploads must validate mime type and enforce 5MB limit
- CPF/CNPJ fields must be validated by check digit, not just format
- `stripe_subscription_id` and `subscription_status` must only be updated via Stripe webhook handler

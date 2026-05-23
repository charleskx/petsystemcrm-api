# Pull Request

Create a pull request for the current branch with a structured description.

## Steps

1. Run in parallel:
   - `git status`
   - `git diff main...HEAD`
   - `git log main..HEAD --oneline`
2. If the branch has no remote tracking branch, push with `git push -u origin <branch>`
3. Draft PR title (≤70 chars, imperative verb) and body using the template below
4. Run: `gh pr create --title "<title>" --body "$(cat <<'EOF' ... EOF)"`
5. Return the PR URL

## PR body template

```markdown
## Description

<1-3 sentences on what this PR does and why>

## Type of change

- [ ] New feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Docs / config

## Changes

- <bullet list of key changes>

## Testing

- [ ] <step to verify the change works>

## Related issues

Closes #
```

## Rules

- Title: imperative, present tense, under 70 characters
- Never force-push to `main`
- If the PR touches subscription logic or Stripe webhooks, add a note about manual testing requirements
- If the PR changes DB schema, confirm migrations are included

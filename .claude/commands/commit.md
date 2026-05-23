# Commit

Create an atomic conventional commit for the staged changes.

## Steps

1. Run `git status` and `git diff --staged` to understand what is staged
2. If nothing is staged, run `git diff` to see unstaged changes and ask the user which files to stage
3. Choose the correct type: `feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `build` | `ci` | `chore` | `revert`
4. Write the commit message: `<type>[optional scope]: <description>` (imperative, present tense, ≤72 chars)
5. Add a body if the change needs context beyond the description
6. Run: `git commit -m "<message>"` — stage only related files

## Rules

- Stage only related files — never `git add .` blindly
- Use `--no-verify` only if the user explicitly requests it
- Description: imperative, present tense, under 72 characters
- Body lines wrap at 72 characters
- Reference issues in footer: `Closes #123`

## Types

| Type | When to use |
|------|-------------|
| `feat` | New feature for the user |
| `fix` | Bug fix for the user |
| `docs` | Documentation changes only |
| `style` | Formatting, missing semicolons — no logic change |
| `refactor` | Code refactor — no feature or bug fix |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `build` | Build system or dependency changes |
| `ci` | CI/CD configuration |
| `chore` | Other changes (tooling, config) |
| `revert` | Reverts a previous commit |

## Examples

```
feat(appointments): add available slots endpoint
fix(subscription): update expired status lazily on request
refactor(products): extract price calculation to domain service
chore: add biome lint config
```

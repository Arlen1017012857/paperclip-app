# ADR-002: Security Baseline

**Status**: Accepted
**Date**: 2026-05-13
**Author**: CTO
**Applies to**: All application code

## Context

This is a greenfield startup building toward MVP launch. Security cannot be retrofitted — it must be built in from the start. This ADR establishes mandatory security standards across four domains: secrets management, input validation, authentication/authorization, and dependency management.

The standards below balance startup velocity with responsible security hygiene. Nothing here requires a dedicated security team or slows shipping meaningfully — it's all automatable via CI, lint rules, and framework defaults.

## Decision

### 1. Secrets Management

**Rule**: Zero secrets in code. All secrets injected via environment variables at runtime.

| Secret type | Mechanism | Example |
|---|---|---|
| API keys | Environment variables via `.env` (ignored by git) | `DATABASE_URL=postgres://...` |
| JWT signing keys | `openssl rand -hex 64` generated, never committed | `JWT_SECRET` |
| Third-party tokens | Env vars, documented in `env.example` with placeholder values | `STRIPE_API_KEY=pk_...` |

**Enforcement**:
- `.env` is in `.gitignore` from day one
- `env.example` is committed with **empty/placeholder values only** (e.g., `DATABASE_URL=postgres://user:pass@localhost:5432/db`)
- CI runs a `detect-secrets` or `trufflehog` scan on every PR to catch accidental commits
- Secrets rotated if ever committed (even briefly)

**Tools**: `dotenv` / `direnv` for local dev; environment secrets in CI/deployment platform.

### 2. Input Validation

**Rule**: Validate at every system boundary. Reject early, reject loudly.

**Principles**:
- All external input (HTTP params, request bodies, query strings, headers, file uploads) is **untrusted**
- Use a validation library/schema system (Zod, Joi, or framework-native) — never manual `if/else` chains
- Validate at the API layer before data reaches business logic
- Use **allowlists** (what is allowed) not **blocklists** (what is denied)

**Standards**:
- JSON APIs: typed schemas with runtime validation (e.g., Zod for Node.js, Pydantic for Python)
- IDs: UUID v4 or database-assigned integers — never user-supplied for access control
- File uploads: validate MIME type, size cap, reject executables/archives unless expected
- SQL: parameterized queries or ORM — **no string concatenation** (this is the single highest-impact rule)
- Redirects/URLs: validate against an allowlist of permitted domains

**Enforcement**:
- Every API endpoint has an input validation layer before the handler
- CI fails if validation schema coverage drops below 90% of endpoints
- Lint rule against `exec()`/`eval()` usage
- Test for SQL injection vectors on every DB-facing endpoint

### 3. Authentication & Authorization

**Rule**: Auth framework from day one, even before launch with a single user.

**Authentication** (identity verification):
- Use a well-vetted auth library (Passport.js, NextAuth, Supabase Auth, or framework equivalent)
- **Password requirements**: minimum 8 chars, bcrypt (cost >= 10) or Argon2id hashing
- Session tokens: HTTP-only, Secure, SameSite=Lax cookies; server-side session store if stateful
- JWT (if stateless): short expiry (15 min access, 7 day refresh with rotation), signed with RS256 or HS256
- Rate-limit login attempts (5 failures → 15 min lockout per IP/username)

**Authorization** (access control):
- Every protected endpoint enforces a check: "is this user allowed to do this to this resource?"
- Use a consistent pattern (e.g., middleware or guard) — not ad-hoc checks scattered in handlers
- Reject with **403** (not 404) when authorized but not permitted; this avoids leaking existence info
- Row-level access: never trust client-provided IDs for ownership checks — always verify against session

**Enforcement**:
- Integration test: unauthenticated request to every protected endpoint returns 401
- Integration test: user A cannot access user B's resources
- Middleware/guard runs before handler for all protected routes

### 4. Dependency Management & CVE Scanning

**Rule**: Every dependency is a risk. Minimize, pin, scan.

**Standards**:
- Pin exact versions (no `^`/`~` ranges) in lockfiles — lockfiles are committed
- Only add a dependency when the value is clear; prefer standard library or well-maintained libraries over niche packages
- Scan for CVEs on every CI run (`npm audit`, `pip audit`, `osv-scanner`, or `snyk`)
- Weekly `npm outdated` / `pip list --outdated` review as part of maintenance
- Zero tolerance for **critical/high** severity CVEs without documented exception
- Keep framework upgrades current within 1 minor version

**CI Enforcement**:
- `npm audit --audit-level=high` (or equivalent) fails the build if critical or high CVEs exist
- `depcheck` or equivalent runs to detect unused dependencies (remove them)
- Dependabot / Renovate configured for automated PRs on patch updates

### 5. Additional: HTTP Security Headers

**Rule**: Set security headers at the reverse proxy or framework level.

```
Strict-Transport-Security: max-age=63072000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

### 6. Additional: Error Handling

**Rule**: Never expose internals in error responses.

- Production: return generic error messages (`"An error occurred"`) with a correlation ID for logging
- Development: stack traces via env-conditional only (`NODE_ENV=development`)
- Log detailed errors server-side, never client-side

## Consequences

**Positive**:
- Security posture is defined before code ships, preventing retrofits
- CI automation means enforcement costs near zero per developer
- Clear rules for future engineering hires to follow without ambiguity

**Negative**:
- Some checks require CI pipeline setup before they gate anything
- Input validation schemas add boilerplate per endpoint (but also serve as documentation)
- Opinionated choices (e.g., bcrypt over MD5) limit flexibility but eliminate entire classes of vulnerability

**Risk**: If CI enforcement is not implemented before shipping code, these rules become suggestions rather than guarantees. CI setup (TASK-03) must include the security scanning steps.

## Implementation Roadmap

| Phase | What | When |
|---|---|---|
| Scaffold | `.gitignore` with `.env`, `env.example`, lockfile committed | TASK-02 |
| CI setup | `detect-secrets`, `npm audit`, lint rules in CI pipeline | TASK-03 |
| MVP | Auth middleware + input validation on every endpoint | TASK-05 |
| Pre-launch | Full CVE scan, penetration test of auth flow | TASK-07 (this review) |

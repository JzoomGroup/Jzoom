# Production Promotion Checklist

This checklist is for promoting the approved staging2 code line to the official production
domains. It does not authorize deployment by itself.

## Approved Source

- Source branch: `codex/premium-modular-os-staging2-preview`
- Production target branch: `main`
- Production web domain: `https://portal.jzoom.sa`
- Production API domain: `https://api.jzoom.sa`
- UAT web domain, later: `https://uat-portal.jzoom.sa`
- UAT API domain, later: `https://uat-api.jzoom.sa`

## Hard Blocks Before Domain Switch

- Do not use the staging2 database as production data without a separate live DB audit.
- Do not copy staging-only post-deployment commands into production.
- Do not run demo seed scripts in production.
- Do not run `reset-staging-qa-passwords.ts` in production.
- Do not keep `BOOTSTRAP_ADMIN_EMAIL` or `BOOTSTRAP_ADMIN_PASSWORD` as long-lived runtime
  variables.
- Do not enable `AUTH_EXPOSE_TEST_TOKENS` in production.
- Do not expose OpenAPI publicly unless it is explicitly protected.

## Production v2 Environment

API variables must point only to production resources:

- `DATABASE_URL`: production database only.
- `WEB_ORIGIN=https://portal.jzoom.sa`
- `AUTH_COOKIE_SECURE=true`
- `AUTH_EXPOSE_TEST_TOKENS=false`
- `OPENAPI_ENABLED=false`
- `JZOOM_UPLOAD_ROOT`: persistent production upload storage.

Web variables must point only to production resources:

- `NEXT_PUBLIC_API_BASE_URL=https://api.jzoom.sa/api/v1`
- `NEXT_PUBLIC_AUTH_COOKIE_NAME`: same cookie name expected by the API.
- `NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME`: same CSRF cookie name expected by the API.

## Required Backups

- Git tag for the approved release commit.
- Production database backup before switch.
- Production file storage backup before switch.
- Old production Coolify/env snapshot.
- New production Coolify/env snapshot.

## Smoke Tests Before Official Domains

- Web health check.
- API liveness and readiness.
- Login and logout.
- Session and CSRF cookie behavior.
- CORS from the web origin to the API origin.
- Admin user management and password reset to the default temporary password.
- Client request creation.
- Specialist request handling and document request.
- Project specialist project output flow.
- Supervisor approval or return.
- Account manager portfolio.
- Management dashboard.
- File upload and download.
- Output approval and return.
- Audit/activity log creation.

## Rollback

Keep the old production resources archived/read-only for 14 days after a successful switch. If a
critical issue appears, move `portal.jzoom.sa` and `api.jzoom.sa` back to the old resources and
preserve both old and new database/storage snapshots for investigation.

# Staging Readiness

This document describes a safe staging path for final review. It is not a production launch
checklist and must not contain real secrets.

## Recommended staging setup

- Managed PostgreSQL 17 or compatible PostgreSQL service.
- API runtime for the NestJS app.
- Web runtime for the Next.js app.
- Worker runtime for background processing foundations.
- HTTPS for web and API.
- Centralized logs for API, web, worker, and database events.
- Secret manager or encrypted platform environment variables.
- Separate staging database, storage, domains, and credentials from production.

## Required services

- PostgreSQL with migration access from the deployment runner.
- API service exposing `/api/v1`.
- Web service configured with the staging API URL.
- Worker service with the same release version as API and web.
- Artifact storage only when future file/PDF storage is configured; current generated PDF behavior
  should be verified against the implemented storage metadata path.

## Required environment variables

Use `.env.example` as the baseline and provide staging-specific values through the hosting platform:

- `NODE_ENV=production`
- `API_PORT`
- `DATABASE_URL`
- `OPENAPI_ENABLED=false` unless staging API docs are intentionally exposed behind access controls.
- `WEB_ORIGIN`
- `AUTH_SESSION_TTL_MINUTES`
- `AUTH_COOKIE_NAME`
- `AUTH_CSRF_COOKIE_NAME`
- `AUTH_COOKIE_SECURE=true`
- `AUTH_EXPOSE_TEST_TOKENS=false`
- `AUTH_MAX_LOGIN_ATTEMPTS`
- `AUTH_LOCKOUT_MINUTES`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME`
- `WORKER_NAME`

Use `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` only for a one-time bootstrap command,
then remove them immediately from the staging environment. Never store bootstrap credentials as
long-lived runtime variables.

## Database setup

1. Provision an empty staging PostgreSQL database.
2. Confirm `DATABASE_URL` points to staging, not local or production.
3. Run:

   ```powershell
   pnpm --filter @jzoom/database migrate:deploy
   pnpm --filter @jzoom/database seed
   ```

4. Re-run the seed once to confirm idempotency.
5. Confirm the `blueprint_imports` records include the expected workbook hash/version.

## Deployment order

1. Build and publish API, web, and worker artifacts from the same commit.
2. Run database migrations.
3. Run the Excel V3 seed pipeline.
4. Bootstrap the first staging Admin if no active Admin exists.
5. Deploy or restart the API.
6. Deploy or restart the worker.
7. Deploy or restart the web app.
8. Verify health checks and core flows.

## Health checks

- API liveness: `GET /api/v1/health/live`
- API readiness: `GET /api/v1/health/ready`
- Web root: `GET /`
- Container/process health from the hosting platform.
- Worker process is running and logging startup with the configured worker name.

Readiness must fail closed when PostgreSQL is unavailable.

## Post-deployment verification

Run the QA checklist in `docs/QA_CHECKLIST.md`, with special attention to:

- Login/logout and session expiry.
- Admin-only configuration access.
- Client portal data isolation.
- Quote and invoice snapshot immutability.
- Quote and invoice PDF generation from snapshots.
- Request lifecycle and internal/client visibility boundaries.
- RTL/mobile sanity after PR 20 design-system changes.

## Rollback notes

- Prefer rolling back application services to the previous known-good image before database rollback.
- Do not manually edit immutable quote, invoice, report, or closing snapshots.
- If a migration has already run, inspect whether it is backward compatible before rolling back code.
- Keep a database backup before staging migrations.
- If seed data needs to be restored, rerun the approved seed pipeline rather than hand-editing
  catalog/configuration rows.

## Security reminders

- Do not enable `AUTH_EXPOSE_TEST_TOKENS` in staging.
- Do not expose Swagger/OpenAPI UI publicly unless explicitly protected.
- Do not use production secrets, production client data, or production credentials in staging.
- Verify cookies are secure over HTTPS and that CORS `WEB_ORIGIN` matches the staging web origin.

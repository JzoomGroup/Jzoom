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
- Persistent artifact storage for uploaded request attachments and requested client documents.
  The API currently stores uploaded file bytes on the local filesystem path configured by
  `JZOOM_UPLOAD_ROOT`; that path must survive container restarts and redeployments.

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
- `JZOOM_UPLOAD_ROOT` pointing to a persistent writable API volume, for example
  `/var/lib/jzoom/uploads` or the platform equivalent.
- `JZOOM_UPLOAD_MAX_BYTES`, set to the approved maximum request-file size in bytes. If omitted,
  the API defaults to 25 MB.

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

## Upload storage verification

Before opening staging to users:

1. Confirm the API process can write to `JZOOM_UPLOAD_ROOT`.
2. Upload a requested client document from the client portal.
3. Download the same document from the client request detail.
4. Upload an internal request attachment and download it from the internal request detail.
5. Restart or redeploy the API service.
6. Repeat the downloads and confirm the files still exist.

If downloads fail after restart, the upload path is not persistent and staging is not ready for
real user file testing.

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
- Request attachment upload/download and client requested-document upload/download.
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

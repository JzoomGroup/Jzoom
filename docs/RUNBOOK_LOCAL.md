# Local Runbook

This runbook is for safe local development and final QA of the Jzoom Operating Platform. It does
not define production credentials or deployment policy.

## Required tools

- Git.
- Node.js 24, matching `.node-version` and `.nvmrc`.
- Corepack with pnpm 11.8.0.
- Docker Desktop or Docker Engine with Docker Compose.
- A terminal that can run PowerShell examples, or equivalent shell commands.

Enable pnpm through Corepack:

```powershell
corepack enable
corepack prepare pnpm@11.8.0 --activate
```

## Clone and install

```powershell
git clone https://github.com/Swayyan/Jzoom.git
Set-Location Jzoom
Copy-Item .env.example .env
pnpm install
```

Before continuing, edit `.env` and replace placeholder local passwords. Never commit `.env` or any
real secret. The repository intentionally tracks `.env.example` only.

## Start PostgreSQL

For local development, start PostgreSQL first:

```powershell
docker compose up -d postgres
docker compose ps
```

The default local database URL from `.env.example` is:

```text
postgresql://jzoom:replace_with_local_password@localhost:5432/jzoom?schema=public
```

If you keep the Compose fallback password instead of editing `.env`, align `DATABASE_URL` and
`POSTGRES_PASSWORD` before running migrations.

## Generate Prisma, migrate, and seed

```powershell
pnpm prisma:generate
pnpm --filter @jzoom/database migrate:deploy
pnpm --filter @jzoom/database seed
```

The seed uses the checked-in Excel V3 blueprint files under `data/blueprints` and is designed to be
idempotent. Re-running the seed should not create duplicate catalog or configuration records.

## Create a local Admin account

PR 3 intentionally avoided demo passwords. To create the first local Admin, provide bootstrap
credentials only for this command:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL="admin.local@example.com"
$env:BOOTSTRAP_ADMIN_PASSWORD="replace_with_a_unique_12_plus_character_password"
pnpm --filter @jzoom/api bootstrap:admin
Remove-Item Env:\BOOTSTRAP_ADMIN_EMAIL
Remove-Item Env:\BOOTSTRAP_ADMIN_PASSWORD
```

Use local-only test accounts. Do not reuse production emails, production passwords, or shared
credentials.

## Start the apps

Start API, web, and worker together:

```powershell
pnpm dev
```

Or start individual apps in separate terminals:

```powershell
pnpm --filter @jzoom/api dev
pnpm --filter @jzoom/web dev
pnpm --filter @jzoom/worker dev
```

Local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`
- Swagger UI in non-production when enabled: `http://localhost:4000/docs`
- API liveness: `http://localhost:4000/api/v1/health/live`
- API readiness: `http://localhost:4000/api/v1/health/ready`

Liveness only checks that the API process is running. Readiness performs a PostgreSQL query and
returns HTTP `503` when the database is unavailable.

## Full local container stack

To build and run PostgreSQL, API, web, and worker through Compose:

```powershell
docker compose up --build
```

Use this after validating the normal local path. It is useful for checking Dockerfiles and
production-like process startup.

## Quality commands

Run the same broad checks used by CI:

```powershell
pnpm --filter @jzoom/database generate
pnpm --filter @jzoom/database migrate:status
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm openapi:generate
```

When PostgreSQL is available, also run an idempotency sanity check:

```powershell
pnpm --filter @jzoom/database seed
pnpm --filter @jzoom/database seed
```

Integration tests that require PostgreSQL use:

```powershell
$env:DATABASE_INTEGRATION="true"
pnpm --filter @jzoom/api test
Remove-Item Env:\DATABASE_INTEGRATION
```

## Stop or reset local services

Stop containers without deleting data:

```powershell
docker compose down
```

Reset the local database volume only when you intentionally want a clean database:

```powershell
docker compose down -v
docker compose up -d postgres
pnpm --filter @jzoom/database migrate:deploy
pnpm --filter @jzoom/database seed
```

## Common troubleshooting

- `DATABASE_URL is required`: confirm `.env` exists and includes a PostgreSQL connection string.
- Readiness returns `503`: PostgreSQL is not running, unhealthy, or `DATABASE_URL` does not match
  the local container credentials.
- Login fails after reset: recreate the local Admin with `bootstrap:admin`.
- CSRF/logout issues in web: make sure `AUTH_CSRF_COOKIE_NAME` and
  `NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME` point to the same cookie name.
- `next build` or tests fail with process-spawn errors in a restricted shell: rerun in a normal
  local terminal.
- Docker build fails while API imports Prisma: run `pnpm --filter @jzoom/database generate`, then
  retry the build.

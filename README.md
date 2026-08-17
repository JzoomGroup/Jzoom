# Jzoom Operating Platform

Production-grade TypeScript monorepo for the Jzoom Operating Platform. It includes the Arabic-first
Next.js portal, NestJS API, role and permission enforcement, revisioned PostgreSQL business data,
service and pricing management, requests, projects, files, outputs, approvals, reports, and audit
records.

## Workspace

```text
apps/
  api/       NestJS REST API
  web/       Next.js portal, centralized interface copy, and Playwright browser tests
  worker/    NestJS background-worker foundation
packages/
  config/    Validated environment contracts
  contracts/ Shared API/request types
  database/  Prisma 7 models, migrations, Excel normalizer, and idempotent seed
data/
  blueprints/ Checked-in Excel V3 source, manifest, and approved control additions
docs/
  blueprint/        Formal data and control references
  RUNBOOK_LOCAL.md  Local setup and safe test commands
```

## Prerequisites

- Node.js 24
- pnpm 11 through Corepack
- Docker with Docker Compose
- Git

Enable the package manager:

```powershell
corepack enable
corepack prepare pnpm@11.8.0 --activate
```

## Local setup

```powershell
Copy-Item .env.example .env
pnpm install
docker compose up -d postgres
pnpm prisma:generate
pnpm --filter @jzoom/database migrate:deploy
pnpm --filter @jzoom/database seed
pnpm dev
```

Services:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Swagger UI in non-production: `http://localhost:4000/docs`
- Liveness: `http://localhost:4000/api/v1/health/live`
- Readiness: `http://localhost:4000/api/v1/health/ready`

The liveness endpoint reports only whether the API process is running. Readiness performs a real
PostgreSQL query and returns HTTP `503` when the database is unavailable.

## Full container startup

```powershell
docker compose up --build
```

This starts PostgreSQL, the API, the web shell, and the empty worker.

## Quality commands

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm openapi:generate
```

`pnpm test` builds the workspace first so tests consume the same generated Prisma client and
compiled workspace packages used by production.

Frontend ownership is documented beside the code in
`apps/web/src/app/styles/README.md`, `apps/web/src/i18n/README.md`, and
`apps/web/src/components/admin-access/README.md`.

The GitHub Actions foundation workflow runs formatting, linting, type-checking, build/tests,
PostgreSQL migrations and seed idempotency checks, OpenAPI artifact generation, and independent
API/web/worker image builds.

## API conventions established in PR 1

- REST prefix: `/api/v1`
- Request ID header: `X-Request-Id`
- JSON structured logging
- Standard API error response
- Global exception sanitization
- OpenAPI JSON generation
- Swagger UI disabled by default in production

Example error:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "fieldErrors": [],
  "requestId": "2c252c56-8b2a-4f1c-aea4-ae92791ec455",
  "timestamp": "2026-06-21T12:00:00.000Z",
  "path": "/api/v1/example"
}
```

## PR 2 database configuration

Excel V3 is the initial source for catalog, permissions, package mappings, workflows, validation,
PDF mappings, audit definitions, notification templates, platform settings, and localization
labels. Every source sheet is retained as a SHA-256-tracked database snapshot.

The normalized catalog is stored in PostgreSQL using stable records plus revision history so later
Admin Console work can add, edit, disable, archive, reorder, and configure it without code changes.
Re-running the same workbook seed is idempotent and does not overwrite later Admin edits.

See [PR 2 blueprint controls](docs/blueprint/pr2-control-updates.md).

## Final QA and staging readiness

- [Local runbook](docs/RUNBOOK_LOCAL.md)
- [Staging readiness notes](docs/STAGING_READINESS.md)
- [Final QA checklist](docs/QA_CHECKLIST.md)
- [Production promotion checklist](docs/PRODUCTION_PROMOTION_CHECKLIST.md)

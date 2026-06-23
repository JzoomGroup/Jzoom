# Jzoom Developer Handover for OVH Deployment

This document is for an external developer who will receive GitHub access and help review, deploy,
maintain, and run the Jzoom platform on OVH infrastructure. It is intentionally operational and
plain-spoken: start here if you have never seen the project before.

Do not treat any example password, domain, database URL, or email in this document as a production
secret. Real credentials must be created and stored only in the deployment environment.

## 1. Executive summary

Jzoom is a production-oriented operating platform for managing premium business services,
commercial proposals, client delivery, internal work execution, hours, reports, and client-facing
service visibility.

Business purpose:

- Normalize Jzoom service catalogs from the approved Excel V3 blueprint into PostgreSQL.
- Let Admin users configure services, service items, packages, pricing rules, templates, workflows,
  labels, and platform settings without code changes.
- Let internal Jzoom teams prepare pricing, quotes, invoices, service requests, outputs, documents,
  reports, and monthly closings.
- Let clients access only safe client-facing data through a protected client portal.

Main user roles:

- Admin.
- Jzoom Management.
- Account Manager.
- Supervisor.
- Specialist.
- Client user.

Main modules:

- Authentication, sessions, RBAC, and backend scopes.
- Admin Console and configurable catalogs.
- Pricing Studio, quote snapshots, invoice snapshots, and PDFs.
- Client portal.
- Request lifecycle, internal queues, outputs, documents, workflow/checklists, and hours.
- Notifications, monthly reports, account manager portfolio, platform configuration, and service
  item request templates.

Current implementation status:

- The platform is implemented through PR 21 plus the follow-up English LTR visual fix.
- The latest `main` branch includes final QA/staging documentation and the Jzoom premium design
  system.
- The platform is ready for local/staging setup and QA, but production deployment still requires
  infrastructure provisioning, secrets, database backups, domain/SSL setup, and final staging
  verification.

## 2. Platform scope summary

Implemented platform modules:

- Authentication and RBAC: login, logout, secure sessions, password hashing, password reset and
  invitation foundations, backend guards, role checks, permission checks, scope checks, and last
  Admin lockout prevention.
- Admin Console: protected Admin shell for configuration and catalog administration.
- Monthly services catalog: categories, services, service items, service levels/packages, package
  inclusion, hours, rates, ordering, lifecycle status, archive/disable safety.
- One-time services catalog: categories, services, paths/types, phases, deliverables, tasks, base
  price, estimated hours, internal cost/rate inputs, duration, ordering, lifecycle status, archive
  safety.
- Pricing Studio: rate cards, setup fees, margins, discounts, taxes, effective dates, versioning,
  pricing preview, draft save/reload, backend recalculation.
- Quote creation and immutable snapshots: quotes are created from saved pricing drafts and store
  selected services, prices, discounts, totals, client details, terms, and pricing rule versions.
- Quote PDF: generated from immutable quote snapshots only.
- Internal quote acceptance/status flow: internal authorized users manage quote lifecycle statuses;
  client portal quote acceptance is intentionally not implemented.
- Invoice creation from accepted quote snapshots: invoices are created only from accepted quote
  snapshots and store immutable invoice snapshots.
- Invoice PDF: generated from immutable invoice snapshots only.
- Client portal: client-only protected layout, client-safe quote/invoice/request/report views, PDF
  downloads, and client organization isolation.
- Request lifecycle: internal creation, source links, statuses, assignment, comments, internal
  notes, client-safe request view, attachments metadata foundation.
- Internal work queues: specialist, supervisor, account manager/internal queues, assignment,
  status transitions, workload counters, and supervisor review actions.
- Output delivery: internal outputs, internal review, share approved outputs with clients, client
  accept/return, return notes, activity/audit events.
- Document request/upload: internal document requests and client upload metadata/visibility
  controls.
- Workflow/checklist foundation: simple request checklist support, pending/done/not applicable
  statuses, future-ready for a visual workflow builder.
- Hours ledger: time entries, approval/rejection, summaries by client/request/service/user/month,
  monthly usage, and monthly closing snapshots.
- Monthly closing: closing drafts and finalized immutable monthly snapshots.
- Notifications/outbox foundation: in-app notifications, read/unread state, outbox/event
  foundation, external channels future-ready but not sending.
- Monthly reports: internal report preparation and client-safe report views.
- Account Manager portfolio: assigned clients, open requests, attention indicators, recent
  activity, simple health indicator.
- Platform configuration: Admin-managed settings, branding settings, localization labels,
  notification templates, PDF template settings, workflow/checklist templates, and business text
  templates.
- Service item request templates: service-item-linked dynamic request forms, field library,
  suggested forms, versions, document checklist, and request response sidecars.
- Design system and UI polish: Arabic-first premium Jzoom UI, modern responsive styling, LTR
  handling for English-only public/placeholder pages.
- Final QA/runbook/staging readiness: local runbook, staging readiness notes, and QA checklist.

## 3. Technical architecture

- Monorepo: pnpm workspace with apps and shared packages.
- Web app: Next.js app in `apps/web`.
- API app: NestJS REST API in `apps/api`.
- Worker: NestJS worker scaffold in `apps/worker`; currently foundation-level with no external
  channel sending.
- Database: PostgreSQL.
- ORM: Prisma 7, schema and migrations in `packages/database/prisma`.
- Docker: Dockerfiles for API, web, and worker plus `compose.yaml` for local PostgreSQL/full stack.
- OpenAPI: API generates OpenAPI JSON through `pnpm openapi:generate`; Swagger UI is available in
  non-production when enabled.
- PDF generation: quote and invoice PDFs use `pdf-lib`; PDFs are generated from immutable quote or
  invoice snapshots only.
- Authentication/session approach: API-managed secure sessions using HttpOnly cookies and CSRF
  cookie/header protection when using cookie sessions.
- RBAC/scopes: backend-enforced guards for roles, permissions, and data scopes such as own client,
  assigned clients, assigned work, team/domain, and global Admin/Management.
- File/document metadata approach: metadata and visibility controls are stored in PostgreSQL.
  Advanced object storage integration is future-ready but must be configured before real file
  storage production use.
- Snapshot strategy:
  - Quote snapshots do not change when catalogs/pricing/drafts change later.
  - Invoice snapshots do not recalculate from live catalog, pricing rules, quotes, or edited data.
  - Monthly reports/closings store snapshot summaries.
  - Request form responses store template snapshots so later template edits do not mutate
    submitted responses.

## 4. Repository structure

Important folders:

- `apps/web`: Next.js web app, routes, UI components, client-side API wrappers, web tests.
- `apps/api`: NestJS REST API, auth, guards, controllers, services, OpenAPI generation, API tests.
- `apps/worker`: Worker scaffold for future PDFs/imports/exports/notifications/outbox processing.
- `packages/database`: Prisma schema, migrations, generated client, Excel V3 normalizer, seed
  pipeline, schema tests.
- `packages/config`: environment validation for API, web, and worker.
- `packages/contracts`: shared TypeScript contracts.
- `docs`: architecture, blueprint controls, runbooks, staging notes, QA checklists, and this
  handover document.
- `apps/*/Dockerfile`: separate container builds for API, web, and worker.
- `compose.yaml`: local Compose setup for PostgreSQL, API, web, and worker.
- `packages/database/prisma/schema.prisma`: source of database models.
- `packages/database/prisma/migrations`: versioned database migrations.
- `packages/database/src/seed.ts` and `packages/database/src/seed`: Excel V3 seed/normalization
  pipeline.

## 5. Environment variables

Use `.env.example` as the only committed example. Do not commit `.env`, `.env.production`, real
passwords, tokens, keys, or connection strings.

| Variable                            | Used by                  | Local                          | Staging/Production          | Purpose                                                                       |
| ----------------------------------- | ------------------------ | ------------------------------ | --------------------------- | ----------------------------------------------------------------------------- |
| `NODE_ENV`                          | API/web/worker           | `development`                  | `production`                | Runtime mode. Production changes defaults such as OpenAPI and secure cookies. |
| `API_PORT`                          | API                      | `4000`                         | Deployment-defined          | API listen port.                                                              |
| `DATABASE_URL`                      | API/database seed/Prisma | Required                       | Required secret             | PostgreSQL connection string.                                                 |
| `OPENAPI_ENABLED`                   | API                      | `true`                         | Usually `false`             | Enables Swagger/OpenAPI UI outside production.                                |
| `WEB_ORIGIN`                        | API                      | `http://localhost:3000`        | Staging/prod web URL        | CORS/cookie origin.                                                           |
| `AUTH_SESSION_TTL_MINUTES`          | API                      | `480`                          | Security-defined            | Session lifetime.                                                             |
| `AUTH_COOKIE_NAME`                  | API                      | `jzoom_session`                | Secure unique value allowed | Session cookie name.                                                          |
| `AUTH_CSRF_COOKIE_NAME`             | API                      | `jzoom_csrf`                   | Match web config            | CSRF cookie name.                                                             |
| `AUTH_COOKIE_SECURE`                | API                      | `false`                        | `true`                      | Secure cookies over HTTPS.                                                    |
| `AUTH_EXPOSE_TEST_TOKENS`           | API                      | `false`                        | Must be `false`             | Test-only token exposure; blocked in production.                              |
| `AUTH_MAX_LOGIN_ATTEMPTS`           | API                      | `5`                            | Security-defined            | Login attempt protection.                                                     |
| `AUTH_LOCKOUT_MINUTES`              | API                      | `15`                           | Security-defined            | Lockout period.                                                               |
| `BOOTSTRAP_ADMIN_EMAIL`             | API script only          | Optional one-time              | Optional one-time           | First Admin bootstrap email. Remove after use.                                |
| `BOOTSTRAP_ADMIN_PASSWORD`          | API script only          | Optional one-time              | Optional one-time secret    | First Admin bootstrap password. Remove after use.                             |
| `NEXT_PUBLIC_API_BASE_URL`          | Web                      | `http://localhost:4000/api/v1` | Public API URL              | Web-to-API base URL.                                                          |
| `NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME` | Web                      | `jzoom_csrf`                   | Match API CSRF cookie       | Lets the web send the correct CSRF header.                                    |
| `WORKER_NAME`                       | Worker                   | `jzoom-worker`                 | Deployment-defined          | Worker log/process name.                                                      |
| `POSTGRES_DB`                       | Compose PostgreSQL       | `jzoom`                        | Local/Compose only          | Database name for Compose.                                                    |
| `POSTGRES_USER`                     | Compose PostgreSQL       | `jzoom`                        | Local/Compose only          | Database user for Compose.                                                    |
| `POSTGRES_PASSWORD`                 | Compose PostgreSQL       | local password                 | Secret                      | Compose PostgreSQL password.                                                  |

Local required variables:

- `DATABASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- Auth cookie names if changed from defaults.
- Compose PostgreSQL variables if using Compose.

Staging required variables:

- All API variables except bootstrap variables after bootstrap is complete.
- `NEXT_PUBLIC_API_BASE_URL`.
- `NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME`.
- `WORKER_NAME`.
- Production-grade `DATABASE_URL`.

## 6. Local setup guide

Clone and install:

```powershell
git clone https://github.com/JzoomGroup/Jzoom.git
Set-Location Jzoom
corepack enable
corepack prepare pnpm@11.8.0 --activate
pnpm install
Copy-Item .env.example .env
```

Edit `.env` and replace placeholder local passwords.

Start PostgreSQL:

```powershell
docker compose up -d postgres
docker compose ps
```

Generate Prisma, migrate, and seed:

```powershell
pnpm prisma:generate
pnpm --filter @jzoom/database migrate:deploy
pnpm --filter @jzoom/database seed
```

Create the first local Admin:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL="admin.local@jzoom.test"
$env:BOOTSTRAP_ADMIN_PASSWORD="JzoomLocalOnly!2026"
pnpm --filter @jzoom/api bootstrap:admin
Remove-Item Env:\BOOTSTRAP_ADMIN_EMAIL
Remove-Item Env:\BOOTSTRAP_ADMIN_PASSWORD
```

Start all apps:

```powershell
pnpm dev
```

Or start separately:

```powershell
pnpm --filter @jzoom/api dev
pnpm --filter @jzoom/web dev
pnpm --filter @jzoom/worker dev
```

Expected local URLs:

- Web URL: `http://localhost:3000`
- API base URL: `http://localhost:4000/api/v1`
- API liveness: `http://localhost:4000/api/v1/health/live`
- API readiness: `http://localhost:4000/api/v1/health/ready`
- OpenAPI/Swagger UI, non-production only when enabled: `http://localhost:4000/docs`

## 7. Demo users

Important current status:

- The database seed creates roles, permissions, catalogs, pricing/configuration foundations, and
  templates from Excel V3.
- The current committed seed does not create deterministic multi-role demo users.
- The committed bootstrap script creates only the first active Admin when no active Admin exists.
- Do not invent or reuse production credentials.

Use these local/staging-only demo account values when creating test users. They are not active
until created in the local/staging database.

| Role             | Email/username                | Local/staging-only password | Recommended start page | What to test                                                                                 |
| ---------------- | ----------------------------- | --------------------------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| Admin            | `admin.local@jzoom.test`      | `JzoomLocalOnly!2026`       | `/admin/catalog`       | Admin Console, catalogs, pricing rules, platform configuration, request templates, settings. |
| Jzoom Management | `management.local@jzoom.test` | `JzoomLocalOnly!2026`       | `/reports`             | Internal overview, reports, hours/closing visibility, management-level operations.           |
| Account Manager  | `am.local@jzoom.test`         | `JzoomLocalOnly!2026`       | `/account-manager`     | Assigned clients, pricing studio, quotes, invoices, portfolio activity.                      |
| Supervisor       | `supervisor.local@jzoom.test` | `JzoomLocalOnly!2026`       | `/requests/queues`     | Supervisor queue, output review, returns, approvals, time review.                            |
| Specialist       | `specialist.local@jzoom.test` | `JzoomLocalOnly!2026`       | `/requests/queues`     | Assigned work, request execution, checklist, internal outputs, time entries.                 |
| Client user      | `client.local@jzoom.test`     | `JzoomLocalOnly!2026`       | `/client`              | Client portal, quotes/invoices, requests, outputs, document uploads, reports.                |

How to create demo users today:

1. Run migrations and seed.
2. Bootstrap the Admin user with `pnpm --filter @jzoom/api bootstrap:admin`.
3. Start API and web.
4. Log in as Admin.
5. Use the Admin auth/invitation foundation or direct local database tooling to create the
   remaining local/staging users with the role codes below.
6. Assign client users to a local/staging client organization before testing the client portal.

Expected role codes:

- Admin: `ROLE-ADMIN`
- Jzoom Management: `ROLE-MGMT`
- Account Manager: `ROLE-AM`
- Supervisor: `ROLE-SUPERVISOR`
- Specialist: `ROLE-SPECIALIST`
- Client user: `ROLE-CLIENT`

If deterministic demo users are required after every reset, create a dedicated future
documentation/seed PR for a local/staging-only demo seed script. That script should be opt-in, must
never run in production, and should hash passwords using the existing password hasher.

## 8. OVH deployment guide

Recommended OVH hosting type:

- Prefer OVH VPS, Dedicated Server, or Public Cloud.
- Avoid basic shared hosting for this platform because it needs Node.js processes, PostgreSQL,
  background worker runtime, environment variables, reverse proxy control, SSL, logs, backups, and
  migrations.

Recommended baseline server specs for staging/small production:

- Ubuntu 24.04 LTS.
- 2 to 4 vCPU.
- 4 GB RAM minimum; 8 GB recommended.
- 80 GB SSD minimum.
- Regular backups enabled.
- Separate managed PostgreSQL preferred for production; local Docker PostgreSQL is acceptable only
  for staging or low-risk internal preview.

Install Docker and Compose on Ubuntu:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg git ufw
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
docker --version
docker compose version
```

Clone and configure:

```bash
git clone https://github.com/JzoomGroup/Jzoom.git
cd Jzoom
cp .env.example .env
nano .env
```

Set real staging values in `.env` or, preferably, in the hosting/secret manager. Do not commit the
file.

PostgreSQL options:

1. Preferred production option: OVH managed PostgreSQL or a separately managed PostgreSQL server.
2. Simpler staging option: PostgreSQL container from `compose.yaml`.

Run migrations and seed:

```bash
corepack enable
corepack prepare pnpm@11.8.0 --activate
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm --filter @jzoom/database migrate:deploy
pnpm --filter @jzoom/database seed
```

Start services with Docker Compose:

```bash
docker compose up -d --build
docker compose ps
```

Restart services:

```bash
docker compose restart api web worker
```

View logs:

```bash
docker compose logs -f api
docker compose logs -f web
docker compose logs -f worker
docker compose logs -f postgres
```

Health checks:

```bash
curl -i http://localhost:4000/api/v1/health/live
curl -i http://localhost:4000/api/v1/health/ready
curl -i http://localhost:3000
```

Reverse proxy:

- Use Caddy or Nginx in front of the web and API services.
- Terminate SSL at the reverse proxy.
- Route the app domain to web port `3000`.
- Route the API domain or `/api` path to API port `4000`.

Caddy example:

```caddyfile
app.example.com {
  reverse_proxy 127.0.0.1:3000
}

api.example.com {
  reverse_proxy 127.0.0.1:4000
}
```

Nginx example:

```nginx
server {
  server_name app.example.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}

server {
  server_name api.example.com;
  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

SSL:

- Caddy can automatically issue Let’s Encrypt certificates.
- For Nginx, use Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.example.com -d api.example.com
```

Backup basics:

- Back up PostgreSQL before every deployment and before migrations.
- For container PostgreSQL:

```bash
docker compose exec postgres pg_dump -U jzoom jzoom > jzoom-backup.sql
```

- Store backups off-server and protect them as sensitive data.

Rollback basics:

- Roll back application containers to the previous known-good image or commit.
- Do not hand-edit immutable quote, invoice, report, or closing snapshots.
- If migrations were applied, confirm whether the previous app version is schema-compatible before
  rolling back.
- Restore database backups only when necessary and only after preserving the current failed state
  for investigation.

## 9. Domain and DNS plan

Recommended domain setup:

- App: `app.your-domain.com`
- API: `api.your-domain.com`
- Optional staging app: `staging.your-domain.com`
- Optional staging API: `api-staging.your-domain.com`

DNS records:

- `A` record for app subdomain pointing to the OVH server public IPv4.
- `A` record for API subdomain pointing to the same server if using a single server.
- Optional `AAAA` records if IPv6 is configured.
- Keep DNS TTL moderate during setup, for example 300 seconds.

Reverse proxy routing:

- App subdomain routes to web service on port `3000`.
- API subdomain routes to API service on port `4000`.
- Set `WEB_ORIGIN` to the HTTPS app URL.
- Set `NEXT_PUBLIC_API_BASE_URL` to the HTTPS API URL plus `/api/v1`.

SSL:

- Use HTTPS for both app and API.
- Set `AUTH_COOKIE_SECURE=true` in staging/production behind HTTPS.

Do not store registrar, OVH manager, or DNS provider credentials in this repo.

## 10. Security notes

- Never commit real `.env` files.
- Never commit secrets, tokens, private keys, API keys, database credentials, or production
  credentials.
- Use OVH/server secret storage or protected environment variables.
- Restrict GitHub access to the Jzoom repository only.
- Prefer least-privilege GitHub permissions.
- Protect the `main` branch if possible: require PRs, reviews, and checks before merging.
- Review who can access the production database.
- Back up PostgreSQL regularly and before migrations.
- Confirm restore procedures before launch.
- Client data isolation is a critical business rule.
- RBAC and scopes are enforced by backend APIs; UI hiding is not sufficient.
- Internal notes, internal outputs, internal review comments, internal costs, margins, rates,
  pricing factors, and admin notes must never be exposed to clients.
- Do not enable `AUTH_EXPOSE_TEST_TOKENS` outside local/test environments.
- Do not expose Swagger/OpenAPI UI publicly unless it is intentionally protected.

## 11. QA checklist

Browser QA:

- [ ] Login/logout.
- [ ] Admin Console.
- [ ] Monthly catalog.
- [ ] One-time catalog.
- [ ] Platform configuration.
- [ ] Service item request templates.
- [ ] Pricing Studio.
- [ ] Quote creation.
- [ ] Quote PDF.
- [ ] Quote acceptance/internal status.
- [ ] Invoice creation.
- [ ] Invoice PDF.
- [ ] Client portal.
- [ ] Request creation.
- [ ] Dynamic request template form.
- [ ] Internal work queues.
- [ ] Output delivery.
- [ ] Client output acceptance/return.
- [ ] Document request/upload.
- [ ] Hours ledger.
- [ ] Monthly closing.
- [ ] Notifications.
- [ ] Reports.
- [ ] Account Manager portfolio.
- [ ] Mobile/responsive quick check.
- [ ] Arabic RTL quick check.
- [ ] English LTR placeholder/public page quick check.

Technical QA:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm openapi:generate
```

Database QA when PostgreSQL is available:

```powershell
pnpm --filter @jzoom/database migrate:status
pnpm --filter @jzoom/database seed
pnpm --filter @jzoom/database seed
```

Docker QA when Docker is available:

```powershell
docker build --file apps/api/Dockerfile --tag jzoom-api:qa .
docker build --file apps/web/Dockerfile --tag jzoom-web:qa .
docker build --file apps/worker/Dockerfile --tag jzoom-worker:qa .
```

## 12. Known limitations / future-ready items

Intentionally not implemented yet:

- Payment gateway.
- Internal payment recording/status complexity.
- Public payment links.
- Public quote/invoice links.
- ZATCA/e-invoicing integration.
- Tax QR.
- External email/SMS/WhatsApp sending.
- Advanced notification rules engine.
- Advanced visual workflow builder.
- Advanced analytics.
- Full production monitoring and alerting, unless configured during deployment.
- Full mobile app.
- Advanced file/object storage workflows beyond current metadata and simple upload foundations.
- Deterministic multi-role demo seed users.

## 13. Developer handover instructions

The external developer should do the following first:

1. Accept GitHub access to the Jzoom repository.
2. Clone the repo.
3. Read:
   - `README.md`
   - `docs/RUNBOOK_LOCAL.md`
   - `docs/STAGING_READINESS.md`
   - `docs/QA_CHECKLIST.md`
   - this handover document.
4. Run the platform locally with Docker/PostgreSQL.
5. Apply migrations and seeds.
6. Bootstrap the first Admin.
7. Verify or create local/staging demo users.
8. Review `.env.example` and confirm staging values.
9. Confirm the OVH server type and whether PostgreSQL is managed or containerized.
10. Prepare staging deployment.
11. Deploy.
12. Run the QA checklist.
13. Document any blockers before changing code.

When changing the app:

- Work on a feature/fix branch.
- Keep PRs small and scoped.
- Do not push directly to `main`.
- Do not introduce new business features without approval.
- Do not change database schema without migration and tests.

## 14. GitHub access guidance

- Give the developer access only to the Jzoom repository unless broader access is explicitly
  required.
- Prefer limited permissions at first.
- Require branch/PR workflow.
- Protect `main` from direct pushes where possible.
- Keep deployment secrets out of GitHub unless using protected GitHub Actions secrets.
- If GitHub Actions is used for deployment later, use environment protection rules for staging and
  production.

## 15. Final readiness checklist

Before sharing staging access:

- [ ] Latest `main` pulled.
- [ ] `.env` or server environment configured from `.env.example`.
- [ ] No real `.env` committed.
- [ ] PostgreSQL reachable.
- [ ] Migrations applied.
- [ ] Seeds applied if staging/demo.
- [ ] First Admin created.
- [ ] Demo users created and tested if needed.
- [ ] API running.
- [ ] Worker running.
- [ ] Web running.
- [ ] API liveness green.
- [ ] API readiness green.
- [ ] Web accessible over HTTPS.
- [ ] OpenAPI/Swagger exposure decision confirmed.
- [ ] Login/logout tested.
- [ ] PDFs tested.
- [ ] File/document upload path tested.
- [ ] Client data isolation tested.
- [ ] Internal notes/costs/margins not visible to clients.
- [ ] Mobile/responsive check completed.
- [ ] Arabic RTL check completed.
- [ ] English LTR placeholder/public page check completed.
- [ ] Backups considered and at least one backup/restore plan documented.
- [ ] Rollback plan documented.
- [ ] Staging QA checklist completed.

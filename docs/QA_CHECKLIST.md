# Final QA Checklist

Use this checklist for local and staging review. Record the tested commit, environment, tester, and
date in the PR or release notes.

## Environment

- [ ] `.env` or staging variables are based on `.env.example`.
- [ ] No real `.env` files or secrets are committed.
- [ ] PostgreSQL migrations apply cleanly.
- [ ] Excel V3 seed runs successfully and is idempotent.
- [ ] API liveness returns HTTP `200`.
- [ ] API readiness returns HTTP `200` when PostgreSQL is available and HTTP `503` when unavailable.
- [ ] API, web, and worker start from the same commit.

## Authentication and permissions

- [ ] Login succeeds for an active internal user.
- [ ] Login succeeds for an active client user.
- [ ] Failed login returns a safe error.
- [ ] Logout clears the session.
- [ ] `/profile` is available only to authenticated users.
- [ ] `/settings` and Admin Console routes are Admin-only.
- [ ] Client users cannot access internal screens.
- [ ] Client users cannot call Admin/internal APIs successfully.
- [ ] Client users cannot access another client organization’s data.
- [ ] Specialist users cannot access unassigned work.
- [ ] Account Manager users cannot access unassigned clients.
- [ ] Internal notes are never visible in client portal responses or screens.
- [ ] Internal costs, margins, internal rates, pricing factors, and admin notes are never exposed to
      clients.

## Admin Console and configuration

- [ ] Monthly service categories load from PostgreSQL.
- [ ] Monthly services load from PostgreSQL.
- [ ] Service items load with package inclusion, hours, rates, ordering, and statuses.
- [ ] Service levels/packages load and remain editable by Admin.
- [ ] One-time categories and services load with phases, deliverables, tasks, pricing, hours, and
      duration fields.
- [ ] Archive/disable actions are non-destructive.
- [ ] Platform settings are Admin-only and save through backend APIs.
- [ ] Localization labels and business text templates are Admin-editable.
- [ ] Notification templates are Admin-editable.
- [ ] PDF template settings do not mutate existing quote/invoice snapshots.
- [ ] Service item request templates load and can be edited without hardcoded frontend catalog data.

## Pricing, quotes, and invoices

- [ ] Pricing Studio loads clients, monthly services, and one-time services from backend APIs.
- [ ] Pricing preview recalculates on the backend.
- [ ] Pricing draft can be saved and reloaded.
- [ ] Quote can be created from a saved/approved pricing draft.
- [ ] Quote snapshot includes selected services, prices, discounts, totals, client details, terms,
      and pricing rule versions.
- [ ] Editing catalog or pricing rules after quote creation does not mutate the quote snapshot.
- [ ] Quote PDF renders from the immutable quote snapshot only.
- [ ] Internal costs, margins, rates, pricing factors, and admin notes are not visible in quote PDF.
- [ ] Internal users can issue, accept, reject, expire, or cancel quotes only through valid status
      transitions.
- [ ] Invoice can be created only from an accepted quote.
- [ ] Invoice snapshot is immutable after creation.
- [ ] Invoice PDF renders from the immutable invoice snapshot only.
- [ ] Invoice PDF does not show payment gateway details, ZATCA/tax QR, or internal-only pricing data.

## Client portal

- [ ] Client portal layout is client-only and protected.
- [ ] Client users see only issued/accepted quotes for their organization.
- [ ] Client users can view/download quote PDFs for their organization only.
- [ ] Client users see only issued invoices for their organization.
- [ ] Client users can view/download invoice PDFs for their organization only.
- [ ] Client users see only client-safe request information.
- [ ] Client users see only outputs explicitly shared with their organization.
- [ ] Client users never see internal outputs, internal notes, internal review comments, or internal
      files.
- [ ] Client users can upload requested documents only for their own organization’s requests.
- [ ] Client reports show client-safe information only.

## Requests, queues, delivery, documents, and hours

- [ ] Internal users can create service requests for active clients.
- [ ] Requests link to client, service/service item, and source quote/invoice where applicable.
- [ ] Request statuses follow valid lifecycle transitions.
- [ ] Specialist queue shows assigned specialist work.
- [ ] Supervisor queue shows supervisor review work.
- [ ] Account Manager/internal queue shows only authorized work.
- [ ] Assignment and reassignment actions are authorized and audited.
- [ ] Internal comments and client-visible comments remain separated.
- [ ] Internal outputs can be prepared, reviewed, approved, returned, and shared with clients.
- [ ] Client acceptance/return of shared outputs records activity and preserves visibility rules.
- [ ] Internal users can request client documents.
- [ ] Client uploads preserve metadata and visibility controls.
- [ ] Request checklist items can be marked pending, done, or not applicable.
- [ ] Time entries can be drafted, submitted, approved, and rejected.
- [ ] Hours ledger summarizes hours by client, request, service, user, and month.
- [ ] Monthly closing drafts can be prepared by authorized users.
- [ ] Finalized monthly closing snapshots remain immutable after later time entry changes.

## Notifications, reports, and Account Manager

- [ ] Notification list loads for authenticated users.
- [ ] Read/unread status works.
- [ ] Client users see only client-safe notifications.
- [ ] Monthly report internal preparation view loads.
- [ ] Published client reports are visible only to the owning client organization.
- [ ] Account Manager portfolio shows assigned clients only.
- [ ] Account Manager indicators use existing basic signals and do not expose other clients.

## UI, RTL, and responsive sanity

- [ ] Arabic RTL layout feels native in Admin Console, internal workspace, and client portal.
- [ ] English/LTR-compatible content remains readable.
- [ ] Mobile client portal screens are usable without cramped tables or tiny actions.
- [ ] Mobile request detail, document upload, quote/invoice, notifications, and reports screens are
      usable.
- [ ] Admin/internal dense screens remain usable on tablet/desktop and do not break on mobile.
- [ ] Focus states are visible.
- [ ] Buttons and links have usable hit areas.
- [ ] Empty, loading, error, and success states are clear.
- [ ] No emojis, AI/neon/cyber styling, or unrelated color systems appear in the UI.

## Final quality gates

- [ ] `pnpm --filter @jzoom/database generate`
- [ ] `pnpm --filter @jzoom/database migrate:status`
- [ ] `pnpm --filter @jzoom/database seed` twice when PostgreSQL is available.
- [ ] `pnpm format:check`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm openapi:generate`
- [ ] Docker image builds for API, web, and worker where Docker is available.
- [ ] Secret scan or at minimum manual scan for `.env`, tokens, passwords, API keys, and production
      credentials.

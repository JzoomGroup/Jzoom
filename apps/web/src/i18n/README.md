# Interface copy ownership

All static Arabic and English interface copy lives in this directory.

- `pages.ts`: authentication, profile, and small route-level pages.
- `admin-access.ts`: users, roles, permissions, and audit logs.
- `commercial.ts`: quote and invoice terminology and status labels.
- `dictionaries/administration.ts`: admin dashboard, clients, platform settings, and account forms.
- `dictionaries/catalog.ts`: monthly and one-time services, packages, forms, and pricing.
- `dictionaries/client-portal.ts`: client-facing requests, quotes, and invoices.
- `dictionaries/operations.ts`: portfolio, hours, reports, and notifications.
- `dictionaries/workflow.ts`: request queues, request details, and projects.

Components may select a locale-specific branch, but must not define new static copy objects locally.
Keep Arabic and English keys aligned and run `pnpm --filter @jzoom/web i18n:check` after changes.

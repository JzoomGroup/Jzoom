# Admin access module

The admin access area is intentionally split by responsibility:

- `admin-*-page.tsx`: page composition and presentation for one admin route.
- `use-operating-users.ts`: user form state and API orchestration.
- `operating-user-scope.ts`: pure scope mapping and role helpers.
- `admin-access-formatters.ts`: locale-aware presentation helpers.
- `../../i18n/admin-access.ts`: Arabic and English interface copy.
- `admin-access-pages.tsx`: compatibility barrel for existing route imports.

Keep network calls out of page components. New copy belongs in the central dictionary, and scope
rules should remain pure so they can be unit tested without rendering React.

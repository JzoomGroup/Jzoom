# Admin access module

The admin access area is intentionally split by responsibility:

- `admin-*-page.tsx`: page composition and presentation for one admin route.
- `use-operating-users.ts`: operating-user creation, scope state, and list refresh orchestration.
- `user-access-editor.tsx`: the profile, role, scope, security, and activity workspace for one user.
- `use-user-access-editor.ts`: user mutation orchestration and effective-permission calculation.
- `use-permission-center.ts`: role-permission draft state, impact feedback, and save orchestration.
- `operating-user-scope.ts`: pure scope mapping and role helpers.
- `admin-access-formatters.ts`: locale-aware presentation helpers.
- `../../i18n/admin-access.ts`: Arabic and English interface copy.
- `admin-access-pages.tsx`: compatibility barrel for existing route imports.

Keep network calls out of page components. New copy belongs in the central dictionary, and scope
rules should remain pure so they can be unit tested without rendering React.

Role permissions remain the primary access source. User overrides are explicit exceptions with a
required reason and optional expiry. Security-sensitive mutations are audited by the API and revoke
existing sessions so stale access cannot survive a role, status, email, or permission change.

# Jzoom Staging QA Access

## Staging URL

[https://staging-portal.jzoom.sa](https://staging-portal.jzoom.sa/)

## Basic Auth

- Username: `jzoom-staging`
- Password location: Coolify `jzoom-staging-web` environment variable `QA_ACCESS_STAGING_BASIC_AUTH_PASSWORD`

The Basic Auth credentials are separate from the portal login users.

## Portal Test Users

Use the temporary staging portal QA password provided by the project owner for the users below.

| Role            | Username / Email                |
| --------------- | ------------------------------- |
| Admin           | `info@jzoom.sa`                 |
| Client          | `staging.qa.client@jzoom.sa`    |
| Specialist      | `demo.specialist@jzoom.sa`      |
| Supervisor      | `demo.supervisor@jzoom.sa`      |
| Account Manager | `demo.account.manager@jzoom.sa` |
| Management      | `demo.management@jzoom.sa`      |

The portal temporary QA password is also stored in Coolify `jzoom-staging-web` as
`QA_ACCESS_STAGING_PORTAL_UNIFIED_PASSWORD`.

## QA Access Steps

1. Open [https://staging-portal.jzoom.sa](https://staging-portal.jzoom.sa/).
2. Enter the Basic Auth username and password.
3. On the portal login page, sign in with the assigned staging portal user.
4. Test only the flows assigned to that role.
5. Sign out before switching to another role.

## Safety Notes

- Staging contains cloned production-like data.
- Do not use production credentials on staging.
- Do not share staging credentials publicly.
- Do not paste passwords in tickets, markdown files, pull requests, or chat.
- These credentials are temporary and should be rotated after QA.

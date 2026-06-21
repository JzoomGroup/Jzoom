# Formal Blueprint Updates Required Before Related Feature PRs

This document carries forward the approved additions to Excel V3. PR 2 must normalize these
entries into the formal blueprint source before implementing any related route or action.

## Route Matrix additions

| ID        | Route                                 | Access                                             | Purpose                                  |
| --------- | ------------------------------------- | -------------------------------------------------- | ---------------------------------------- |
| ROUTE-019 | `/admin/clients/:id`                  | Admin, assigned AM, permitted Management read-only | Full client profile                      |
| ROUTE-020 | `/admin/subscriptions`                | Admin, scoped AM                                   | Subscription administration and history  |
| ROUTE-021 | `/admin/pricing-rules`                | Admin                                              | Pricing and approval thresholds          |
| ROUTE-022 | `/admin/workflows`                    | Admin                                              | Versioned workflow builder               |
| ROUTE-023 | `/admin/hours-rules`                  | Admin                                              | Hours and balance rules                  |
| ROUTE-024 | `/admin/import-export`                | Admin                                              | Transactional imports and safe exports   |
| ROUTE-025 | `/admin/pdf-templates`                | Admin                                              | Versioned PDF configuration              |
| ROUTE-026 | `/admin/notification-templates`       | Admin                                              | Localized notification templates         |
| ROUTE-027 | `/admin/localization`                 | Admin                                              | Translation-label management             |
| ROUTE-028 | `/pricing`                            | Admin, AM                                          | Quote list and commercial workspace      |
| ROUTE-029 | `/pricing/:quoteId/client-setup`      | Admin, AM                                          | Quote client inputs                      |
| ROUTE-030 | `/pricing/:quoteId/monthly-services`  | Admin, AM                                          | Monthly service selection                |
| ROUTE-031 | `/pricing/:quoteId/one-time-services` | Admin, AM                                          | Build/Digital selection                  |
| ROUTE-032 | `/pricing/:quoteId/review`            | Admin, AM                                          | Totals, overrides, and approvals         |
| ROUTE-033 | `/pricing/:quoteId/issue`             | Admin, AM                                          | Documents and activation                 |
| ROUTE-034 | `/client/requests/new`                | Client                                             | Submit an eligible request               |
| ROUTE-035 | `/specialist`                         | Specialist                                         | Assigned-work workspace                  |
| ROUTE-036 | `/review`                             | Supervisor, permitted Admin                        | Review queue                             |
| ROUTE-037 | `/projects/:id`                       | Scoped roles                                       | Project and output detail                |
| ROUTE-038 | `/hours`                              | Scoped roles; Client when enabled                  | Time ledger                              |
| ROUTE-039 | `/files`                              | Scoped authenticated roles                         | Protected file library                   |
| ROUTE-040 | `/notifications`                      | All authenticated                                  | Deep-linked notifications                |
| ROUTE-041 | `/profile`                            | All authenticated                                  | Personal settings and security           |
| ROUTE-042 | `/client/documents`                   | Client                                             | Published quotes and invoices            |
| ROUTE-043 | `/admin/catalog`                      | Admin                                              | Catalog administration shell             |
| ROUTE-044 | `/admin/catalog/categories`           | Admin                                              | Monthly service category management      |
| ROUTE-045 | `/admin/catalog/monthly-services`     | Admin                                              | Revision-safe monthly service management |
| ROUTE-046 | `/admin/catalog/service-items`        | Admin                                              | Revision-safe service item management    |
| ROUTE-047 | `/admin/catalog/service-levels`       | Admin                                              | Package and service-level management     |

`/settings` remains the Admin-only platform-settings route. User preferences belong to `/profile`.

## Button/Action Matrix additions

| ID      | Screen / action                         | Roles and API effect                  | Governance and error state                            |
| ------- | --------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| ACT-033 | Monthly Services — Edit Service         | Admin; `PUT /services/monthly/{id}`   | Before/after audit; immutable code/version validation |
| ACT-034 | One-Time Services — Add Service         | Admin; `POST /services/one-time`      | Audit; duplicate/invalid price errors                 |
| ACT-035 | One-Time Services — Edit Service        | Admin; `PUT /services/one-time/{id}`  | Before/after; historical snapshot safety              |
| ACT-036 | One-Time Services — Disable Service     | Admin; disable future use             | Reason and audit; preserve history                    |
| ACT-037 | One-Time Services — Manage Templates    | Admin; version phases/deliverables    | Before/after; mandatory output validation             |
| ACT-038 | Service Items — Edit Item               | Admin; `PUT /service-items/{id}`      | Before/after; immutable code validation               |
| ACT-039 | Service Items — Disable Item            | Admin; disable future use             | Reason/audit; preserve history                        |
| ACT-040 | Service Items — Assign to Levels        | Admin; transactional matrix update    | Before/after; invalid-level errors                    |
| ACT-041 | Service Levels — Save Level             | Admin; update level configuration     | Before/after; Custom requires reason                  |
| ACT-042 | Pricing Rules — Save Rule               | Admin; version future rule            | Before/after; formula/version validation              |
| ACT-043 | Hours Rules — Save Rule                 | Admin; version future rule            | Before/after; deduction-policy validation             |
| ACT-044 | Users — Manage Role Permissions         | Admin; update permissions             | Before/after; notify affected users; prevent lockout  |
| ACT-045 | Workflows — Create Workflow             | Admin; create draft version           | Audit; duplicate-code errors                          |
| ACT-046 | Workflows — Add/Edit State              | Admin; mutate draft only              | Before/after; reference validation                    |
| ACT-047 | Workflows — Add/Edit Transition         | Admin; mutate draft only              | Before/after; graph validation                        |
| ACT-048 | Workflows — Activate Version            | Admin; activate valid draft           | Reason/audit; active-version conflict                 |
| ACT-049 | Workflows — Archive Version             | Admin; archive eligible version       | Reason/audit; active-record protection                |
| ACT-050 | Settings — Save Settings                | Admin; validated setting-group update | Sensitive before/after audit                          |
| ACT-051 | PDF Templates — Save Draft              | Admin; create template version        | Audit; required/forbidden-token validation            |
| ACT-052 | PDF Templates — Activate                | Admin; activate safe version          | Reason/audit; leakage validation                      |
| ACT-053 | Notification Templates — Save           | Admin; version localized template     | Audit; locale/placeholder errors                      |
| ACT-054 | Notification Templates — Enable/Disable | Admin; future delivery behavior       | Audit; protect required templates                     |
| ACT-055 | Localization — Save Label               | Admin; update draft translation       | Audit; key/placeholder validation                     |
| ACT-056 | Localization — Publish Revision         | Admin; publish complete revision      | Reason/audit; missing-translation errors              |
| ACT-057 | Catalog — Reorder Entry                 | Admin; persist display order          | Audit; order-conflict errors                          |
| ACT-058 | Catalog — Archive Entry                 | Admin; history-safe archive           | Reason/audit; dependency protection                   |
| ACT-059 | Monthly Services — Add Service          | Admin; create stable record/revision  | Audit; duplicate/category/rate validation             |
| ACT-060 | Monthly Services — Change Status        | Admin; lifecycle transition           | Reason/audit; preserve pinned revisions               |
| ACT-061 | Monthly Categories — Add Category       | Admin; create editable category       | Audit; localized-name and unique-code validation      |
| ACT-062 | Monthly Categories — Edit Category      | Admin; update labels/description      | Before/after audit; immutable code                    |
| ACT-063 | Monthly Categories — Change Status      | Admin; lifecycle transition           | Dependency protection and audit                       |
| ACT-064 | Service Items — Add Item                | Admin; create stable record/revision  | Audit; parent and package-matrix validation           |
| ACT-065 | Service Items — Change Status           | Admin; lifecycle transition           | Reason/audit; preserve request and quote snapshots    |
| ACT-066 | Service Levels — Add Level              | Admin; create package level           | Audit; localized labels and unique-code validation    |
| ACT-067 | Service Levels — Change Status          | Admin; lifecycle transition           | Active dependency protection and audit                |

## Excel V3 inputs for PR 2

The workbook—not the prototype JSON—is the source for normalization and seed planning, especially:

- `53_Service_Item_Level_Matrix`
- `54_Service_Card_Display_Map`
- `55_Package_Level_Summary`
- `36_Button_Action_Matrix`
- `38_Navigation_Routing`
- `41_Validation_Rules`
- `42_PDF_Field_Mapping`
- `43_Audit_Events`
- `44_Notification_Templates`
- `48_Definition_of_Done`

PR 2 must validate worksheet names and headers, record the workbook SHA-256, and fail generation on
inconsistent codes or relationships.

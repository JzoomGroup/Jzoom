# Jzoom Platform Audit And Enhancement Checklist

Date: 2026-06-27  
Environment: staging  
Portal URL: https://portal.jzoom.sa  
API URL: https://api.jzoom.sa/api/v1  
Overall readiness score: 58/100

## 1. Executive Summary

The current Jzoom platform is a real staging foundation, not only a visual mock. It includes working authentication, backend role checks, client scoping, catalog management, pricing, quotes, invoices, request lifecycle, reports, hours ledger, platform configuration, notifications, and snapshot storage.

The system is not ready for real client use yet. The biggest gaps are the client request journey, service-item dynamic forms, subscription management UI, users and permissions UI, role-specific dashboards, real file upload/download, workflow builder, audit log UI, and full Arabic localization.

Important testing note: the in-app visual browser was unavailable during the audit. Deployed pages and APIs were tested over HTTPS using real authenticated role sessions.

## 2. What Is Working Well

- Login works on the deployed staging portal.
- Backend RBAC exists through role, permission, and scope guards.
- Client users are blocked from admin/internal routes.
- Client API access is scoped to the assigned client.
- Cross-client quote, invoice, and request access checks returned blocked or not found responses.
- Internal notes are separated from client-visible comments.
- Catalog services, service items, one-time services, pricing rules, quotes, invoices, and reports use real backend APIs.
- Quote, invoice, monthly report, monthly closing, and request answer snapshots exist in the database model.
- Client portal can show assigned services, quotes, invoices, reports, requests, and notifications.
- Internal request detail supports lifecycle, comments, notes, tasks, outputs, document requests, time entries, and activity events.
- Monthly report and monthly closing foundations exist.
- Audit logs are written by many backend operations.

## 3. Biggest Risks

- The client request creation flow requires raw database IDs.
- No active service-item request templates currently exist.
- Suggested request templates are generic and repeated across service items.
- File upload is metadata-only, not real binary upload/download.
- Admin cannot manage subscriptions through a proper UI.
- Admin cannot manage all users and permissions through a proper UI.
- No permission matrix UI exists.
- No proper admin dashboard, client dashboard, specialist dashboard, supervisor dashboard, or management dashboard.
- Workflow builder is only JSON foundation, not a visual builder.
- Worker app exists but has zero registered jobs.
- Management and Admin have very broad operational power.
- Account Manager can perform some execution-style actions if assigned to a request.
- Arabic RTL shell exists, but much of the UI text is still English.

## 4. Role Coverage Matrix

| Role            |             Expected menus | Exists? | Works end-to-end? | Notes                                                                                                                                                     | Risk   |
| --------------- | -------------------------: | ------: | ----------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Admin           |         Full Admin Console | Partial |           Partial | Catalog, clients, pricing rules, request templates, and platform config exist. Missing dashboard, users UI, permission matrix, subscription UI, audit UI. | High   |
| Client          |              Client portal | Partial |           Partial | Quotes, invoices, reports, requests, and notifications work. New request flow requires raw IDs and active templates are missing.                          | High   |
| Specialist      |              Assigned work | Partial |           Partial | Can access assigned requests, tasks, notes, outputs, and hours. No dedicated dashboard; workflow is raw.                                                  | Medium |
| Supervisor      | Review, approval, workload | Partial |           Partial | Review, approval, and hours review exist in request detail. No real supervisor dashboard or workload UI.                                                  | Medium |
| Account Manager | Portfolio and relationship | Partial |           Partial | Portfolio and reports foundation exist. Missing opportunities, relationship notes, renewals, and deeper client profile.                                   | Medium |
| Management      |       Executive visibility | Partial |           Partial | Can see broad requests, reports, and portfolio. Missing executive dashboard; operational power is too broad.                                              | High   |

## 5. Admin Feature Matrix

| Admin feature           |     Exists? | Current implementation                             | Gap                                                             | Recommended action                                | Risk if added |
| ----------------------- | ----------: | -------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------- | ------------- |
| Admin Dashboard         |          No | No route or menu                                   | No KPI overview                                                 | Add read-only metrics dashboard first             | Medium        |
| Client Management       |     Partial | Create, edit, status, portal user                  | No profile, team assignment, subscription linking UI            | Extend client profile safely                      | Medium        |
| Subscription Management |       No UI | DB models and seeded data exist                    | No admin editor for packages, dates, hours, services, overrides | Add versioned subscription UI                     | High          |
| Monthly Services        |         Yes | Real revision-safe catalog UI/API                  | Needs usability polish                                          | Keep and improve                                  | Low           |
| One-Time Services       |         Yes | Real Build/Digital catalog UI/API                  | Not fully connected to client request/project flow              | Keep and integrate                                | Medium        |
| Service Items           |     Partial | Real item management and package matrix            | No friendly form builder per item                               | Add visual field builder                          | High          |
| Dynamic Fields          |     Partial | JSON template editor and field library             | 0 active templates; suggested templates are generic             | Build active service-specific templates           | High          |
| Users And Permissions   | API partial | Invitation, status, roles, permission APIs exist   | No users page                                                   | Add Admin Users UI                                | High          |
| Permission Matrix       |       No UI | Backend permissions exist                          | No safe visual matrix                                           | Add read-only matrix first, then controlled edits | High          |
| Workflow Builder        |     Partial | JSON workflow template foundation                  | No visual workflow builder                                      | Add versioned builder later                       | High          |
| Hours Rules             |     Partial | Time entries, approval, ledger                     | Rules are hardcoded or not admin-configurable                   | Add hours rule settings after workflow design     | Medium        |
| Reports And Closing     |     Partial | Reports and closings work                          | Raw client IDs, limited recommendations/notes                   | Add pickers and report editor                     | Medium        |
| Audit And System Data   |     Partial | Audit logs are written                             | No admin audit viewer                                           | Add audit log UI with filters                     | Medium        |
| Platform Settings       |     Partial | Settings, localization, PDF, notifications as JSON | Too technical for normal admin                                  | Add safer forms for common settings               | Medium        |

## 6. Client Feature Matrix

| Feature             | Exists? | Works end-to-end? | Gap                                                                                | Recommended action                              | Risk   |
| ------------------- | ------: | ----------------: | ---------------------------------------------------------------------------------- | ----------------------------------------------- | ------ |
| Client dashboard    | Partial |           Partial | Missing used hours, remaining hours, waiting actions, deliverable approval summary | Add KPI cards and action queue                  | Medium |
| Service catalog     | Partial |           Partial | Services show, but request flow does not start cleanly from service/item selection | Add service to item to form flow                | High   |
| New request         | Partial |              Weak | Requires raw IDs; no friendly picker; templates inactive                           | Replace IDs with pickers and activate templates | High   |
| Dynamic item forms  | Partial |                No | Backend exists, but 0 active templates and generic suggested fields                | Create active templates per item                | High   |
| My requests         |     Yes |           Partial | Listing/detail works, UX is basic                                                  | Add status timeline and clearer actions         | Medium |
| Requested documents | Partial |           Partial | Metadata-only upload, not real files                                               | Add private file upload                         | High   |
| Deliverables        | Partial |           Partial | Accept/return exists for shared outputs                                            | Improve versioning/download UX                  | Medium |
| Hours and usage     | Partial |                No | Client dashboard does not show clear usage balance                                 | Add client-safe usage API/UI                    | Medium |
| Monthly reports     |     Yes |           Partial | Published reports visible                                                          | Add richer report layout and notes              | Low    |
| Notifications       |     Yes |           Partial | In-app works; external channels future-ready only                                  | Keep in-app, add email/WhatsApp later           | Low    |
| Client isolation    |     Yes |               Yes | Cross-client checks passed                                                         | Keep direct URL/API tests                       | High   |

## 7. Specialist Feature Matrix

| Feature                       | Exists? | Works end-to-end? | Gap                                                  | Recommended action                         | Risk   |
| ----------------------------- | ------: | ----------------: | ---------------------------------------------------- | ------------------------------------------ | ------ |
| Specialist dashboard          | Partial |           Partial | Work queues exist, no dedicated specialist dashboard | Add My Tasks dashboard                     | Medium |
| My assigned requests          |     Yes |           Partial | Scoped access works                                  | Improve filters and grouping               | Low    |
| Request details               |     Yes |           Partial | Rich detail exists                                   | Improve layout and role-focused actions    | Medium |
| Internal notes                |     Yes |               Yes | Internal notes separated from client                 | Keep and test leakage                      | High   |
| Request documents from client |     Yes |           Partial | Metadata upload only                                 | Add real file upload                       | High   |
| Deliverable preparation       |     Yes |           Partial | Output workflow exists                               | Add file attachment/version support        | Medium |
| Register hours                |     Yes |           Partial | Time entries exist                                   | Add clearer hour rules and balance preview | Medium |
| Permission limits             | Partial |           Partial | Specialist blocked from admin/pricing/reports        | Add tests for all direct actions           | High   |

## 8. Supervisor Feature Matrix

| Feature              | Exists? | Works end-to-end? | Gap                                          | Recommended action                        | Risk   |
| -------------------- | ------: | ----------------: | -------------------------------------------- | ----------------------------------------- | ------ |
| Supervisor dashboard | Partial |           Partial | Queues exist, no true performance dashboard  | Add review/workload dashboard             | Medium |
| Team requests        | Partial |           Partial | Assigned supervisor scope works              | Add team/workstream model if needed       | Medium |
| Assign and reassign  | Partial |           Partial | Exists but uses raw user IDs                 | Add user picker and validation UX         | Medium |
| Deliverable review   |     Yes |           Partial | Review/return/share exists                   | Add file/version review UX                | Medium |
| Hours approval       |     Yes |           Partial | Approval exists                              | Prevent self-approval explicitly in tests | High   |
| Workload management  | Partial |                No | No workload redistribution UI                | Add workload board                        | Medium |
| Escalation           | Partial |           Partial | Escalate action exists, weak management flow | Add escalation reason and queue           | Medium |

## 9. Account Manager Feature Matrix

| Feature                  | Exists? | Works end-to-end? | Gap                                            | Recommended action                          | Risk   |
| ------------------------ | ------: | ----------------: | ---------------------------------------------- | ------------------------------------------- | ------ |
| Portfolio dashboard      | Partial |           Partial | Foundation health cards exist                  | Add assigned-client filters and richer KPIs | Medium |
| My clients               | Partial |           Partial | Portfolio exists, no deep client profile       | Add client profile view                     | Medium |
| Subscription tracking    | Partial |                No | Data visible indirectly, no management UI      | Add subscription panel                      | High   |
| Reports                  |     Yes |           Partial | Can prepare/publish reports with raw client ID | Add client picker and report editor         | Medium |
| Opportunities            |      No |                No | No upgrade, renewal, or opportunity module     | Add after subscription/profile              | Low    |
| Follow-up and escalation | Partial |           Partial | Requests/notifications exist                   | Add relationship notes and follow-up tasks  | Medium |
| Permission limits        | Partial |           Partial | Blocked from admin; can access pricing/reports | Tighten execution permissions               | High   |

## 10. Management Feature Matrix

| Feature                   | Exists? | Works end-to-end? | Gap                                                   | Recommended action                        | Risk   |
| ------------------------- | ------: | ----------------: | ----------------------------------------------------- | ----------------------------------------- | ------ |
| Executive dashboard       |      No |                No | No executive KPI page                                 | Add read-only dashboard                   | Medium |
| Client indicators         | Partial |           Partial | Portfolio health exists                               | Add management-specific client indicators | Medium |
| Operational indicators    | Partial |           Partial | Request queues/reports exist                          | Add aggregate analytics                   | Medium |
| Reports                   |     Yes |           Partial | Monthly reports visible                               | Add management report filters             | Low    |
| Approvals and escalations | Partial |           Partial | Escalation status exists, no dedicated approval queue | Add escalation queue                      | Medium |
| Commercial opportunities  |      No |                No | Not implemented                                       | Add after AM opportunities module         | Low    |
| Management decisions      | Partial |              Weak | Notes/status actions exist indirectly                 | Add decision records with audit           | Medium |
| Permission limits         | Partial |             Risky | Management has broad operational power                | Make management mostly read/approve       | High   |

## 11. Shared Core Matrix

| Area                  |    Exists? | Current state                                                              | Main risk                                          | Recommended action                          |
| --------------------- | ---------: | -------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------- |
| Backend RBAC          |        Yes | Role, permission, and scope guards exist                                   | Action-level permissions still broad               | Add explicit permission tests               |
| Client data isolation |        Yes | Cross-client checks passed                                                 | Future endpoints may leak if untested              | Keep direct API tests                       |
| Snapshots             |        Yes | Quote, invoice, report, closing, and request answers snapshot model exists | Old data mutation if new features bypass snapshots | Keep immutable snapshots                    |
| File uploads          |    Partial | Metadata only                                                              | No real document/deliverable files                 | Add private object storage                  |
| Worker/jobs           | Partial/No | Worker exists but has 0 jobs                                               | Outbox/background features do not run              | Add worker app/jobs later                   |
| Localization          |    Partial | RTL enabled, many labels English                                           | Arabic UX not production-ready                     | Translate UI through localization system    |
| Dashboards            |    Partial | Foundation views only                                                      | Not useful enough for daily operations             | Add aggregate endpoints and role dashboards |

## 12. Dynamic Service Item Forms Review

Current findings:

- Database/API support request templates per service item.
- Admin can create field library items.
- Admin can revise templates using JSON.
- Client request form can render fields when an active template is loaded.
- Internal request detail can show submitted answers.
- Answers are saved as request form response snapshots.
- Current staging data has 29 suggested templates.
- Current staging data has 0 active templates.
- Suggested templates are generic and use the same fields:
  - request_description
  - urgency
  - required_deadline
  - notes
  - attachment

Missing:

- Friendly visual field builder.
- Service-specific fields per service item.
- Active templates by default.
- Conditional fields.
- Field visibility by role beyond clientVisible.
- Real file upload field behavior.
- Report/deliverable mapping for answers.
- Client flow that loads template automatically after selecting a service item.

Recommended architecture:

- Keep the current versioned template/snapshot backend.
- Add visual form builder on top of the current API.
- Add a client service and service-item picker.
- Activate real service-specific templates in staging.
- Do not mutate old request answer snapshots.
- Add backend and frontend tests for template rendering and answer saving.

## 13. Client Journey Enhancements

High priority:

- Replace raw IDs in request creation with client-safe service selection.
- Add a flow: select subscribed service, select service item, show description, load active template automatically, submit.
- Show current subscription, used hours, remaining hours, open requests, waiting client actions, and deliverables waiting for approval on the dashboard.
- Show required documents in a clear page/section.
- Add real file upload with private storage.
- Make notifications clickable and useful.
- Improve request detail with status timeline and next action.
- Translate client-facing labels to Arabic and keep English ready.
- Test mobile layout manually.

Nice-to-have:

- Premium cards for services and deliverables.
- Version history for deliverables.
- Client satisfaction or feedback on completed requests.
- Better empty states.

## 14. Internal User Enhancements

Specialist:

- Add My Tasks dashboard.
- Show assigned requests, delayed tasks, waiting client, waiting supervisor, registered hours, and priority tasks.
- Remove raw UUID entry for assignments and client/service references.
- Add deliverable file upload and versioning.

Supervisor:

- Add dashboard for team workload, review queue, delayed requests, returned requests, and hours approval.
- Add specialist workload distribution.
- Add clear approval and return flows with required reason.
- Add direct escalation queue.

Account Manager:

- Add assigned clients page with health score.
- Add client profile with subscription, requests, reports, hours, notes, deliverables, and relationship history.
- Add opportunities: upgrade, renewal, additional services, commercial notes.
- Add follow-up tasks and escalation tracking.

Management:

- Add executive dashboard.
- Add high-risk clients, active subscriptions, delayed requests, used hours, team performance, and most requested services.
- Add management decision records.
- Restrict daily execution actions unless explicitly configured.

Admin:

- Add admin dashboard.
- Add subscription manager.
- Add users and permissions UI.
- Add permission matrix.
- Add audit log viewer.
- Add visual workflow builder.
- Add safe forms for platform settings instead of only JSON.

## 15. Security And Permission Concerns

Current positives:

- Client users are blocked from admin/internal routes.
- Client APIs are scoped to assigned client IDs.
- Internal notes do not appear in client-safe request views.
- Client quote/invoice APIs return client-safe views.
- Backend role guards are active.

Concerns:

- Action-level permissions need to be stricter.
- Management currently has broad operational access.
- Admin has broad operational access.
- Account Manager assigned to a request can perform some execution-like actions.
- No permission matrix UI to review what each role can do.
- No admin audit viewer to inspect access denials and sensitive changes.
- Weak or demo passwords must not be reused in production.
- Direct URL/API access tests must be added for every role.

Required tests:

- Client cannot access another client's requests, reports, quotes, invoices, files, comments, or deliverables.
- Client cannot see internal notes, internal cost, margin, rates, or non-approved time entries.
- Specialist cannot access admin, pricing, reports, all clients, or unassigned requests.
- Supervisor cannot edit service catalog, prices, permissions, or platform settings.
- Account Manager cannot edit permissions, service source data, workflows, or delete data.
- Management cannot execute daily specialist work unless intentionally allowed.
- Public unauthenticated access returns 401/redirect except public health/login/docs as intended.

## 16. Data And Snapshot Risks

Protect these from accidental mutation:

- Quote snapshots.
- Invoice snapshots.
- Monthly closing snapshots.
- Monthly report snapshots.
- Request template snapshots.
- Submitted request answers.
- Historical reports.
- Uploaded file metadata and future file references.

Risk areas:

- Changing catalog revisions must not rewrite existing quotes/invoices.
- Changing request templates must not rewrite submitted request answers.
- Finalized monthly closings must stay locked.
- Published reports should remain historically consistent.
- File replacement must version files instead of overwriting old files.
- Subscription changes must create history records and not corrupt past usage.

Recommended controls:

- Continue versioned catalog and template revisions.
- Add tests proving old snapshots stay unchanged after catalog/template edits.
- Require reasons for subscription, permission, workflow, and service changes.
- Add audit views for all sensitive changes.

## 17. Deployment And Coolify Concerns

Current deployment positives:

- Portal HTTPS responds.
- API health/live responds.
- API health/ready responds and database check passes.
- DNS for portal.jzoom.sa resolves through Cloudflare.

Concerns:

- OpenAPI JSON route at /api/v1/openapi.json returned 404. Swagger UI may be available at another route, but JSON endpoint should be confirmed.
- Coolify has web and API applications, but no operational worker job app was confirmed.
- Worker code has zero registered jobs.
- Background outbox processing is not active.
- File storage environment is not ready because file upload is metadata-only.
- Rollback, logs, and health checks should be documented for developers.

Recommended checks before production:

- Confirm Coolify app health checks.
- Confirm API and web environment variables.
- Confirm DATABASE_URL points to staging or production intentionally.
- Confirm SSL for portal and API.
- Confirm CORS/cookie domain/security settings.
- Confirm migration command and seed command.
- Confirm rollback process.
- Confirm logs and error reporting.
- Add worker deployment only after real jobs exist.

## 18. Recommended Implementation Plan

### Phase 1: Quick Fixes

- Replace raw IDs in request creation forms with service/client/user pickers.
- Activate real service-specific request templates in staging.
- Add client dashboard usage cards.
- Add role-specific navigation cleanup.
- Add direct URL/API RBAC tests.
- Add Arabic labels for highest-visibility client pages.

### Phase 2: Core Missing Functionality

- Admin Users page.
- Permission Matrix page.
- Subscription Management page.
- Real file upload/download with private storage.
- Visual service-item field builder.
- Admin audit log viewer.
- Client-safe usage and remaining hours API/UI.

### Phase 3: UX And Premium Improvements

- Arabic-first UI copy.
- Mobile QA and responsive fixes.
- Better empty states and error messages.
- Request timeline.
- Deliverable versioning UX.
- Client profile pages.
- Account Manager relationship notes and opportunities.

### Phase 4: Advanced Workflow And Reporting

- Visual Workflow Builder.
- Hours Rules Builder.
- Executive dashboard.
- Management escalation queue.
- Monthly report editor with Account Manager notes and recommendations.
- Worker/outbox processing for email, SMS, or WhatsApp notifications.

## 19. Acceptance Checklist After Enhancements

### Admin

- [ ] Admin dashboard shows total clients, active subscriptions, open requests, delayed requests, used hours, health status, and operational indicators.
- [ ] Admin can create, edit, activate, deactivate, and archive clients.
- [ ] Admin can open a full client profile.
- [ ] Admin can link subscriptions/packages to clients.
- [ ] Admin can assign Account Manager and working team.
- [ ] Admin can manage subscription start/end dates, services, hours, overrides, and change reasons.
- [ ] Admin can manage monthly services.
- [ ] Admin can manage one-time services.
- [ ] Admin can manage service items.
- [ ] Admin can create dynamic fields per service item using a visual builder.
- [ ] Admin can manage users.
- [ ] Admin can manage roles and permissions safely.
- [ ] Admin can view permission matrix.
- [ ] Admin can view audit logs.
- [ ] Admin can manage platform settings without unsafe JSON for common tasks.

### Client

- [ ] Client dashboard shows subscription, services, used hours, remaining hours, open requests, waiting actions, deliverables, and notifications.
- [ ] Client can create a request without seeing raw IDs.
- [ ] Client selects service and service item.
- [ ] Client sees the correct service-specific dynamic form.
- [ ] Client can upload real files.
- [ ] Client can view all own requests.
- [ ] Client can reply to Jzoom.
- [ ] Client can see requested documents.
- [ ] Client can upload/replace documents.
- [ ] Client can view, approve, and return deliverables.
- [ ] Client can view monthly reports.
- [ ] Client cannot access other client data.
- [ ] Client cannot see internal notes, internal costs, margins, or internal time records.

### Specialist

- [ ] Specialist dashboard shows assigned work and priority tasks.
- [ ] Specialist sees assigned requests only.
- [ ] Specialist can add internal notes.
- [ ] Specialist can request documents from client.
- [ ] Specialist can prepare deliverables.
- [ ] Specialist can submit deliverables for review.
- [ ] Specialist can register hours.
- [ ] Specialist cannot approve own hours.
- [ ] Specialist cannot access admin/catalog/pricing/permissions.

### Supervisor

- [ ] Supervisor dashboard shows review queue, delayed requests, workload, and hours waiting approval.
- [ ] Supervisor can assign and reassign specialists with picker UI.
- [ ] Supervisor can review deliverables.
- [ ] Supervisor can approve or return deliverables.
- [ ] Supervisor can approve or reject hours.
- [ ] Supervisor can escalate requests with reason.
- [ ] Supervisor cannot edit service catalog, pricing, permissions, or platform settings.

### Account Manager

- [ ] Account Manager dashboard shows assigned clients.
- [ ] Account Manager can open client profile.
- [ ] Account Manager can see subscription, requests, hours, reports, deliverables, notes, and health.
- [ ] Account Manager can add relationship notes.
- [ ] Account Manager can add opportunities and renewal recommendations.
- [ ] Account Manager can follow delayed requests and escalate.
- [ ] Account Manager cannot edit source services, permissions, workflows, or delete data.

### Management

- [ ] Management dashboard shows executive KPIs.
- [ ] Management sees client indicators and risk.
- [ ] Management sees operational indicators.
- [ ] Management sees reports.
- [ ] Management has escalation/approval queue.
- [ ] Management can add decisions/notes.
- [ ] Management does not perform daily specialist work unless intentionally allowed.

### Shared Security

- [ ] Unauthenticated protected pages/API return 401 or redirect.
- [ ] Client cross-company direct URLs fail.
- [ ] Internal direct URL/API permission tests pass for every role.
- [ ] Hidden UI pages are still backend-protected.
- [ ] No secrets or real .env files are exposed.
- [ ] Demo users are clearly staging-only.
- [ ] Audit logs are created for sensitive actions.

### Data Integrity

- [ ] Quote snapshots do not change after catalog edits.
- [ ] Invoice snapshots do not change after quote/catalog edits.
- [ ] Published reports remain stable.
- [ ] Finalized closings remain locked.
- [ ] Submitted request answers stay linked to template snapshots.
- [ ] File replacement creates versions, not overwrites.
- [ ] Subscription changes create history.

## 20. Final Recommendation

Keep the current architecture. Do not rewrite the platform. The backend foundation is useful and should be extended.

Do not show this as final client-ready software yet. Before real clients use it, fix the request journey, activate service-specific dynamic forms, add real file upload, complete Arabic UI, and verify RBAC through automated direct API tests.

Before internal daily use, add users/permissions, subscriptions, dashboards, assignment pickers, audit viewer, and safer workflow/hour controls.

Avoid large rewrites, direct production data edits, and changes that bypass the existing snapshot/versioning design.

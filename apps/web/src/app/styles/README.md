# Web CSS ownership

The root layout imports these files in cascade order. Keep that order stable.

- `globals-foundation.css`: original low-level elements and shared legacy class contracts.
- `design-foundation.css`: tokens, typography, generic controls, motion, and fonts.
- `application-shell.css`: desktop shell, navigation, top bar, and base page framing.
- `request-intake.css`: client request intake and request creation surfaces.
- `access-management.css`: users, roles, permissions, and audit-log surfaces.
- `catalog-management.css`: clients, packages, catalog services, items, and one-time services.
- `operations.css`: request details, queues, hours, reports, and operational dashboards.
- `responsive.css`: responsive rules owned by the domain modules above.
- `compatibility.css`: visual compatibility for old class names still emitted by live components.
- `premium-refinement.css`: shared light-theme refinements applied after compatibility rules.
- `system-shell.css`: final shell tokens and component-independent shell behavior.
- `system-components.css`: final shared cards, buttons, metrics, and catalog components.
- `system-forms.css`: final tables, fields, and validation presentation.
- `system-workflows.css`: final statuses, files, projects, and workflow presentation.
- `system-responsive.css`: final mobile behavior and accessibility motion rules.

Rules:

1. Put new styles in the file that owns the component or domain.
2. Do not recreate `globals.css` or `product-polish.css`.
3. Do not add new rules to `compatibility.css`; migrate the component instead.
4. Keep every CSS module below 2,500 lines.
5. Run `pnpm --filter @jzoom/web css:check` after moving or adding styles.

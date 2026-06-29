import type { CatalogSnapshot } from "../../lib/catalog-types";
import { ControlDeck, ControlTile, MetricCard, SectionCard, SmartTable } from "../premium-os";
import { SectionHeader, StatusBadge } from "./catalog-shared";

export function CatalogOverview({ snapshot }: { snapshot: CatalogSnapshot }) {
  const activeServices = snapshot.services.filter((service) => service.status === "ACTIVE").length;
  const activeItems = snapshot.items.filter((item) => item.status === "ACTIVE").length;

  return (
    <>
      <SectionHeader
        eyebrow="Admin Console"
        title="Monthly catalog"
        description="Manage the live PostgreSQL-backed monthly catalog while preserving every pinned historical revision."
      />

      <section className="metric-grid" aria-label="Catalog summary">
        <MetricCard label="Categories" value={snapshot.categories.length} detail="Monthly groups" />
        <MetricCard label="Monthly services" value={snapshot.services.length} detail={`${activeServices} active`} accent />
        <MetricCard label="Service items" value={snapshot.items.length} detail={`${activeItems} active`} />
        <MetricCard label="Package levels" value={snapshot.levels.length} detail="Subscription tiers" />
      </section>

      <ControlDeck
        title="Administration areas"
        description="Each change is authorized by the backend and written to the audit log."
      >
        <ControlTile href="/admin/catalog/categories" meta="01" title="Categories" description="Localized grouping, ordering, and lifecycle controls." />
        <ControlTile href="/admin/catalog/monthly-services" meta="02" title="Monthly services" description="Revision-safe names, hours, rates, fees, and package availability." />
        <ControlTile href="/admin/catalog/service-items" meta="03" title="Service items" description="Item definitions and the complete package inclusion matrix." />
        <ControlTile href="/admin/catalog/service-levels" meta="04" title="Service levels" description="Basic, Growth, Advanced, Partnership, and future configurable levels." />
        <ControlTile href="/admin/catalog/one-time-categories" meta="05" title="One-time categories" description="Localized Build and Digital groupings with safe lifecycle controls." />
        <ControlTile href="/admin/catalog/one-time-services" meta="06" title="One-time services" description="Revisioned pricing, phases, deliverables, tasks, and duration." />
      </ControlDeck>

      <SectionCard
        title="Seeded catalog visibility"
        description="The current live service revisions loaded from Excel V3."
      >
        <SmartTable>
          <table className="catalog-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Category</th>
                <th>Revision</th>
                <th>Status</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.services.map((service) => (
                <tr key={service.id}>
                  <td>
                    <strong>{service.revision?.nameEn ?? service.code}</strong>
                    <small>{service.code}</small>
                  </td>
                  <td>{service.category.nameEn}</td>
                  <td>v{service.revision?.version ?? "—"}</td>
                  <td>
                    <StatusBadge status={service.status} />
                  </td>
                  <td>{service.itemCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SmartTable>
      </SectionCard>
    </>
  );
}

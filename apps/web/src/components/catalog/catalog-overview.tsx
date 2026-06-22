import Link from "next/link";
import type { CatalogSnapshot } from "../../lib/catalog-types";
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
        <article>
          <span>Categories</span>
          <strong>{snapshot.categories.length}</strong>
        </article>
        <article>
          <span>Monthly services</span>
          <strong>{snapshot.services.length}</strong>
          <small>{activeServices} active</small>
        </article>
        <article>
          <span>Service items</span>
          <strong>{snapshot.items.length}</strong>
          <small>{activeItems} active</small>
        </article>
        <article>
          <span>Package levels</span>
          <strong>{snapshot.levels.length}</strong>
        </article>
      </section>

      <section className="catalog-panel">
        <div className="panel-heading">
          <div>
            <h2>Administration areas</h2>
            <p>Each change is authorized by the backend and written to the audit log.</p>
          </div>
        </div>
        <div className="admin-area-grid">
          <Link href="/admin/catalog/categories">
            <span>01</span>
            <strong>Categories</strong>
            <p>Localized grouping, ordering, and lifecycle controls.</p>
          </Link>
          <Link href="/admin/catalog/monthly-services">
            <span>02</span>
            <strong>Monthly services</strong>
            <p>Revision-safe names, hours, rates, fees, and package availability.</p>
          </Link>
          <Link href="/admin/catalog/service-items">
            <span>03</span>
            <strong>Service items</strong>
            <p>Item definitions and the complete package inclusion matrix.</p>
          </Link>
          <Link href="/admin/catalog/service-levels">
            <span>04</span>
            <strong>Service levels</strong>
            <p>Basic, Growth, Advanced, Partnership, and future configurable levels.</p>
          </Link>
          <Link href="/admin/catalog/one-time-categories">
            <span>05</span>
            <strong>One-time categories</strong>
            <p>Localized Build and Digital groupings with safe lifecycle controls.</p>
          </Link>
          <Link href="/admin/catalog/one-time-services">
            <span>06</span>
            <strong>One-time services</strong>
            <p>Revisioned pricing, phases, deliverables, tasks, and duration.</p>
          </Link>
        </div>
      </section>

      <section className="catalog-panel">
        <div className="panel-heading">
          <div>
            <h2>Seeded catalog visibility</h2>
            <p>The current live service revisions loaded from Excel V3.</p>
          </div>
        </div>
        <div className="compact-table-wrap">
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
        </div>
      </section>
    </>
  );
}

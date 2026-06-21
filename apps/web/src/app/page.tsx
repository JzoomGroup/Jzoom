const foundationItems = [
  "Next.js web application",
  "NestJS REST API",
  "PostgreSQL readiness",
  "Prisma connection layer",
  "Empty background worker",
  "OpenAPI and request tracing",
] as const;

export default function FoundationPage() {
  return (
    <main className="foundation-shell">
      <section className="foundation-card" aria-labelledby="foundation-title">
        <div className="brand-row">
          <span className="brand-mark" aria-hidden="true">
            J
          </span>
          <div>
            <p className="eyebrow">Jzoom Operating Platform</p>
            <h1 id="foundation-title">Production foundation is ready.</h1>
          </div>
        </div>

        <p className="lead">
          PR 1 establishes the runtime and engineering boundaries. Business modules begin only after
          the Excel V3 normalization work in PR 2.
        </p>

        <ul className="foundation-grid" aria-label="Foundation components">
          {foundationItems.map((item) => (
            <li key={item}>
              <span aria-hidden="true" className="status-dot" />
              {item}
            </li>
          ))}
        </ul>

        <div className="scope-note">
          <strong>Foundation only.</strong>
          <span>No mock catalog, business screens, authentication, or LocalStorage state.</span>
        </div>
      </section>
    </main>
  );
}

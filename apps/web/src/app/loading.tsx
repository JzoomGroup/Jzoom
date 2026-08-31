export default function Loading() {
  return (
    <main className="system-state-shell" aria-busy="true" aria-live="polite">
      <section className="system-state-card">
        <span className="system-state-spinner" aria-hidden="true" />
        <p>جاري تجهيز الصفحة...</p>
      </section>
    </main>
  );
}

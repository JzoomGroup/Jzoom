import { ClientReportList } from "../../../components/operations/client-reports";
import { ClientShell } from "../../../components/client-portal/client-shell";
import { getCurrentUser } from "../../../lib/auth";
import { requireClientReports } from "../../../lib/operations-server";

export default async function ClientReportsPage() {
  const [user, reports] = await Promise.all([getCurrentUser(), requireClientReports()]);

  return (
    <ClientShell
      activePath="/client/reports"
      displayName={user?.displayName ?? "Client"}
      locale={user?.preferredLocale ?? "en"}
    >
      <ClientReportList reports={reports} />
    </ClientShell>
  );
}

import { ClientShell } from "../../../../components/client-portal/client-shell";
import { ClientReportDetail } from "../../../../components/operations/client-reports";
import { getCurrentUser } from "../../../../lib/auth";
import { requireClientReport } from "../../../../lib/operations-server";

export default async function ClientReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const [user, report] = await Promise.all([getCurrentUser(), requireClientReport(reportId)]);

  return (
    <ClientShell activePath="/client/reports" displayName={user?.displayName ?? "Client"}>
      <ClientReportDetail report={report} />
    </ClientShell>
  );
}

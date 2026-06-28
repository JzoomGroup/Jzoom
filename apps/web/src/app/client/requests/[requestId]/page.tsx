import { ClientRequestDetail } from "../../../../components/client-portal/client-request-detail";
import { ClientShell } from "../../../../components/client-portal/client-shell";
import { requireClientPortalAccount } from "../../../../lib/client-portal-server";
import { requireClientRequest } from "../../../../lib/request-server";

export default async function ClientRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const [account, request] = await Promise.all([
    requireClientPortalAccount(),
    requireClientRequest(requestId),
  ]);

  return (
    <ClientShell
      activePath="/client/requests"
      displayName={account.user.displayName}
      locale={account.user.preferredLocale}
    >
      <ClientRequestDetail request={request} />
    </ClientShell>
  );
}

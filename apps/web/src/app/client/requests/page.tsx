import { ClientRequestList } from "../../../components/client-portal/client-request-list";
import { ClientShell } from "../../../components/client-portal/client-shell";
import { requireClientPortalAccount } from "../../../lib/client-portal-server";
import { requireClientRequests } from "../../../lib/request-server";

export default async function ClientRequestsPage() {
  const [account, requests] = await Promise.all([
    requireClientPortalAccount(),
    requireClientRequests(),
  ]);

  return (
    <ClientShell
      activePath="/client/requests"
      displayName={account.user.displayName}
      locale={account.user.preferredLocale}
    >
      <ClientRequestList
        account={account}
        locale={account.user.preferredLocale}
        requests={requests}
      />
    </ClientShell>
  );
}

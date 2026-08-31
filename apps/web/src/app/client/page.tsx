import { ClientOverview } from "../../components/client-portal/client-overview";
import { ClientShell } from "../../components/client-portal/client-shell";
import { requireClientPortalAccount } from "../../lib/client-portal-server";
import { requireClientRequests } from "../../lib/request-server";

export default async function ClientPortalPage() {
  const [account, requests] = await Promise.all([
    requireClientPortalAccount(),
    requireClientRequests(),
  ]);

  return (
    <ClientShell
      activePath="/client"
      displayName={account.user.displayName}
      locale={account.user.preferredLocale}
    >
      <ClientOverview account={account} requests={requests} locale={account.user.preferredLocale} />
    </ClientShell>
  );
}

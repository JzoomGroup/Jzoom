import { ClientOverview } from "../../components/client-portal/client-overview";
import { ClientShell } from "../../components/client-portal/client-shell";
import {
  requireClientInvoices,
  requireClientPortalAccount,
  requireClientQuotes,
} from "../../lib/client-portal-server";
import { requireClientRequests } from "../../lib/request-server";

export default async function ClientPortalPage() {
  const [account, quotes, invoices, requests] = await Promise.all([
    requireClientPortalAccount(),
    requireClientQuotes(),
    requireClientInvoices(),
    requireClientRequests(),
  ]);

  return (
    <ClientShell activePath="/client" displayName={account.user.displayName}>
      <ClientOverview account={account} quotes={quotes} invoices={invoices} requests={requests} />
    </ClientShell>
  );
}

import { ClientQuoteList } from "../../../components/client-portal/client-quote-list";
import { ClientShell } from "../../../components/client-portal/client-shell";
import { requireClientPortalAccount, requireClientQuotes } from "../../../lib/client-portal-server";

export default async function ClientQuotesPage() {
  const [account, quotes] = await Promise.all([
    requireClientPortalAccount(),
    requireClientQuotes(),
  ]);

  return (
    <ClientShell activePath="/client/quotes" displayName={account.user.displayName}>
      <ClientQuoteList quotes={quotes} />
    </ClientShell>
  );
}

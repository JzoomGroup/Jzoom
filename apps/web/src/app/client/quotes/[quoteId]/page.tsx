import { ClientQuoteDetail } from "../../../../components/client-portal/client-quote-detail";
import { ClientShell } from "../../../../components/client-portal/client-shell";
import {
  requireClientPortalAccount,
  requireClientQuote,
} from "../../../../lib/client-portal-server";

export default async function ClientQuoteDetailPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = await params;
  const [account, quote] = await Promise.all([
    requireClientPortalAccount(),
    requireClientQuote(quoteId),
  ]);

  return (
    <ClientShell
      activePath="/client/quotes"
      displayName={account.user.displayName}
      locale={account.user.preferredLocale}
    >
      <ClientQuoteDetail quote={quote} />
    </ClientShell>
  );
}

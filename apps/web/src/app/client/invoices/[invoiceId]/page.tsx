import { ClientInvoiceDetail } from "../../../../components/client-portal/client-invoice-detail";
import { ClientShell } from "../../../../components/client-portal/client-shell";
import {
  requireClientInvoice,
  requireClientPortalAccount,
} from "../../../../lib/client-portal-server";

export default async function ClientInvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const [account, invoice] = await Promise.all([
    requireClientPortalAccount(),
    requireClientInvoice(invoiceId),
  ]);

  return (
    <ClientShell
      activePath="/client/invoices"
      displayName={account.user.displayName}
      locale={account.user.preferredLocale}
    >
      <ClientInvoiceDetail invoice={invoice} />
    </ClientShell>
  );
}

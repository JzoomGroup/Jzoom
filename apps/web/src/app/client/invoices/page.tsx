import { ClientInvoiceList } from "../../../components/client-portal/client-invoice-list";
import { ClientShell } from "../../../components/client-portal/client-shell";
import {
  requireClientInvoices,
  requireClientPortalAccount,
} from "../../../lib/client-portal-server";

export default async function ClientInvoicesPage() {
  const [account, invoices] = await Promise.all([
    requireClientPortalAccount(),
    requireClientInvoices(),
  ]);

  return (
    <ClientShell
      activePath="/client/invoices"
      displayName={account.user.displayName}
      locale={account.user.preferredLocale}
    >
      <ClientInvoiceList invoices={invoices} locale={account.user.preferredLocale} />
    </ClientShell>
  );
}

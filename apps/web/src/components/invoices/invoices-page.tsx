import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { requireInvoice, requireInvoices } from "../../lib/invoice-server";
import { CommercialShell } from "../commercial-shell";
import { InvoiceDetail } from "./invoice-detail";
import { InvoiceList } from "./invoice-list";

function canUseInvoices(
  user: Awaited<ReturnType<typeof getCurrentUser>>,
): user is NonNullable<typeof user> {
  return Boolean(
    user &&
    user.roles.some(
      (role) => role === "ROLE-ADMIN" || role === "ROLE-MGMT" || role === "ROLE-AM",
    ) &&
    user.permissions.includes("PERM-MANAGE-INVOICES"),
  );
}

export async function InvoicesPage({ invoiceId }: { invoiceId?: string }) {
  const [user, content] = await Promise.all([
    getCurrentUser(),
    invoiceId ? requireInvoice(invoiceId) : requireInvoices(),
  ]);
  if (!user) {
    redirect("/login");
  }
  if (!canUseInvoices(user)) {
    redirect("/403");
  }

  return (
    <CommercialShell
      activePath="/pricing/invoices"
      displayName={user.displayName}
      locale={user.preferredLocale}
      permissions={user.permissions}
      roles={user.roles}
    >
      {Array.isArray(content) ? (
        <InvoiceList invoices={content} locale={user.preferredLocale} />
      ) : (
        <InvoiceDetail initialInvoice={content} locale={user.preferredLocale} />
      )}
    </CommercialShell>
  );
}

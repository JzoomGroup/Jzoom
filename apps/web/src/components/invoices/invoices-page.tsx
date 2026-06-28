import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { requireInvoice, requireInvoices } from "../../lib/invoice-server";
import { QuoteShell } from "../quotes/quote-shell";
import { InvoiceDetail } from "./invoice-detail";
import { InvoiceList } from "./invoice-list";

function canUseInvoices(
  user: Awaited<ReturnType<typeof getCurrentUser>>,
): user is NonNullable<typeof user> {
  return Boolean(
    user &&
    user.roles.some((role) => role === "ROLE-ADMIN" || role === "ROLE-AM") &&
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
    <QuoteShell
      activePath="/pricing/invoices"
      displayName={user.displayName}
      isAdmin={user.roles.includes("ROLE-ADMIN")}
      locale={user.preferredLocale}
      permissions={user.permissions}
      roles={user.roles}
    >
      {Array.isArray(content) ? (
        <InvoiceList invoices={content} />
      ) : (
        <InvoiceDetail initialInvoice={content} />
      )}
    </QuoteShell>
  );
}

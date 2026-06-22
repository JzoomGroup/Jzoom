import { InvoicesPage } from "../../../../components/invoices/invoices-page";

export default async function Page({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  return <InvoicesPage invoiceId={invoiceId} />;
}

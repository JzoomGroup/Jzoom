import { QuotesPage } from "../../../../components/quotes/quotes-page";

export default async function PricingQuoteDetailPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = await params;
  return <QuotesPage quoteId={quoteId} />;
}

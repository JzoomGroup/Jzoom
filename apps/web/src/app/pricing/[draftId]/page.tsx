import { PricingStudioPage } from "../../../components/pricing/pricing-studio-page";

export default async function PricingDraftPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;
  return <PricingStudioPage draftId={draftId} />;
}

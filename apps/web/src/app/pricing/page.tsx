import { PricingStudioPage } from "../../components/pricing/pricing-studio-page";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ newClient?: string }>;
}) {
  const params = await searchParams;
  return <PricingStudioPage openClientCreator={params.newClient === "1"} />;
}

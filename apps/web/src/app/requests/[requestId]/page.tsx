import { RequestsPage } from "../../../components/requests/requests-page";

export default async function InternalRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  return <RequestsPage requestId={requestId} />;
}

import { BatchDetailView } from '../../../components/BatchDetailView';
export default async function BatchDetails({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  return <BatchDetailView batchId={batchId} />;
}

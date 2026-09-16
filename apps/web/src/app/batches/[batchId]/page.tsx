import { BatchDetailView } from '../../../components/BatchDetailView';
export default function BatchDetails({ params }: { params: { batchId: string } }) { return <BatchDetailView batchId={params.batchId} />; }

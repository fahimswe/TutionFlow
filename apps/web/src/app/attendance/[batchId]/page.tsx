import { AttendanceView } from '../../../components/AttendanceView';
export default async function AttendanceDetails({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  return <AttendanceView batchId={batchId} />;
}

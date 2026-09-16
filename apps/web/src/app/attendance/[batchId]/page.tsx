import { AttendanceView } from '../../../components/AttendanceView';
export default function AttendanceDetails({ params }: { params: { batchId: string } }) { return <AttendanceView batchId={params.batchId} />; }

import { StudentDetailView } from '../../../components/StudentDetailView';
export default function StudentDetails({ params }: { params: { studentId: string } }) { return <StudentDetailView studentId={params.studentId} />; }

import { StudentDetailView } from '../../../components/StudentDetailView';
export default async function StudentDetails({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  return <StudentDetailView studentId={studentId} />;
}

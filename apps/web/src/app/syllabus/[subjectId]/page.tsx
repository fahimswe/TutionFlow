import { SyllabusDetailView } from '../../../components/SyllabusDetailView';
export default async function SyllabusDetails({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  return <SyllabusDetailView subjectId={subjectId} />;
}

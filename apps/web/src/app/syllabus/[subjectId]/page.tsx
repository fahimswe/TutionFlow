import { SyllabusDetailView } from '../../../components/SyllabusDetailView';
export default function SyllabusDetails({ params }: { params: { subjectId: string } }) { return <SyllabusDetailView subjectId={params.subjectId} />; }

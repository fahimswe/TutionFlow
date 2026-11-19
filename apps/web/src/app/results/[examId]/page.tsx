import { ResultEntryView } from '../../../components/ResultEntryView';

export default async function ResultDetails({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  return <ResultEntryView examId={examId} />;
}

import { ResourcePage } from '../../components/ResourcePage';
export default function ResultsPage() { return <ResourcePage eyebrow="Assessment" title="Results" description="Review assessment performance by exam and batch." endpoint="/api/exams" columns={['title', 'scheduledAt', 'totalMarks']} detailPrefix="/results" />; }

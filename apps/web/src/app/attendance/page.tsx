import { ResourcePage } from '../../components/ResourcePage';
export default function AttendancePage() { return <ResourcePage eyebrow="Assessment" title="Attendance" description="Review attendance by class, student, or batch." endpoint="/api/batches" columns={['name', 'status']} detailPrefix="/attendance" />; }

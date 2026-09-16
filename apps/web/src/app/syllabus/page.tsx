import { ResourcePage } from '../../components/ResourcePage';
export default function SyllabusPage() { return <ResourcePage eyebrow="Teaching" title="Syllabus" description="Follow subjects, chapters, topics, and progress in one place." endpoint="/api/subjects" columns={['name', 'code', 'description']} detailPrefix="/syllabus" />; }

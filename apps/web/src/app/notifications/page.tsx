import { AppShell, PageHeader, State } from '../../components/AppShell';
export default function NotificationsPage() { return <AppShell><PageHeader eyebrow="Account" title="Notifications" description="Keep important changes and reminders close by." /><section className="surface"><State empty="No notification feed is available yet." /></section></AppShell>; }

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api';
import { AppShell, PageHeader, State } from '../../components/AppShell';

type Session = { id: string; scheduledAt: string; durationMin: number; status: string; batch: { name: string }; subject?: { name: string }; topic?: { title: string } };
export default function CalendarPage() {
  const [view, setView] = useState<'day' | 'week' | 'month'>('week'); const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); const [sessions, setSessions] = useState<Session[]>([]); const [error, setError] = useState('');
  useEffect(() => { setError(''); apiFetch<{ sessions: Session[] }>(`/api/calendar?view=${view}&date=${date}`).then((data) => setSessions(data.sessions)).catch((reason: Error) => setError(reason.message)); }, [view, date]);
  return <AppShell><PageHeader eyebrow="Teaching" title="Calendar" description="See every class by day, week, or month." action={<Link href="/routine" className="button primary">Schedule class</Link>} /><section className="surface"><div className="toolbar"><label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><div>{(['day', 'week', 'month'] as const).map((item) => <button key={item} className={view === item ? 'button primary' : 'button'} onClick={() => setView(item)}>{item}</button>)}</div></div><State loading={!sessions.length && !error} error={error} empty={sessions.length === 0 ? `No sessions in this ${view}.` : undefined}>{sessions.map((session) => <Link className="list-row" href="/routine" key={session.id}><time>{new Date(session.scheduledAt).toLocaleString()}</time><div><strong>{session.subject?.name ?? 'Class'} · {session.batch.name}</strong><span>{session.topic?.title ?? 'General lesson'} · {session.durationMin} minutes</span></div><em>{session.status.toLowerCase()}</em></Link>)}</State></section></AppShell>;
}

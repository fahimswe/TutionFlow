'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { AppShell, PageHeader, State } from '../../components/AppShell';

type Analytics = { metrics: { attendance: number; examAverage: number; syllabus: { percentage: number } }; batches: Array<{ name: string; attendance: number; studentCount: number }> };

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { apiFetch<Analytics>('/api/dashboard').then(setData).catch((reason: Error) => setError(reason.message)); }, []);
  return <AppShell>
    <PageHeader eyebrow="Overview" title="Analytics" description="A focused view of the signals that shape your next decision." />
    <State loading={!data && !error} error={error} empty={data && !data.batches.length ? 'No analytics yet.' : undefined}>
      {data && <div className="analytics-grid"><section className="metric-grid"><div className="metric-card"><span>Attendance</span><strong>{data.metrics.attendance}%</strong></div><div className="metric-card"><span>Syllabus</span><strong>{data.metrics.syllabus.percentage}%</strong></div><div className="metric-card"><span>Exam average</span><strong>{data.metrics.examAverage}%</strong></div></section><section className="surface"><div className="section-title"><div><p className="eyebrow">Comparison</p><h2>Batch performance</h2></div></div>{data.batches.map((batch) => <div className="analytics-row" key={batch.name}><strong>{batch.name}</strong><span>{batch.studentCount} students</span><b>{batch.attendance}% attendance</b><div className="progress"><span style={{ width: `${batch.attendance}%` }} /></div></div>)}</section></div>}
    </State>
  </AppShell>;
}

'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { AppShell, PageHeader, State } from './AppShell';

export function DetailPage({ title, endpoint, eyebrow = 'Details' }: { title: string; endpoint: string; eyebrow?: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null); const [error, setError] = useState('');
  useEffect(() => { apiFetch<Record<string, unknown>>(endpoint).then(setData).catch((reason: Error) => setError(reason.message)); }, [endpoint]);
  return <AppShell><PageHeader eyebrow={eyebrow} title={title} description="Details from the TutionFlow API." /><section className="surface"><State loading={!data && !error} error={error}>{data && <pre className="data-preview">{JSON.stringify(data, null, 2)}</pre>}</State></section></AppShell>;
}

'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch, toJson } from '../lib/api';
import { AppShell, PageHeader, State } from './AppShell';

type ResourcePageProps = { title: string; eyebrow: string; description: string; endpoint: string; fields?: Array<{ name: string; label: string; type?: string; required?: boolean }>; columns?: string[]; detailPrefix?: string; actionLabel?: string };

export function ResourcePage({ title, eyebrow, description, endpoint, fields = [], columns = [], detailPrefix, actionLabel = 'Add record' }: ResourcePageProps) {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  function load() { setLoading(true); apiFetch<Array<Record<string, unknown>>>(endpoint).then(setItems).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false)); }
  useEffect(load, [endpoint]);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget).entries()); try { await apiFetch(endpoint, { method: 'POST', body: toJson(data) }); setOpen(false); setNotice('Saved successfully.'); load(); } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Unable to save.'); } }
  const filtered = items.filter((item) => JSON.stringify(item).toLowerCase().includes(query.toLowerCase()));
  return <AppShell>
    <PageHeader eyebrow={eyebrow} title={title} description={description} action={fields.length ? <button className="button primary" onClick={() => setOpen(true)}>+ {actionLabel}</button> : undefined} />
    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">x</button></div>}
    <section className="surface"><div className="toolbar"><label className="search-field"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} aria-label={`Search ${title}`} /></label><span className="result-count">{items.length} records</span></div>
      <State loading={loading} error={error} empty={!filtered.length && !query ? `No ${title.toLowerCase()} yet.` : undefined}>
        {filtered.length > 0 && <div className="table-scroll"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}{detailPrefix && <th>Open</th>}</tr></thead><tbody>{filtered.map((item, index) => <tr key={String(item.id ?? index)}>{columns.map((column) => <td key={column}>{renderValue(item, column)}</td>)}{detailPrefix && <td><a className="table-link" href={`${detailPrefix}/${item.id}`}>View</a></td>}</tr>)}</tbody></table></div>}
      </State>
    </section>
    {open && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="section-title"><h2 id="modal-title">{actionLabel}</h2><button className="close-button" onClick={() => setOpen(false)} aria-label="Close">x</button></div><form onSubmit={submit}>{fields.map((field) => <label key={field.name}>{field.label}<input name={field.name} type={field.type ?? 'text'} required={field.required} /></label>)}<button className="button primary wide">Save</button></form></section></div>}
  </AppShell>;
}

function renderValue(item: Record<string, unknown>, column: string) {
  const direct = item[column];
  if (direct !== undefined && direct !== null) return String(direct);
  const user = item.user;
  if (user && typeof user === 'object' && column in user) return String((user as Record<string, unknown>)[column] ?? '-');
  return '-';
}

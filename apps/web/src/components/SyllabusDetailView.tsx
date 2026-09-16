'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell, PageHeader, State } from './AppShell';
import { apiFetch, toJson } from '../lib/api';

type Topic = { id: string; title: string; description?: string | null; order: number };
type Chapter = { id: string; title: string; description?: string | null; order: number; topics: Topic[] };
type Subject = { id: string; name: string; code: string; description?: string | null; chapters: Chapter[] };

export function SyllabusDetailView({ subjectId }: { subjectId: string }) {
  const [subject, setSubject] = useState<Subject | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [topicFor, setTopicFor] = useState('');

  function load() { setError(''); apiFetch<Subject>(`/api/subjects/${subjectId}`).then(setSubject).catch((reason: Error) => setError(reason.message)); }
  useEffect(load, [subjectId]);
  async function saveSubject(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { await apiFetch(`/api/subjects/${subjectId}`, { method: 'PATCH', body: toJson(Object.fromEntries(new FormData(event.currentTarget).entries())) }); setNotice('Subject updated.'); load(); } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Unable to save subject.'); } }
  async function addChapter(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { await apiFetch(`/api/subjects/${subjectId}/chapters`, { method: 'POST', body: toJson({ title: chapterTitle }) }); setChapterTitle(''); setNotice('Chapter created.'); load(); } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Unable to create chapter.'); } }
  async function addTopic(event: FormEvent<HTMLFormElement>, chapterId: string) { event.preventDefault(); const title = String(new FormData(event.currentTarget).get('title') ?? ''); try { await apiFetch(`/api/chapters/${chapterId}/topics`, { method: 'POST', body: toJson({ title }) }); setTopicFor(''); setNotice('Topic created.'); load(); } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Unable to create topic.'); } }
  return <AppShell><PageHeader eyebrow="Syllabus" title={subject?.name ?? 'Subject syllabus'} description="Build a structured chapter and topic plan for every subject." />{notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">x</button></div>}<State loading={!subject && !error} error={error}>{subject && <><section className="surface"><form className="form-grid" onSubmit={saveSubject}><label>Subject name<input name="name" defaultValue={subject.name} required /></label><label>Code<input name="code" defaultValue={subject.code} required /></label><label>Description<textarea name="description" defaultValue={subject.description ?? ''} /></label><button className="button primary">Save subject</button></form></section><section className="surface"><div className="section-title"><div><p className="eyebrow">Curriculum</p><h2>Chapters and topics</h2></div></div><form className="toolbar" onSubmit={addChapter}><input value={chapterTitle} onChange={(event) => setChapterTitle(event.target.value)} placeholder="New chapter title" required /><button className="button primary">Add chapter</button></form>{subject.chapters.length ? <div className="calendar-list">{subject.chapters.map((chapter) => <div className="list-row" key={chapter.id}><div><strong>{chapter.order}. {chapter.title}</strong><span>{chapter.topics.length} topics</span>{chapter.topics.map((topic) => <span key={topic.id}>• {topic.order}. {topic.title}</span>)}</div><button className="button" type="button" onClick={() => setTopicFor(topicFor === chapter.id ? '' : chapter.id)}>Add topic</button>{topicFor === chapter.id && <form className="toolbar" onSubmit={(event) => addTopic(event, chapter.id)}><input name="title" placeholder="Topic title" required /><button className="button primary">Save topic</button></form>}</div>)}</div> : <State empty="No chapters yet. Add the first chapter to begin your syllabus." />}</section></>}</State></AppShell>;
}

'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell, PageHeader, State } from './AppShell';
import { apiFetch, toJson } from '../lib/api';

type Student = { id: string; user: { fullName: string; email: string } };
type Batch = { id: string; name: string; code: string; academicYear: string; description?: string | null; status: string; enrollments: Array<{ student: Student }> };

export function BatchDetailView({ batchId }: { batchId: string }) {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  function load() {
    setError('');
    Promise.all([apiFetch<Batch>(`/api/batches/${batchId}`), apiFetch<Student[]>('/api/students')])
      .then(([loadedBatch, loadedStudents]) => { setBatch(loadedBatch); setStudents(loadedStudents); })
      .catch((reason: Error) => setError(reason.message));
  }
  useEffect(load, [batchId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await apiFetch(`/api/batches/${batchId}`, { method: 'PATCH', body: toJson(Object.fromEntries(new FormData(event.currentTarget).entries())) });
      setNotice('Batch updated.'); load();
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Unable to update batch.'); }
  }
  async function enroll() {
    if (!selectedStudentId) return;
    try { await apiFetch(`/api/batches/${batchId}/students/${selectedStudentId}`, { method: 'POST' }); setSelectedStudentId(''); setNotice('Student added to batch.'); load(); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Unable to enroll student.'); }
  }
  async function remove(studentId: string) {
    if (!window.confirm('Remove this student from the batch?')) return;
    try { await apiFetch(`/api/batches/${batchId}/students/${studentId}`, { method: 'DELETE' }); setNotice('Student removed from batch.'); load(); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Unable to remove student.'); }
  }
  async function archive() {
    if (!window.confirm('Archive this batch? You can restore it later.')) return;
    try { await apiFetch(`/api/batches/${batchId}/archive`, { method: 'POST' }); window.location.assign('/batches'); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Unable to archive batch.'); }
  }

  const enrolled = new Set(batch?.enrollments.map((item) => item.student.id));
  return <AppShell><PageHeader eyebrow="Teaching" title={batch?.name ?? 'Batch details'} description="Manage the batch, its enrolled students, and its teaching workflow." action={batch ? <button className="button" onClick={archive}>Archive batch</button> : undefined} />
    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">x</button></div>}
    <State loading={!batch && !error} error={error}>{batch && <div className="dashboard-columns"><section className="surface"><div className="section-title"><div><p className="eyebrow">Batch information</p><h2>Details</h2></div></div><form className="form-grid" onSubmit={save}><label>Name<input name="name" defaultValue={batch.name} required /></label><label>Code<input name="code" defaultValue={batch.code} required /></label><label>Academic year<input name="academicYear" defaultValue={batch.academicYear} required /></label><label>Status<select name="status" defaultValue={batch.status}><option value="PLANNED">Planned</option><option value="ACTIVE">Active</option><option value="COMPLETED">Completed</option></select></label><label>Description<textarea name="description" defaultValue={batch.description ?? ''} /></label><button className="button primary">Save changes</button></form></section>
      <section className="surface"><div className="section-title"><div><p className="eyebrow">Students</p><h2>{batch.enrollments.length} enrolled</h2></div><Link href="/students">Manage students</Link></div><div className="toolbar"><select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} aria-label="Student to add"><option value="">Select a student</option>{students.filter((student) => !enrolled.has(student.id)).map((student) => <option key={student.id} value={student.id}>{student.user.fullName} — {student.user.email}</option>)}</select><button className="button primary" type="button" disabled={!selectedStudentId} onClick={enroll}>Add student</button></div>{batch.enrollments.length ? <div className="calendar-list">{batch.enrollments.map(({ student }) => <div className="list-row" key={student.id}><span className="avatar">{student.user.fullName.slice(0, 2).toUpperCase()}</span><div><Link href={`/students/${student.id}`}><strong>{student.user.fullName}</strong></Link><span>{student.user.email}</span></div><button className="button" type="button" onClick={() => remove(student.id)}>Remove</button></div>)}</div> : <State empty="No students are enrolled yet." />}</section></div>}</State>
  </AppShell>;
}

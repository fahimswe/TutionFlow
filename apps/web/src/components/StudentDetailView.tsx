'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell, PageHeader, State } from './AppShell';
import { apiFetch, toJson } from '../lib/api';

type Batch = { id: string; name: string; code: string };
type Student = { id: string; parentName?: string | null; parentPhone?: string | null; address?: string | null; user: { fullName: string; email: string; phone?: string | null }; enrollments: Array<{ batch: Batch }> };
type StudentSummary = { attendance: { percentage: number }; syllabus: { percentage: number }; examPerformance: { averagePercentage: number; resultCount: number }; recentResults: Array<{ id: string; marksObtained: number | null; grade?: string | null; exam: { id: string; title: string; totalMarks: number } }> };

export function StudentDetailView({ studentId }: { studentId: string }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  function load() {
    setError('');
    Promise.all([apiFetch<Student>(`/api/students/${studentId}`), apiFetch<StudentSummary>(`/api/dashboard/students/${studentId}`), apiFetch<Batch[]>('/api/batches')])
      .then(([loadedStudent, loadedSummary, loadedBatches]) => { setStudent(loadedStudent); setSummary(loadedSummary); setBatches(loadedBatches); })
      .catch((reason: Error) => setError(reason.message));
  }
  useEffect(load, [studentId]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { await apiFetch(`/api/students/${studentId}`, { method: 'PATCH', body: toJson(Object.fromEntries(new FormData(event.currentTarget).entries())) }); setNotice('Student updated.'); load(); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Unable to update student.'); }
  }
  async function addToBatch() {
    if (!selectedBatchId) return;
    try { await apiFetch(`/api/batches/${selectedBatchId}/students/${studentId}`, { method: 'POST' }); setSelectedBatchId(''); setNotice('Student enrolled.'); load(); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Unable to enroll student.'); }
  }
  async function removeFromBatch(batchId: string) {
    if (!window.confirm('Remove this student from the batch?')) return;
    try { await apiFetch(`/api/batches/${batchId}/students/${studentId}`, { method: 'DELETE' }); setNotice('Student removed from batch.'); load(); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Unable to remove student.'); }
  }
  async function archive() {
    if (!window.confirm('Archive this student?')) return;
    try { await apiFetch(`/api/students/${studentId}/archive`, { method: 'POST' }); window.location.assign('/students'); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Unable to archive student.'); }
  }
  const enrolled = new Set(student?.enrollments.map((item) => item.batch.id));
  return <AppShell><PageHeader eyebrow="Teaching" title={student?.user.fullName ?? 'Student details'} description="Maintain contact details, enrollments, and academic signals in one place." action={student ? <button className="button" onClick={archive}>Archive student</button> : undefined} />{notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">x</button></div>}<State loading={!student && !error} error={error}>{student && <><section className="metric-grid"><div className="metric-card"><span>Attendance</span><strong>{summary?.attendance.percentage ?? 0}%</strong></div><div className="metric-card"><span>Syllabus progress</span><strong>{summary?.syllabus.percentage ?? 0}%</strong></div><div className="metric-card"><span>Exam average</span><strong>{summary?.examPerformance.averagePercentage ?? 0}%</strong><small>{summary?.examPerformance.resultCount ?? 0} results</small></div></section><div className="dashboard-columns"><section className="surface"><div className="section-title"><div><p className="eyebrow">Student information</p><h2>Details</h2></div></div><form className="form-grid" onSubmit={save}><label>Full name<input name="fullName" defaultValue={student.user.fullName} required /></label><label>Email<input value={student.user.email} readOnly /></label><label>Phone<input name="phone" defaultValue={student.user.phone ?? ''} /></label><label>Parent name<input name="parentName" defaultValue={student.parentName ?? ''} /></label><label>Parent phone<input name="parentPhone" defaultValue={student.parentPhone ?? ''} /></label><label>Address<textarea name="address" defaultValue={student.address ?? ''} /></label><button className="button primary">Save changes</button></form></section><section className="surface"><div className="section-title"><div><p className="eyebrow">Enrollments</p><h2>Assigned batches</h2></div></div><div className="toolbar"><select value={selectedBatchId} onChange={(event) => setSelectedBatchId(event.target.value)} aria-label="Batch to add"><option value="">Select a batch</option>{batches.filter((batch) => !enrolled.has(batch.id)).map((batch) => <option value={batch.id} key={batch.id}>{batch.name} ({batch.code})</option>)}</select><button className="button primary" type="button" disabled={!selectedBatchId} onClick={addToBatch}>Add to batch</button></div>{student.enrollments.length ? <div className="calendar-list">{student.enrollments.map(({ batch }) => <div className="list-row" key={batch.id}><div><Link href={`/batches/${batch.id}`}><strong>{batch.name}</strong></Link><span>{batch.code}</span></div><button className="button" type="button" onClick={() => removeFromBatch(batch.id)}>Remove</button></div>)}</div> : <State empty="This student is not enrolled in a batch." />}</section></div><section className="surface"><div className="section-title"><div><p className="eyebrow">Assessment</p><h2>Recent results</h2></div><Link href="/results">All results</Link></div>{summary?.recentResults.length ? <div className="table-scroll"><table><thead><tr><th>Exam</th><th>Marks</th><th>Grade</th></tr></thead><tbody>{summary.recentResults.map((result) => <tr key={result.id}><td>{result.exam.title}</td><td>{result.marksObtained ?? '-'} / {result.exam.totalMarks}</td><td>{result.grade ?? '-'}</td></tr>)}</tbody></table></div> : <State empty="No recorded exam results yet." />}</section></>}</State></AppShell>;
}

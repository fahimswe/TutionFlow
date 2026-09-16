'use client';

import { FormEvent, useState } from 'react';
import { AppShell, PageHeader } from '../../components/AppShell';
import { apiFetch, toJson } from '../../lib/api';

export default function SettingsPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get('newPassword') ?? '');
    if (newPassword !== String(form.get('confirmation') ?? '')) {
      setError('New password and confirmation must match.');
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/api/auth/change-password', { method: 'POST', body: toJson({ currentPassword: form.get('currentPassword'), newPassword }) });
      event.currentTarget.reset();
      setMessage('Your password has been changed.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to change password.');
    } finally {
      setBusy(false);
    }
  }

  return <AppShell><PageHeader eyebrow="Account" title="Settings" description="Manage the security of your tutor account." /><section className="surface"><div className="section-title"><div><p className="eyebrow">Security</p><h2>Change password</h2></div></div><form className="form-grid" onSubmit={changePassword}><label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required /></label><label>New password<input name="newPassword" type="password" minLength={8} autoComplete="new-password" required /></label><label>Confirm new password<input name="confirmation" type="password" minLength={8} autoComplete="new-password" required /></label>{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="muted" role="status">{message}</p>}<button className="button primary" disabled={busy}>{busy ? 'Saving...' : 'Change password'}</button></form></section></AppShell>;
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch, clearSession, getToken } from '../lib/api';

const groups = [
  { label: 'Overview', items: [['Dashboard', '/'], ['Analytics', '/analytics']] },
  { label: 'Teaching', items: [['Batches', '/batches'], ['Students', '/students'], ['Subjects', '/subjects'], ['Syllabus', '/syllabus'], ['Routine', '/routine'], ['Calendar', '/calendar']] },
  { label: 'Assessment', items: [['Attendance', '/attendance'], ['Exams', '/exams'], ['Results', '/results']] },
  { label: 'Account', items: [['Notifications', '/notifications'], ['Profile', '/profile'], ['Settings', '/settings']] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    apiFetch('/api/auth/me').then(() => setReady(true)).catch(() => {
      clearSession();
      router.replace('/login');
    });
  }, [router]);

  async function signOut() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Clear the browser session even if the API is unavailable.
    }
    clearSession();
    router.replace('/login');
  }

  if (!ready) return <main className="auth-page"><div className="state"><span className="spinner" /> Checking your session...</div></main>;

  return <div className="app-frame">
    <aside className="app-sidebar"><Link href="/" className="app-brand"><span>TF</span><strong>TutionFlow</strong></Link><nav aria-label="Main navigation">{groups.map((group) => <div className="nav-group" key={group.label}><small>{group.label}</small>{group.items.map(([label, href]) => <Link className={pathname === href || (href !== '/' && pathname.startsWith(href)) ? 'nav-link current' : 'nav-link'} href={href} key={href}><i aria-hidden="true">{label.slice(0, 1)}</i>{label}</Link>)}</div>)}</nav><div className="sidebar-user"><span className="avatar">TF</span><div><strong>Tutor workspace</strong><small>Signed in</small></div><button title="Sign out" aria-label="Sign out" onClick={() => { void signOut(); }}>Sign out</button></div></aside>
    <div className="app-main"><header className="app-header"><button className="mobile-menu" aria-label="Open navigation">Menu</button><div className="header-search"><span aria-hidden="true">Search</span><input aria-label="Search" placeholder="Search anything" /></div><div className="header-actions"><Link href="/notifications" className="header-icon" title="Notifications" aria-label="Notifications">Alerts</Link><Link href="/profile" className="profile-chip"><span className="avatar small">TF</span><span className="hide-mobile">Tutor account</span></Link></div></header><main className="app-content">{children}</main></div>
  </div>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action}</div>;
}

export function State({ loading, error, empty, children }: { loading?: boolean; error?: string; empty?: string; children?: React.ReactNode }) {
  if (loading) return <div className="state"><span className="spinner" /> Loading data...</div>;
  if (error) return <div className="state error-state"><strong>Could not load this view</strong><span>{error}</span></div>;
  if (empty) return <div className="state"><strong>{empty}</strong><span>Records from the API will appear here when available.</span></div>;
  return <>{children}</>;
}

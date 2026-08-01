import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/actions';
import { AdminShell } from './admin-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side gate: only admins and moderators may render admin pages.
  // The backend re-checks the role on every admin API call regardless.
  const session = await getSession();
  const roles = session.roles ?? [];
  if (!session.isLoggedIn || !(roles.includes('admin') || roles.includes('moderator'))) {
    redirect('/');
  }
  return <AdminShell>{children}</AdminShell>;
}

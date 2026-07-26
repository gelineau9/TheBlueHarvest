import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/actions';

export default async function CollectionEditLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect('/');
  }
  return <>{children}</>;
}

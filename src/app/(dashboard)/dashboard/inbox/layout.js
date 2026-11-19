import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { checkInboxSession } from '@/lib/inbox-access';
import InboxShell from './InboxShell';

export const metadata = {
  title: 'Inbox Greenland',
  manifest: '/inbox.webmanifest',
  appleWebApp: { capable: true, title: 'Inbox Greenland', statusBarStyle: 'default' },
  icons: { apple: '/inbox-icon?size=192' },
  robots: { index: false, follow: false },
};

export default async function InboxLayout({ children }) {
  const access = await checkInboxSession(await createClient());
  if (access.status === 401) redirect('/login?next=%2Fdashboard%2Finbox');
  if (access.status) return <div className="p-6">No tienes acceso al Inbox.</div>;
  return <InboxShell userName={access.profile.full_name || access.user.email?.split('@')[0] || ''}>{children}</InboxShell>;
}

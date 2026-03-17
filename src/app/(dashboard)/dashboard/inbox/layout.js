'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Settings, Radio, MessageSquare
} from 'lucide-react';

export default function InboxLayout({ children }) {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active, full_name')
        .eq('id', user.id)
        .single();

      if (!profile || profile.is_active === false) {
        router.push('/pending-approval');
        return;
      }
      setUserName(profile.full_name || user.email?.split('@')[0] || '');
      setLoading(false);
    }
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f6f6' }}>
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#6a9a04] rounded-full animate-spin" />
      </div>
    );
  }

  const isSettings = pathname?.includes('/settings');
  const isBroadcast = pathname?.includes('/broadcast');

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: '#f8f6f6',
      backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')",
    }}>
      {/* Mini sidebar */}
      <div style={{
        width: 56,
        minWidth: 56,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: 4,
        borderRight: '1px solid rgba(148, 163, 184, 0.15)',
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Logo */}
        <Link
          href="/dashboard"
          title="Volver al Dashboard"
          style={{
            width: 36, height: 36,
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #6a9a04, #8bc34a)',
            color: '#fff', fontWeight: 900, fontSize: 14,
            textDecoration: 'none',
            marginBottom: 8,
            transition: 'transform 0.2s',
          }}
          className="hover:scale-110"
        >
          G
        </Link>

        {/* Back to dashboard */}
        <Link
          href="/dashboard"
          title="← Dashboard"
          className={`hover:bg-slate-100 transition-colors`}
          style={{
            width: 36, height: 36, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#64748b', textDecoration: 'none',
          }}
        >
          <ArrowLeft size={18} />
        </Link>

        <div style={{ height: 1, width: 24, background: '#e2e8f0', margin: '4px 0' }} />

        {/* Inbox */}
        <Link
          href="/dashboard/inbox"
          title="Inbox"
          className="hover:bg-slate-100 transition-colors"
          style={{
            width: 36, height: 36, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: !isSettings && !isBroadcast ? '#6a9a04' : '#64748b',
            background: !isSettings && !isBroadcast ? 'rgba(106,154,4,0.1)' : 'transparent',
            textDecoration: 'none',
          }}
        >
          <MessageSquare size={18} />
        </Link>

        {/* Broadcast */}
        <Link
          href="/dashboard/inbox/broadcast"
          title="Broadcast"
          className="hover:bg-slate-100 transition-colors"
          style={{
            width: 36, height: 36, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isBroadcast ? '#3b82f6' : '#64748b',
            background: isBroadcast ? 'rgba(59,130,246,0.1)' : 'transparent',
            textDecoration: 'none',
          }}
        >
          <Radio size={18} />
        </Link>

        {/* Settings */}
        <Link
          href="/dashboard/inbox/settings"
          title="Configuración"
          className="hover:bg-slate-100 transition-colors"
          style={{
            width: 36, height: 36, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isSettings ? '#64748b' : '#94a3b8',
            background: isSettings ? 'rgba(100,116,139,0.1)' : 'transparent',
            textDecoration: 'none',
          }}
        >
          <Settings size={18} />
        </Link>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* User avatar */}
        <div
          title={userName}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #94a3b8, #cbd5e1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 12,
          }}
        >
          {userName[0]?.toUpperCase() || '?'}
        </div>
      </div>

      {/* Main content area — fullscreen */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}

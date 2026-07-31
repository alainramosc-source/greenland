'use client';
import { useState, useEffect } from 'react';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import DashboardTopBar from '@/components/layout/DashboardTopBar';
import { createClient } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [subRole, setSubRole] = useState(null);
  const [actualRole, setActualRole] = useState(null);
  const [userName, setUserName] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const supabase = createClient();

  // Detect if we're on a fullscreen route → no sidebar, no topbar
  const isFullscreenRoute = pathname?.startsWith('/dashboard/inbox') || pathname?.startsWith('/dashboard/cobertura');

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, sub_role, full_name, is_active, client_number')
          .eq('id', user.id)
          .single();

        if (profile) {
          if (profile.is_active === false) {
            router.push('/pending-approval');
            return;
          }

          if (profile.role === 'distributor' && !profile.client_number) {
            supabase.rpc('assign_client_number_to_user', { p_user_id: user.id }).catch(() => { });
          }

          setActualRole(profile.role);
          setSubRole(profile.sub_role);
          const testRole = typeof window !== 'undefined' ? sessionStorage.getItem('test_view_role') : null;
          if (profile.sub_role === 'super_admin' && testRole === 'distributor') {
            setUserRole('distributor');
          } else {
            // Not a super_admin or no impersonation active — clear any stale data
            if (testRole) {
              sessionStorage.removeItem('test_view_role');
              sessionStorage.removeItem('test_view_distributor_id');
              sessionStorage.removeItem('test_distributor_name');
            }
            setUserRole(profile.role);
          }
          setUserName(profile.full_name || user.email.split('@')[0]);
        }
      }
      setLoading(false);
    }
    getUser();
  }, []);

  if (loading) {
    return <div className="loading-screen">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-[#6a9a04] rounded-full animate-spin"></div>
    </div>;
  }

  // Inbox route → render fullscreen (no sidebar, no topbar)
  if (isFullscreenRoute) {
    return (
      <div className="text-slate-900 font-sans" style={{
        background: '#f8f6f6',
        backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')",
        backgroundAttachment: 'fixed',
      }}>
        {children}
        <style jsx>{`
          .loading-screen {
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8f6f6;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard-layout text-slate-900 font-sans min-h-screen">
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={userRole}
        actualRole={actualRole}
        subRole={subRole}
      />
      <div className="dashboard-content-wrapper flex flex-col min-h-screen overflow-hidden relative">
        <DashboardTopBar
          onMenuClick={() => setSidebarOpen(true)}
          userRole={userRole}
          userName={userName}
        />
        <main className="dashboard-main flex-1 p-4 md:p-8 overflow-y-auto relative z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-[#dee24b]/10 blur-[120px] rounded-full -z-10 pointer-events-none"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-[30rem] h-[30rem] bg-[#6a9a04]/10 blur-[100px] rounded-full -z-10 pointer-events-none"></div>

          <div className="relative z-10 max-w-7xl mx-auto">
            {children}
          </div>

          <div className="relative z-0 max-w-7xl mx-auto mt-12 pt-4 border-t border-slate-200/50 flex flex-wrap justify-center gap-3 text-xs text-slate-400 pb-4">
            <span>© {new Date().getFullYear()} GreenLand Products</span>
            <span>·</span>
            <a href="/aviso-de-privacidad" target="_blank" className="hover:text-[#6a9a04] transition-colors no-underline text-slate-400">Aviso de Privacidad</a>
            <span>·</span>
            <a href="/terminos-de-uso" target="_blank" className="hover:text-[#6a9a04] transition-colors no-underline text-slate-400">Términos de Uso</a>
          </div>
        </main>
      </div>

      <style jsx>{`
        .dashboard-layout {
          display: flex;
          min-height: 100vh;
          background-color: #f8f6f6;
          background-image: url('https://www.transparenttextures.com/patterns/cubes.png');
          background-attachment: fixed;
          position: relative;
        }

        .dashboard-content-wrapper {
          flex: 1;
          margin-left: 18rem;
          min-width: 0; 
          transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .loading-screen {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f6f6;
        }

        @media (max-width: 768px) {
          .dashboard-content-wrapper {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
}

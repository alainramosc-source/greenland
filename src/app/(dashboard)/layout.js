'use client';
import { useState, useEffect } from 'react';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import DashboardTopBar from '@/components/layout/DashboardTopBar';
import AdminTestingPanel from '@/components/AdminTestingPanel';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [actualRole, setActualRole] = useState(null);
  const [userName, setUserName] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch role from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name, is_active')
          .eq('id', user.id)
          .single();

        if (profile) {
          if (profile.is_active === false) {
            router.push('/pending-approval');
            return; // Stop rendering dashboard
          }

          setActualRole(profile.role);
          // Check for admin role simulation
          const testRole = typeof window !== 'undefined' ? sessionStorage.getItem('test_view_role') : null;
          if (profile.role === 'admin' && testRole === 'distributor') {
            setUserRole('distributor');
          } else {
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

  return (
    <div className="dashboard-layout text-slate-900 font-sans min-h-screen">
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={userRole}
      />
      <div className="dashboard-content-wrapper flex flex-col min-h-screen overflow-hidden relative">
        <DashboardTopBar
          onMenuClick={() => setSidebarOpen(true)}
          userRole={userRole}
          userName={userName}
        />
        <main className="dashboard-main flex-1 p-4 md:p-8 overflow-y-auto relative z-0">
          {/* Background Accent Blurs */}
          <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-[#dee24b]/10 blur-[120px] rounded-full -z-10 pointer-events-none"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-[30rem] h-[30rem] bg-[#6a9a04]/10 blur-[100px] rounded-full -z-10 pointer-events-none"></div>

          <div className="relative z-10 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Admin Testing Panel - only renders for admins */}
      <AdminTestingPanel />

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
          margin-left: 18rem; /* 72 spacing = 288px = 18rem for md+ */
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

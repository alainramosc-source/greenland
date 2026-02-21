'use client';
import { useState, useEffect } from 'react';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import DashboardTopBar from '@/components/layout/DashboardTopBar';
import { createClient } from '@/utils/supabase/client';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch role from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserRole(profile.role);
          setUserName(profile.full_name || user.email.split('@')[0]);
        }
      }
      setLoading(false);
    }
    getUser();
  }, []);

  if (loading) {
    return <div className="loading-screen">Cargando...</div>;
  }

  return (
    <div className="dashboard-layout bg-slate-50 text-slate-900 font-sans">
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={userRole}
      />
      <div className="dashboard-content-wrapper flex flex-col min-h-screen">
        <DashboardTopBar
          onMenuClick={() => setSidebarOpen(true)}
          userRole={userRole}
          userName={userName}
        />
        <main className="dashboard-main flex-1 p-4 md:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      <style jsx>{`
        .dashboard-layout {
          display: flex;
          min-height: 100vh;
          background-color: #f8f6f6;
          background-image: 
            radial-gradient(circle at 0% 0%, rgba(106, 154, 4, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(222, 226, 75, 0.05) 0%, transparent 50%);
          background-attachment: fixed;
          position: relative;
        }

        .dashboard-content-wrapper {
          flex: 1;
          margin-left: 16rem; /* 64 spacing = 256px = 16rem for md+ */
          min-width: 0; 
          transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .loading-screen {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6a9a04;
          background: #f8f6f6;
          font-weight: bold;
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

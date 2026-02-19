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
    <div className="dashboard-layout">
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={userRole}
      />
      <div className="dashboard-content-wrapper">
        <DashboardTopBar
          onMenuClick={() => setSidebarOpen(true)}
          userRole={userRole}
          userName={userName}
        />
        <main className="dashboard-main">
          {children}
        </main>
      </div>

      <style jsx>{`
        .dashboard-layout {
          display: flex;
          min-height: 100vh;
          background-color: var(--color-bg-main);
        }

        .dashboard-content-wrapper {
          flex: 1;
          margin-left: var(--layout-sidebar-width);
          min-width: 0; /* Prevent flex overflow */
          transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .dashboard-main {
          padding: 2rem;
          min-height: calc(100vh - 64px);
        }

        .loading-screen {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-main);
          background: var(--color-bg-main);
        }

        @media (max-width: 768px) {
          .dashboard-content-wrapper {
            margin-left: 0;
          }
          .dashboard-main {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

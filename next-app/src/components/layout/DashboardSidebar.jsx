'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Package, FileText, Users, LogOut, BarChart3 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

const DashboardSidebar = ({ isOpen, onClose, userRole }) => {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: 'Tablero', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Pedidos', href: '/dashboard/pedidos', icon: ShoppingCart },
    { name: 'Inventarios', href: '/dashboard/inventarios', icon: Package },
  ];

  if (userRole === 'admin') {
    navItems.push(
      { name: 'Estadísticas', href: '/dashboard/estadisticas', icon: BarChart3 },
      { name: 'CMS Landing', href: '/dashboard/cms', icon: FileText },
      { name: 'Usuarios', href: '/dashboard/usuarios', icon: Users }
    );
  }

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="logo-mark">G</span>
          <div className="logo-text">
            <span className="brand">GREENLAND</span>
            <span className="sub">DASHBOARD</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <span className="nav-label">MENU PRINCIPAL</span>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <item.icon size={18} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="nav-link logout-btn">
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
          <div className="user-info">
            <small>{userRole === 'admin' ? 'Administrador' : 'Distribuidor'}</small>
          </div>
        </div>
      </aside>

      {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}

      <style jsx>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: var(--layout-sidebar-width);
          height: 100vh;
          background: #FFFFFF;
          border-right: 1px solid var(--color-border, #E5E5E5);
          display: flex;
          flex-direction: column;
          z-index: 50;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sidebar-header {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-bottom: 1px solid var(--color-border-light, #F0F0F0);
        }

        .logo-mark {
          width: 36px;
          height: 36px;
          background: var(--color-primary, #064E3B);
          color: #FFFFFF;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.2rem;
        }

        .logo-text {
          display: flex;
          flex-direction: column;
        }

        .brand {
          font-weight: 800;
          font-size: 0.95rem;
          color: var(--color-text, #111);
          letter-spacing: 0.04em;
          line-height: 1;
        }

        .sub {
          font-size: 0.6rem;
          color: var(--color-text-muted, #999);
          letter-spacing: 0.15em;
          font-weight: 600;
        }

        .sidebar-nav {
          flex: 1;
          padding: 1.5rem 1rem;
          overflow-y: auto;
        }

        .nav-section {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .nav-label {
          font-size: 0.65rem;
          color: var(--color-text-muted, #999);
          padding-left: 0.75rem;
          margin-bottom: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.7rem 0.75rem;
          color: var(--color-text-secondary, #555);
          border-radius: 10px;
          transition: all 0.2s;
          font-weight: 500;
          font-size: 0.875rem;
          background: transparent;
          border: none;
          width: 100%;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
        }

        .nav-link:hover {
          background: var(--color-bg-soft, #F5F5F5);
          color: var(--color-text, #111);
        }

        .nav-link.active {
          background: rgba(6, 78, 59, 0.06);
          color: var(--color-primary, #064E3B);
          font-weight: 600;
        }

        .sidebar-footer {
          padding: 1.25rem;
          border-top: 1px solid var(--color-border-light, #F0F0F0);
        }

        .logout-btn {
          color: #DC2626;
        }
        .logout-btn:hover {
          background: #FEF2F2;
          color: #DC2626;
        }

        .user-info {
          margin-top: 0.75rem;
          text-align: center;
          color: var(--color-text-muted, #999);
          font-size: 0.75rem;
        }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
          }
          .sidebar.open {
            transform: translateX(0);
          }
          .sidebar-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(4px);
            z-index: 40;
          }
        }
      `}</style>
    </>
  );
};

export default DashboardSidebar;

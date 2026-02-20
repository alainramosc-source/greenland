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

  const adminItems = userRole === 'admin' ? [
    { name: 'Estadísticas', href: '/dashboard/estadisticas', icon: BarChart3 },
    { name: 'Usuarios', href: '/dashboard/usuarios', icon: Users },
    { name: 'CMS Landing', href: '/dashboard/cms', icon: FileText }
  ] : [];

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

          {adminItems.length > 0 && (
            <div className="nav-section admin-section">
              <span className="nav-label">ADMINISTRACIÓN</span>
              {adminItems.map((item) => {
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
          )}
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
          background: #000000;
          border-right: 1px solid #747474;
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
          border-bottom: 1px solid #747474;
        }

        .logo-mark {
          width: 36px;
          height: 36px;
          background: #6a9a04;
          color: #000000;
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
          color: #FFFFFF;
          letter-spacing: 0.04em;
          line-height: 1;
        }

        .sub {
          font-size: 0.6rem;
          color: #dee24b;
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

        .admin-section {
          margin-top: 1.5rem;
        }

        .nav-label {
          font-size: 0.65rem;
          color: #747474;
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
          color: #FFFFFF;
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
          background: rgba(116, 116, 116, 0.2);
          color: #dee24b;
        }

        .nav-link.active {
          background: rgba(106, 154, 4, 0.2);
          color: #dee24b;
          font-weight: 600;
        }

        .sidebar-footer {
          padding: 1.25rem;
          border-top: 1px solid #747474;
        }

        .logout-btn {
          color: #FFFFFF;
        }
        .logout-btn:hover {
          background: rgba(116, 116, 116, 0.2);
          color: #dee24b;
        }

        .user-info {
          margin-top: 0.75rem;
          text-align: center;
          color: #747474;
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
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 40;
          }
        }
      `}</style>
    </>
  );
};

export default DashboardSidebar;

'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Package, FileText, Users, LogOut, BarChart3, Grid, Shield } from 'lucide-react';
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
          <img src="/logo-new.jpg" alt="Greenland" className="sidebar-logo-img" />
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <span className="nav-label">
              <Grid size={15} style={{ opacity: 0.8 }} />
              MENÚ PRINCIPAL
            </span>
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
              <span className="nav-label">
                <Shield size={15} style={{ opacity: 0.8 }} />
                ADMINISTRACIÓN
              </span>
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
          background: rgba(20, 20, 20, 0.6); /* Glassmorphism Base from Stitch */
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          z-index: 50;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sidebar-header {
          padding: 2.5rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .sidebar-logo-img {
          width: 100%;
          max-height: 80px;
          object-fit: contain;
        }

        .sidebar-nav {
          flex: 1;
          padding: 2.5rem 1rem;
          overflow-y: auto;
        }

        .nav-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .admin-section {
          margin-top: 3rem;
        }

        .nav-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.85rem;
          color: #747474;
          padding-left: 1rem;
          margin-bottom: 1.25rem;
          font-weight: 700;
          letter-spacing: 0.1em;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1rem 1.25rem;
          color: #94a3b8; /* text-slate-400 */
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 500;
          font-size: 1.05rem;
          background: transparent;
          border: 1px solid transparent;
          width: 100%;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          position: relative;
          overflow: hidden;
        }

        .nav-link:hover {
          background: rgba(255, 255, 255, 0.05); /* hover:bg-white/5 */
          color: #FFFFFF;
        }

        .nav-link:hover :global(svg) {
          color: #dee24b; /* hover:text-primary */
        }

        .nav-link.active {
          background: rgba(222, 226, 75, 0.1); /* bg-primary/10 */
          border-color: rgba(222, 226, 75, 0.2); /* border-primary/20 */
          color: #dee24b; /* text-primary */
          font-weight: 700;
          box-shadow: 0 0 10px rgba(222, 226, 75, 0.3); /* neon-glow */
        }

        .nav-link.active::before {
          content: "";
          position: absolute;
          inset: 0;
          background: rgba(222, 226, 75, 0.05);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }
        
        .nav-link.active:hover::before {
          transform: translateX(0);
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08); /* border-glass-border */
        }

        .logout-btn {
          color: #e2e8f0;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .logout-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #FFFFFF;
        }

        .user-info {
          margin-top: 1rem;
          text-align: center;
          color: #747474;
          font-size: 0.8rem;
          font-weight: 500;
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

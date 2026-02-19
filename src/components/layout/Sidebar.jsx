'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, Users, Info, Mail, LogOut, Linkedin, Instagram, Facebook } from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Inicio', href: '/', icon: Home },
    { name: 'Productos', href: '/productos', icon: Package },
    { name: 'Distribuidores', href: '/distribuidores', icon: Users },
    { name: 'Nosotros', href: '/nosotros', icon: Info },
    { name: 'Contacto', href: '/contacto', icon: Mail },
  ];

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src="/logo-new.jpg" alt="Greenland Products" className="sidebar-logo" />
          <div className="logo-text">
            <span className="brand">GREENLAND</span>
            <span className="sub">PRODUCTS</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <item.icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="social-links">
            <a href="#" className="social-btn"><Facebook size={18} /></a>
            <a href="#" className="social-btn"><Instagram size={18} /></a>
            <a href="#" className="social-btn"><Linkedin size={18} /></a>
          </div>
          <p className="copyright">© 2025 Greenland</p>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}

      <style jsx>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: var(--layout-sidebar-width);
          height: 100vh;
          background: var(--color-sidebar-bg);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          z-index: 50;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sidebar-header {
          padding: 2rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .sidebar-logo {
          width: 40px;
          height: auto;
        }

        .logo-text {
          display: flex;
          flex-direction: column;
        }

        .brand {
          font-weight: 700;
          font-size: 1.1rem;
          color: white;
          line-height: 1;
        }

        .sub {
          font-size: 0.7rem;
          color: #4ADE80;
          letter-spacing: 0.15em;
          font-family: var(--font-mono);
        }

        .sidebar-nav {
          flex: 1;
          padding: 2rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem 1rem;
          color: rgba(255, 255, 255, 0.6);
          border-radius: 8px;
          transition: all 0.2s ease;
          font-weight: 500;
          font-size: 0.9rem;
        }

        .nav-link:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .nav-link.active {
          background: rgba(74, 222, 128, 0.15);
          color: #4ADE80;
          border-left: 3px solid #4ADE80;
        }

        .sidebar-footer {
          padding: 2rem 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .social-links {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .social-btn {
          color: rgba(255,255,255,0.5);
          transition: all 0.2s ease;
        }

        .social-btn:hover {
          color: #4ADE80;
        }

        .copyright {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.3);
          margin: 0;
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

export default Sidebar;

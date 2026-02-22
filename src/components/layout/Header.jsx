'use client';
import { useState } from 'react';
import { Menu, X, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: 'INICIO', href: '/' },
    {
      name: 'SOLUCIONES GREENLAND',
      isDropdown: true,
      items: [
        { name: 'Mobiliario Funcional', href: '/productos' },
        { name: 'Greenland Spaces', href: '/spaces' },
        { name: 'Greenland Deco', href: '/deco' },
      ]
    },
    { name: 'DISTRIBUIDORES', href: '/distribuidores' },
    { name: 'NOSOTROS', href: '/nosotros' },
  ];

  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Logo */}
        <Link href="/" className="header-logo">
          <img src="/logo-new.jpg" alt="Greenland Products" className="logo-image" />
        </Link>

        {/* Desktop Nav */}
        <nav className="header-nav desktop-nav">
          {navLinks.map((link) => (
            link.isDropdown ? (
              <div key={link.name} className="nav-dropdown-wrapper">
                <span className={`nav-link cursor-pointer ${pathname.includes('/productos') || pathname.includes('/spaces') || pathname.includes('/deco') ? 'active' : ''}`}>
                  {link.name}
                </span>
                <div className="nav-dropdown-menu">
                  {link.items.map(subItem => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={`dropdown-link ${pathname === subItem.href ? 'active' : ''}`}
                    >
                      {subItem.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${pathname === link.href ? 'active' : ''}`}
              >
                {link.name}
              </Link>
            )
          ))}
        </nav>

        {/* Right side */}
        <div className="header-actions">
          <a href="tel:+528441595472" className="header-phone">
            +52 (844) 159 5472
          </a>
          <Link href="/login" className="btn btn-dark header-cta">
            ACCESO
          </Link>
          <button
            className="mobile-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {menuOpen && (
        <div className="mobile-nav">
          {navLinks.map((link) => (
            link.isDropdown ? (
              <div key={link.name} className="mobile-dropdown-wrapper">
                <div className="mobile-link text-slate-800 font-bold border-none pb-2">
                  {link.name}
                </div>
                <div className="mobile-dropdown-items pb-4 border-b border-slate-200">
                  {link.items.map(subItem => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={`mobile-sublink ${pathname === subItem.href ? 'active' : ''}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      {subItem.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`mobile-link ${pathname === link.href ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.name}
              </Link>
            )
          ))}
          <Link
            href="/login"
            className="mobile-link cta-link"
            onClick={() => setMenuOpen(false)}
          >
            ACCESO DISTRIBUIDORES
          </Link>
        </div>
      )}

      <style jsx>{`
        .site-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--color-border-light);
        }

        .header-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 2rem;
          height: 140px;  /* Increased to accommodate larger logo without crowding */
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* Logo */
        .header-logo {
            display: flex;
            align-items: center;
            text-decoration: none;
            transition: opacity 0.2s ease;
        }
        
        .header-logo:hover {
            opacity: 0.9;
        }

        .logo-image {
            height: 130px; /* Approx 1.8x size to be visually protaganistic and roughly double the CTA button */
            width: auto;
            object-fit: contain;
        }

        /* Nav */
        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 2.5rem;
        }

        .nav-link {
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--color-text-secondary);
          transition: color 0.2s ease;
          position: relative;
          padding: 0.25rem 0;
        }

        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0%;
          height: 2px;
          background: var(--color-primary);
          transition: width 0.3s ease;
        }

        .nav-link:hover {
          color: var(--color-text);
        }

        .nav-link:hover::after,
        .nav-link.active::after {
          width: 100%;
        }

        .nav-link.active {
          color: var(--color-primary);
        }

        /* Dropdown Styles */
        .nav-dropdown-wrapper {
          position: relative;
          display: inline-block;
          padding: 1rem 0;
        }

        .nav-dropdown-menu {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(10px);
          background: #FFFFFF;
          min-width: 240px;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1);
          border-radius: var(--radius-lg);
          padding: 0.5rem;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid var(--color-border-light);
        }

        .nav-dropdown-wrapper:hover .nav-dropdown-menu {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(0);
        }

        .dropdown-link {
          display: block;
          padding: 0.75rem 1rem;
          color: var(--color-text-secondary);
          font-size: 0.85rem;
          font-weight: 600;
          border-radius: var(--radius-md);
          transition: all 0.2s ease;
          letter-spacing: 0.03em;
        }

        .dropdown-link:hover, .dropdown-link.active {
          background: var(--color-bg-alt);
          color: var(--color-primary);
        }

        /* Actions */
        .header-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .header-phone {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          transition: color 0.2s;
        }

        .header-phone:hover {
          color: var(--color-primary);
        }

        .header-cta {
          padding: 0.6rem 1.5rem;
          font-size: 0.75rem;
          letter-spacing: 0.1em;
        }

        .mobile-toggle {
          display: none;
          color: var(--color-text);
          padding: 0.25rem;
        }

        /* Mobile */
        .mobile-nav {
          display: none;
          flex-direction: column;
          padding: 1rem 2rem 2rem;
          border-top: 1px solid var(--color-border-light);
          background: #FFFFFF;
        }

        .mobile-link {
          padding: 1rem 0;
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--color-text-secondary);
          border-bottom: 1px solid var(--color-border-light);
          transition: color 0.2s;
        }

        .mobile-link:hover,
        .mobile-link.active {
          color: var(--color-primary);
        }

        .mobile-link.cta-link {
          color: var(--color-primary);
          border-bottom: none;
          margin-top: 0.5rem;
        }

        .mobile-dropdown-wrapper {
          padding-top: 1rem;
        }

        .mobile-sublink {
          display: block;
          padding: 0.75rem 0 0.75rem 1rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          transition: color 0.2s;
        }

        .mobile-sublink:hover, .mobile-sublink.active {
          color: var(--color-primary);
        }

        @media (max-width: 768px) {
          .header-inner {
            padding: 0 1.25rem;
            height: 80px;
          }
          .logo-image {
            height: 60px;
          }
          .desktop-nav {
            display: none;
          }
          .header-phone {
            display: none;
          }
          .header-cta {
            display: none;
          }
          .mobile-toggle {
            display: block;
          }
          .mobile-nav {
            display: flex;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;

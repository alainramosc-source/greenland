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
    { name: 'CATÁLOGO', href: '/productos' },
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
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${pathname === link.href ? 'active' : ''}`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="header-actions">
          <a href="tel:+525512345678" className="header-phone">
            +52 (55) 1234 5678
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
            <Link
              key={link.href}
              href={link.href}
              className={`mobile-link ${pathname === link.href ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.name}
            </Link>
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
          height: 100px;
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
            height: 72px; /* Large, clear branding height */
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

        @media (max-width: 768px) {
          .header-inner {
            padding: 0 1.25rem;
            height: 64px;
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

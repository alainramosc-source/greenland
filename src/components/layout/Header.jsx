import { useState, useEffect } from 'react';
import { Menu, X, Phone } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const navItems = [
    { label: 'Productos', path: '/productos' },
    { label: 'Distribuidores', path: '/distribuidores' },
    { label: 'Nosotros', path: '/nosotros' },
  ];

  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <div className="container header-container">
        <div className="logo-container">
          <Link to="/" className="logo-link">
            <span className="brand-text">GREENLAND</span>
            <span className="brand-sub">PRODUCTS</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={location.pathname === item.path ? 'active' : ''}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="header-actions">
          <Link to="/contacto" className="btn btn-primary contact-btn">
            Contactar
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button className="mobile-menu-btn" onClick={toggleMenu} aria-label="Toggle menu">
          {isMenuOpen ? <X size={24} color="white" /> : <Menu size={24} color="white" />}
        </button>

        {/* Mobile Navigation */}
        <div className={`mobile-nav-overlay ${isMenuOpen ? 'open' : ''}`}>
          <nav className="mobile-nav">
            <ul>
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link to={item.path} onClick={() => setIsMenuOpen(false)}>
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/contacto" className="mobile-cta" onClick={() => setIsMenuOpen(false)}>
                  Contactar
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <style>{`
                .header {
                    background-color: var(--color-primary);
                    position: sticky;
                    top: 0;
                    z-index: 1000;
                    padding: 1.25rem 0;
                    transition: all 0.3s ease;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }

                .header.scrolled {
                    padding: 0.75rem 0;
                    background-color: rgba(15, 23, 42, 0.95);
                    backdrop-filter: blur(10px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                
                .header-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .logo-link {
                    display: flex;
                    flex-direction: column;
                    line-height: 1;
                }

                .brand-text {
                    font-family: var(--font-primary);
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: var(--color-white);
                    letter-spacing: -0.02em;
                }

                .brand-sub {
                    font-size: 0.75rem;
                    color: var(--color-secondary);
                    font-family: var(--font-mono);
                    letter-spacing: 0.2em;
                    text-transform: uppercase;
                }

                .desktop-nav ul {
                    display: flex;
                    gap: 2.5rem;
                }

                .desktop-nav a {
                    font-weight: 500;
                    color: var(--color-text-light);
                    font-size: 0.95rem;
                    opacity: 0.8;
                    transition: all 0.2s;
                    position: relative;
                }

                .desktop-nav a:hover, .desktop-nav a.active {
                    opacity: 1;
                    color: var(--color-white);
                }

                .desktop-nav a::after {
                    content: '';
                    position: absolute;
                    width: 0;
                    height: 2px;
                    bottom: -4px;
                    left: 0;
                    background-color: var(--color-secondary);
                    transition: width 0.3s ease;
                }

                .desktop-nav a:hover::after, .desktop-nav a.active::after {
                    width: 100%;
                }

                .contact-btn {
                    padding: 0.5rem 1.25rem;
                    font-size: 0.9rem;
                }

                .mobile-menu-btn {
                    display: none;
                }

                .mobile-nav-overlay {
                    display: none;
                }

                @media (max-width: 900px) {
                    .desktop-nav, .header-actions {
                        display: none;
                    }

                    .mobile-menu-btn {
                        display: block;
                        z-index: 1001;
                    }

                    .mobile-nav-overlay {
                        display: block;
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100vh;
                        background-color: var(--color-primary);
                        transform: translateX(100%);
                        transition: transform 0.3s ease-in-out;
                        padding-top: 5rem;
                        z-index: 1000;
                    }

                    .mobile-nav-overlay.open {
                        transform: translateX(0);
                    }

                    .mobile-nav ul {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 2rem;
                    }

                    .mobile-nav a {
                        color: var(--color-white);
                        font-size: 1.5rem;
                        font-weight: 600;
                    }

                    .mobile-cta {
                        color: var(--color-primary) !important;
                        background-color: var(--color-secondary);
                        padding: 0.75rem 2rem;
                        border-radius: var(--radius-md);
                        margin-top: 1rem;
                        display: inline-block;
                    }
                }
            `}</style>
    </header>
  );
};

export default Header;

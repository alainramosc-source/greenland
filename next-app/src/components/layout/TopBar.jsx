'use client';
import { Menu, User } from 'lucide-react';
import Link from 'next/link';

const TopBar = ({ onMenuClick }) => {
  return (
    <header className="top-bar">
      <div className="bar-left">
        <button className="menu-btn" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <div className="breadcrumb">
          <span>Bienvenido a Greenland Products</span>
        </div>
      </div>

      <div className="bar-right">
        <a href="tel:+525555555555" className="contact-link hidden-mobile">
          Llámanos: (55) 5555-5555
        </a>
        <Link href="/login" className="btn btn-primary btn-sm">
          <User size={16} style={{ marginRight: '8px' }} />
          ACCESO
        </Link>
      </div>

      <style jsx>{`
        .top-bar {
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(6, 78, 59, 0.08);
          position: sticky;
          top: 0;
          z-index: 40;
        }

        .bar-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .menu-btn {
          display: none;
          color: #064E3B;
          padding: 0.5rem;
        }

        .breadcrumb {
          font-size: 0.85rem;
          color: #6B7280;
          font-weight: 500;
          letter-spacing: 0.01em;
        }

        .bar-right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .contact-link {
          font-size: 0.85rem;
          color: #6B7280;
          font-weight: 500;
        }

        .contact-link:hover {
          color: #064E3B;
        }

        .btn-sm {
          padding: 0.5rem 1.25rem;
          font-size: 0.8rem;
          border-radius: 8px;
          font-weight: 600;
          letter-spacing: 0.04em;
        }

        @media (max-width: 768px) {
          .top-bar {
            padding: 0 1rem;
          }
          .menu-btn {
            display: block;
          }
          .hidden-mobile {
            display: none;
          }
          .layout-sidebar-width {
             width: 100%;
          }
        }
      `}</style>
    </header>
  );
};

export default TopBar;

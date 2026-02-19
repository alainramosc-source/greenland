'use client';
import { Menu, Bell } from 'lucide-react';

const DashboardTopBar = ({ onMenuClick, userRole, userName }) => {
  return (
    <header className="top-bar">
      <div className="bar-left">
        <button className="menu-btn" onClick={onMenuClick}>
          <Menu size={22} />
        </button>
        <div className="breadcrumb">
          <span>{userRole === 'admin' ? 'Administrador' : 'Distribuidor'}</span>
        </div>
      </div>

      <div className="bar-right">
        <button className="icon-btn">
          <Bell size={18} />
          <span className="badge">3</span>
        </button>

        <div className="user-profile">
          <div className="avatar">
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="user-name">{userName || 'Usuario'}</span>
        </div>
      </div>

      <style jsx>{`
        .top-bar {
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.5rem;
          background: #FFFFFF;
          border-bottom: 1px solid var(--color-border, #E5E5E5);
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
          color: var(--color-text, #111);
          padding: 0.375rem;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .menu-btn:hover {
          background: var(--color-bg-soft, #F5F5F5);
        }

        .breadcrumb {
          font-size: 0.85rem;
          color: var(--color-text-muted, #999);
          font-weight: 500;
        }

        .bar-right {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .icon-btn {
          position: relative;
          color: var(--color-text-secondary, #555);
          padding: 0.375rem;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .icon-btn:hover {
          background: var(--color-bg-soft, #F5F5F5);
          color: var(--color-text, #111);
        }

        .badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: #DC2626;
          color: #FFFFFF;
          font-size: 0.6rem;
          font-weight: 700;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.25rem 0.75rem 0.25rem 0.25rem;
          border-radius: 100px;
          background: var(--color-bg-soft, #F5F5F5);
          border: 1px solid var(--color-border-light, #F0F0F0);
        }

        .avatar {
          width: 32px;
          height: 32px;
          background: var(--color-primary, #064E3B);
          color: #FFFFFF;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
        }

        .user-name {
          font-size: 0.85rem;
          color: var(--color-text, #111);
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .menu-btn {
            display: block;
          }
          .user-name {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};

export default DashboardTopBar;

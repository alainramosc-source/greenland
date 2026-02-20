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
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
          color: #FFFFFF;
          padding: 0.375rem;
          border-radius: 8px;
          transition: background 0.2s;
          border: none;
          background: transparent;
        }
        .menu-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #dee24b;
        }

        .breadcrumb {
          font-size: 0.85rem;
          color: #747474;
          font-weight: 500;
        }

        .bar-right {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .icon-btn {
          position: relative;
          color: #e2e8f0;
          padding: 0.5rem;
          border-radius: 8px;
          transition: all 0.2s;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.03);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #dee24b;
        }

        .badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: #dee24b;
          color: transparent;
          font-size: 0;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(221, 226, 75, 0.5); /* Neon glow */
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-left: 1rem;
          border-left: 1px solid rgba(255, 255, 255, 0.08); /* Divider */
        }

        .avatar {
          width: 38px;
          height: 38px;
          background: #6a9a04;
          color: #000000;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
        }

        .user-name {
          font-size: 0.9rem;
          color: #FFFFFF;
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

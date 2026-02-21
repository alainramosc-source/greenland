'use client';
import { Menu, Bell } from 'lucide-react';

const DashboardTopBar = ({ onMenuClick, userRole, userName }) => {
  return (
    <header className="h-20 glass-panel border-b border-slate-200 flex items-center justify-between px-8 z-10 sticky top-0 md:bg-white/80 md:backdrop-blur-md">
      <div className="flex-1 flex items-center">
        <button
          className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg mr-4"
          onClick={onMenuClick}
        >
          <Menu size={24} />
        </button>
        <div className="hidden md:block text-slate-500 font-medium text-sm">
          {userRole === 'admin' ? 'Administrador' : 'Distribuidor'}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        </button>

        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-800 leading-none">{userName || 'Usuario'}</p>
            <p className="text-[10px] text-slate-500 font-medium">
              {userRole === 'admin' ? 'Administrador' : 'Distribuidor'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-green-500 p-0.5 bg-white">
            <div className="w-full h-full rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardTopBar;

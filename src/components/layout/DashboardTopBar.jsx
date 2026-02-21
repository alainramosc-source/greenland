'use client';
import { Menu, Bell } from 'lucide-react';

const DashboardTopBar = ({ onMenuClick, userRole, userName }) => {
  return (
    <header className="h-20 flex items-center justify-between px-8 z-10 sticky top-0" style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.5)' }}>
      <div className="flex-1 flex items-center">
        <button
          className="md:hidden p-2 text-slate-500 hover:bg-white/50 rounded-lg mr-4 transition-colors"
          onClick={onMenuClick}
        >
          <Menu size={24} />
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <button className="relative p-2.5 rounded-xl hover:bg-white/50 text-slate-500 transition-colors border-none bg-transparent cursor-pointer">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#ec5b13] rounded-full ring-4 ring-white"></span>
        </button>

        <div className="h-8 w-[1px] bg-slate-200/50 mx-2"></div>

        <div className="flex items-center gap-3 cursor-pointer p-1.5 pr-4 rounded-full border border-slate-200/50 hover:bg-white/50 transition-colors bg-white/20 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-full border border-[#6a9a04]/20 p-0.5 bg-white/50 flex items-center justify-center overflow-hidden">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#6a9a04]/20 to-[#dee24b]/20 flex items-center justify-center text-[#6a9a04] font-bold text-sm">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-800 leading-none">{userName || 'Usuario'}</p>
            <p className="text-[10px] uppercase tracking-widest text-[#ec5b13] font-black mt-1">
              {userRole === 'admin' ? 'Administrador' : 'Distribuidor'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardTopBar;

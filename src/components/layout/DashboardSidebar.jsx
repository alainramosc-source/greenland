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
    { name: 'Productos', href: '/dashboard/inventarios', icon: Package },
  ];

  const adminItems = userRole === 'admin' ? [
    { name: 'Estadísticas', href: '/dashboard/estadisticas', icon: BarChart3 },
    { name: 'Clientes', href: '/dashboard/usuarios', icon: Users },
    { name: 'CMS Landing', href: '/dashboard/cms', icon: FileText }
  ] : [];

  return (
    <>
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white/40 backdrop-blur-xl border-r border-[#6a9a04]/10 flex flex-col z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`} style={{ background: 'rgba(106, 154, 4, 0.05)' }}>
        <div className="p-6">
          <div className="flex items-center justify-center mb-10">
            <img src="/logo-pedidos.svg" alt="Greenland" className="h-20 w-auto object-contain filter drop-shadow-sm" />
          </div>

          <nav className="space-y-2 overflow-y-auto">
            <div className="mb-2 px-4 flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Menú Principal</span>
            </div>

            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-gradient-to-r from-[#6a9a04]/20 to-[#dee24b]/10 border-l-4 border-[#6a9a04] text-[#6a9a04] font-bold' : 'text-slate-600 hover:bg-[#6a9a04]/10 hover:text-[#6a9a04] font-medium'}`}
                >
                  <item.icon size={20} className={isActive ? 'text-[#6a9a04]' : 'text-slate-500'} />
                  <span className="text-sm">{item.name}</span>
                </Link>
              );
            })}

            {adminItems.length > 0 && (
              <div className="mt-8 mb-2 px-4 flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Administración</span>
              </div>
            )}
            {adminItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-[#ec5b13] text-white shadow-lg shadow-[#ec5b13]/20 font-bold' : 'text-slate-600 hover:bg-[#ec5b13]/10 hover:text-[#ec5b13] font-medium'}`}
                >
                  <item.icon size={20} className={isActive ? 'text-white' : 'text-slate-500'} />
                  <span className="text-sm">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-[#6a9a04]/10">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all">
            <LogOut size={20} />
            <span className="font-bold text-sm">Cerrar Sesión</span>
          </button>
          <div className="text-center mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {userRole === 'admin' ? 'Administrador' : 'Distribuidor'}
            </p>
          </div>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        ></div>
      )}
    </>
  );
};

export default DashboardSidebar;

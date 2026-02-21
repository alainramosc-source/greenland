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
    { name: 'Inventarios', href: '/dashboard/inventarios', icon: Package },
  ];

  const adminItems = userRole === 'admin' ? [
    { name: 'Estadísticas', href: '/dashboard/estadisticas', icon: BarChart3 },
    { name: 'Usuarios', href: '/dashboard/usuarios', icon: Users },
    { name: 'CMS Landing', href: '/dashboard/cms', icon: FileText }
  ] : [];

  return (
    <>
      <aside className={`fixed inset-y-0 left-0 w-64 glass-panel border-r border-slate-200 flex flex-col z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-center border-b border-slate-200/50">
          <img src="/logo-new.jpg" alt="Greenland" className="w-full max-h-[80px] object-contain" />
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <div className="mb-4 pl-4 flex items-center gap-2">
            <Grid size={14} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Menú Principal</span>
          </div>

          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-green-700/10 border-r-4 border-green-700 text-green-700' : 'text-slate-600 hover:bg-slate-100 hover:text-green-700'}`}
              >
                <item.icon size={20} className={isActive ? 'text-green-700 font-bold' : ''} />
                <span className={isActive ? 'font-bold text-sm' : 'font-medium text-sm'}>{item.name}</span>
              </Link>
            );
          })}

          {adminItems.length > 0 && (
            <div className="mt-8 mb-4 pl-4 flex items-center gap-2">
              <Shield size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Administración</span>
            </div>
          )}
          {adminItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-orange-600/10 border-r-4 border-orange-600 text-orange-600' : 'text-slate-600 hover:bg-slate-100 hover:text-orange-600'}`}
              >
                <item.icon size={20} className={isActive ? 'text-orange-600 font-bold' : ''} />
                <span className={isActive ? 'font-bold text-sm' : 'font-medium text-sm'}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-bold text-sm">
            <LogOut size={18} />
            Cerrar Sesión
          </button>
          <div className="text-center mt-3">
            <p className="text-xs font-medium text-slate-500">
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

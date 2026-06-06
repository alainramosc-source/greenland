'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingCart, Package, FileText, Users, LogOut, BarChart3, Grid, Shield, ShieldCheck, MapPin, DollarSign, CreditCard, ScrollText, ClipboardCheck, Eye, EyeOff, ArrowLeft, MessageSquare, Truck, FileBox, FolderOpen, Globe, Factory, Box, Container, ShoppingBag, Tag, FileSpreadsheet } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

const DashboardSidebar = ({ isOpen, onClose, userRole, actualRole, subRole }) => {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Impersonation state
  const [distributors, setDistributors] = useState([]);
  const [selectedDistId, setSelectedDistId] = useState('');
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedName, setImpersonatedName] = useState('');

  const isSuperAdmin = actualRole === 'admin' && subRole === 'super_admin';
  const isDistributorPro = userRole === 'distributor' && subRole === 'distributor_pro';

  // Load distributors list and check current impersonation state
  useEffect(() => {
    if (!isSuperAdmin) return;

    const testRole = sessionStorage.getItem('test_view_role');
    const testDistId = sessionStorage.getItem('test_view_distributor_id');
    const testDistName = sessionStorage.getItem('test_distributor_name');
    if (testRole === 'distributor' && testDistId) {
      setIsImpersonating(true);
      setSelectedDistId(testDistId);
      setImpersonatedName(testDistName || 'Distribuidor');
    }

    // Fetch distributors
    const fetchDistributors = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, client_number')
        .eq('role', 'distributor')
        .eq('is_active', true)
        .order('full_name', { ascending: true });
      setDistributors(data || []);
    };
    fetchDistributors();
  }, [isSuperAdmin]);

  const handleStartImpersonation = () => {
    if (!selectedDistId) return;
    const dist = distributors.find(d => d.id === selectedDistId);
    const name = dist?.full_name || dist?.email || 'Distribuidor';
    sessionStorage.setItem('test_view_role', 'distributor');
    sessionStorage.setItem('test_view_distributor_id', selectedDistId);
    sessionStorage.setItem('test_distributor_name', name);
    window.location.href = '/dashboard';
  };

  const handleStopImpersonation = () => {
    sessionStorage.removeItem('test_view_role');
    sessionStorage.removeItem('test_view_distributor_id');
    sessionStorage.removeItem('test_distributor_name');
    window.location.href = '/dashboard';
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('test_view_role');
    sessionStorage.removeItem('test_view_distributor_id');
    sessionStorage.removeItem('test_distributor_name');
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Build navigation items based on role
  const baseDistributorItems = [
    { name: 'Tablero', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Mis Pedidos', href: '/dashboard/pedidos', icon: ShoppingCart },
    { name: 'Mis Pagos', href: '/dashboard/mis-pagos', icon: CreditCard },
    { name: 'Mi Inventario', href: '/dashboard/mi-inventario', icon: Package },
    { name: 'Mis Direcciones', href: '/dashboard/direcciones', icon: MapPin },
    { name: 'Mi Expediente', href: '/dashboard/onboarding', icon: ClipboardCheck },
  ];

  // Distributor PRO gets zone management items
  const proItems = isDistributorPro ? [
    { name: 'Pedidos de Zona', href: '/dashboard/pedidos-zona', icon: Globe },
    { name: 'Inventarios', href: '/dashboard/inventarios', icon: Package },
    { name: 'Cobertura', href: '/dashboard/cobertura', icon: ShieldCheck },
  ] : [];

  const navItems = userRole === 'admin'
    ? [
      { name: 'Tablero', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Inbox', href: '/dashboard/inbox', icon: MessageSquare },
      { name: 'Pedidos', href: '/dashboard/pedidos', icon: ShoppingCart },
    ]
    : userRole === 'supplier'
    ? [
      { name: 'Tablero', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Mis Órdenes', href: '/dashboard/mis-ordenes', icon: FileBox },
      { name: 'Mis Contratos', href: '/dashboard/mis-contratos', icon: FolderOpen },
    ]
    : [...baseDistributorItems, ...proItems];

  const allAdminItems = [
    { name: 'Inventarios', href: '/dashboard/inventarios', icon: Package, roles: ['super_admin', 'warehouse_admin'] },
    { name: 'Venta en Mostrador', href: '/dashboard/venta-mostrador', icon: ShoppingBag, roles: ['super_admin', 'warehouse_admin'] },
    { name: 'Etiquetas', href: '/dashboard/etiquetas', icon: Tag, roles: ['super_admin', 'warehouse_admin'] },
    { name: 'Cobertura', href: '/dashboard/cobertura', icon: ShieldCheck, roles: ['super_admin'] },
    { name: 'Compras', href: '/dashboard/cobertura/historial', icon: FileSpreadsheet, roles: ['super_admin'] },
    { name: 'Recepciones', href: '/dashboard/recepciones', icon: Container, roles: ['super_admin'] },
    { name: 'Precios', href: '/dashboard/precios', icon: DollarSign, roles: ['super_admin', 'accountant'] },
    { name: 'Pagos', href: '/dashboard/pagos', icon: CreditCard, roles: ['super_admin', 'accountant'] },
    { name: 'Estadísticas', href: '/dashboard/estadisticas', icon: BarChart3, roles: ['super_admin', 'accountant'] },
    { name: 'Clientes', href: '/dashboard/usuarios', icon: Users, roles: ['super_admin'] },
    { name: 'CMS Landing', href: '/dashboard/cms?v=sync', icon: FileText, roles: ['super_admin'] },
    { name: 'Expedientes', href: '/dashboard/expedientes', icon: ClipboardCheck, roles: ['super_admin'] },
    { name: 'Auditoría', href: '/dashboard/auditoria', icon: ScrollText, roles: ['super_admin'] },
    { name: 'Fabricantes', href: '/dashboard/fabricantes', icon: Factory, roles: ['super_admin'] },
    { name: 'Productos', href: '/dashboard/productos', icon: Box, roles: ['super_admin'] },
    { name: 'Proveedores', href: '/dashboard/proveedores', icon: Truck, roles: ['super_admin'] },
  ];

  const adminItems = userRole === 'admin'
    ? allAdminItems.filter(item => !subRole || item.roles.includes(subRole))
    : [];

  return (
    <>
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white/40 backdrop-blur-xl border-r border-[#6a9a04]/10 flex flex-col z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`} style={{ background: 'rgba(106, 154, 4, 0.05)' }}>

        {/* Impersonation Banner */}
        {isImpersonating && isSuperAdmin && (
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Eye size={14} className="shrink-0" />
              <span className="text-[11px] font-bold truncate">
                Vista: {impersonatedName}
              </span>
            </div>
            <button
              onClick={handleStopImpersonation}
              className="flex items-center gap-1 px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer border-none text-white shrink-0"
            >
              <ArrowLeft size={12} /> Admin
            </button>
          </div>
        )}

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex flex-col items-center justify-center mb-8">
            <img src="/logo-new.jpg" alt="GreenLand Products" className="h-16 w-auto object-contain mb-2" style={{ mixBlendMode: 'multiply' }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6a9a04]">
              {userRole === 'supplier' ? 'Portal de Proveedores' : 'Portal de Distribuidores'}
            </span>
          </div>

          <nav className="space-y-2">
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-slate-800 text-white shadow-lg shadow-slate-800/20 font-bold' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 font-medium'}`}
                >
                  <item.icon size={20} className={isActive ? 'text-white' : 'text-slate-500'} />
                  <span className="text-sm">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom section */}
        <div className="mt-auto border-t border-[#6a9a04]/10">
          {/* Impersonation Panel — Super Admin Only */}
          {isSuperAdmin && !isImpersonating && (
            <div className="px-4 py-3 border-b border-slate-200/50">
              <div className="flex items-center gap-1.5 mb-2">
                <Eye size={12} className="text-orange-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Ver como Distribuidor</span>
              </div>
              <select
                value={selectedDistId}
                onChange={(e) => setSelectedDistId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-orange-300 mb-2"
              >
                <option value="">Seleccionar distribuidor...</option>
                {distributors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.client_number ? `${d.client_number} — ` : ''}{d.full_name || d.email}
                  </option>
                ))}
              </select>
              <button
                onClick={handleStartImpersonation}
                disabled={!selectedDistId}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all border-none"
              >
                <Eye size={12} /> Activar Vista
              </button>
            </div>
          )}

          <div className="p-6">
            <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all">
              <LogOut size={20} />
              <span className="font-bold text-sm">Cerrar Sesión</span>
            </button>
            <div className="text-center mt-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {userRole === 'admin'
                  ? (subRole === 'super_admin' ? 'Super Admin'
                    : subRole === 'warehouse_admin' ? 'Admin Bodega'
                      : subRole === 'accountant' ? 'Contabilidad'
                        : subRole === 'viewer' ? 'Solo Lectura'
                          : 'Administrador')
                  : userRole === 'supplier' ? 'Proveedor'
                  : 'Distribuidor'}
              </p>
            </div>
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

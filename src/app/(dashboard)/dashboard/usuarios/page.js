'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { Search, Filter, Edit2, Shield, AlertCircle, X, Save, UserPlus, Trash2, Download, ArrowUpDown, ArrowUp, ArrowDown, Loader2, ShieldAlert, DollarSign, Users, CreditCard, TrendingUp, ExternalLink, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState('clientes');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, isBulk: false, targetId: null });
  // Collaborator creation
  const [showNewCollab, setShowNewCollab] = useState(false);
  const [newCollab, setNewCollab] = useState({ full_name: '', email: '', password: '', sub_role: 'viewer' });
  const [creatingCollab, setCreatingCollab] = useState(false);
  const [currentUserSubRole, setCurrentUserSubRole] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);
  // CxC state
  const [cxcData, setCxcData] = useState([]);
  const [cxcLoading, setCxcLoading] = useState(false);
  const [cxcSearch, setCxcSearch] = useState('');
  const [cxcSort, setCxcSort] = useState({ key: 'balance', dir: 'desc' });
  const [allWarehouses, setAllWarehouses] = useState([]);
  // Expandable addresses
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [addressCache, setAddressCache] = useState({}); // { userId: [addresses] }
  const [addressLoading, setAddressLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);

    // Admin guard
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: profile } = await supabase.from('profiles').select('role, sub_role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      setUnauthorized(true);
      setLoading(false);
      return;
    }
    setCurrentUserSubRole(profile?.sub_role);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setUsers(data);
    // Fetch warehouses for PRO assignment
    const { data: whData } = await supabase.from('warehouses').select('id, name').eq('is_active', true).order('name');
    setAllWarehouses(whData || []);
    setLoading(false);
    // Also fetch CxC data
    fetchCxC();

    // Prefetch all distributor addresses
    const fetchAllAddresses = async () => {
      const { data: addrData } = await supabase
        .from('distributor_addresses')
        .select('*')
        .order('is_default', { ascending: false });
      if (addrData) {
        const map = {};
        addrData.forEach(a => {
          if (!map[a.distributor_id]) map[a.distributor_id] = [];
          map[a.distributor_id].push(a);
        });
        setAddressCache(map);
      }
    };
    fetchAllAddresses();
  };

  if (unauthorized) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-slate-500">
        <Shield size={48} className="text-red-400" />
        <p className="font-bold text-lg">Acceso no autorizado</p>
      </div>
    );
  }

  const handleEditClick = (user) => {
    setSelectedUser({ ...user });
    setIsModalOpen(true);
  };

  const handleSaveUser = async () => {
    setUpdating(true);
    const updateData = {
      role: selectedUser.role,
      is_active: selectedUser.is_active,
      full_name: selectedUser.full_name,
      city: selectedUser.city,
      phone: selectedUser.phone,
      company_name: selectedUser.company_name,
      address: selectedUser.address,
      sub_role: selectedUser.role === 'admin' ? (selectedUser.sub_role || 'viewer')
             : selectedUser.role === 'distributor' ? (selectedUser.sub_role || null)
             : null,
    };
    // Only include parent_distributor_id and assigned_warehouse_id for distributors
    if (selectedUser.role === 'distributor') {
      updateData.parent_distributor_id = selectedUser.parent_distributor_id || null;
      updateData.assigned_warehouse_id = selectedUser.sub_role === 'distributor_pro' ? (selectedUser.assigned_warehouse_id || null) : null;
    } else {
      updateData.parent_distributor_id = null;
      updateData.assigned_warehouse_id = null;
    }
    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', selectedUser.id);

    if (error) {
      alert('Error updating user: ' + error.message);
    } else {
      setUsers(users.map(u => (u.id === selectedUser.id ? { ...selectedUser, ...updateData } : u)));
      setIsModalOpen(false);
    }
    setUpdating(false);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#6a9a04]" /> : <ArrowDown className="w-3 h-3 text-[#6a9a04]" />;
  };

  const handleSelectAll = (e, usersToSelect) => {
    if (e.target.checked) {
      setSelectedUsers(usersToSelect.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (id) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(userId => userId !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedUsers.length === 0) return;
    setDeleteModal({ isOpen: true, isBulk: true, targetId: null });
  };

  const handleDeleteSingle = (id) => {
    setDeleteModal({ isOpen: true, isBulk: false, targetId: id });
  };

  const executeDelete = async () => {
    setLoading(true);
    if (deleteModal.isBulk) {
      const { error } = await supabase.rpc('delete_users', { user_ids: selectedUsers });
      if (error) {
        alert('Error eliminando usuarios: ' + error.message);
      } else {
        setUsers(users.filter(u => !selectedUsers.includes(u.id)));
        setSelectedUsers([]);
      }
    } else {
      const { error } = await supabase.rpc('delete_user', { user_id: deleteModal.targetId });
      if (error) {
        alert('Error eliminando usuario: ' + error.message);
      } else {
        setUsers(users.filter(u => u.id !== deleteModal.targetId));
        setSelectedUsers(selectedUsers.filter(userId => userId !== deleteModal.targetId));
      }
    }
    setLoading(false);
    setDeleteModal({ isOpen: false, isBulk: false, targetId: null });
  };

  const userExportStr = (str) => str ? String(str).replace(/"/g, '""') : '';

  const exportToCSV = (usersToExport) => {
    const headers = ['ID', 'Nombre', 'Empresa', 'Email', 'Ciudad', 'Domicilio', 'Telefono', 'Rol', 'Status', 'Fecha Registro'];
    const csvContent = [
      headers.join(','),
      ...usersToExport.map(u => [
        u.id,
        `"${userExportStr(u.full_name)}"`,
        `"${userExportStr(u.company_name)}"`,
        `"${userExportStr(u.email)}"`,
        `"${userExportStr(u.city)}"`,
        `"${userExportStr(u.address)}"`,
        `"${userExportStr(u.phone)}"`,
        u.role,
        u.is_active ? 'Activo' : 'Inactivo',
        u.created_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_greenland_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Detailed distributor report
  const [exportingReport, setExportingReport] = useState(null);
  const exportDistributorReport = async (dist) => {
    setExportingReport(dist.id);
    try {
      console.log('[Report] Generating for distributor:', dist.id, dist.full_name);

      // Fetch ALL orders (same approach as CxC), then filter by distributor
      const { data: allOrders, error: ordErr } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, status, payment_status, created_at, distributor_id')
        .neq('status', 'cancelled')
        .neq('status', 'rejected');

      if (ordErr) console.error('[Report] Orders query error:', ordErr);
      
      const ordersData = (allOrders || []).filter(o => o.distributor_id === dist.id);
      console.log('[Report] Total orders found:', allOrders?.length, '| For this distributor:', ordersData.length);

      // Fetch order items separately
      const orderIds = ordersData.map(o => o.id);
      let allItems = [];
      if (orderIds.length > 0) {
        const { data: itemsData, error: itemErr } = await supabase
          .from('order_items')
          .select('order_id, quantity, unit_price, subtotal, product_id')
          .in('order_id', orderIds);
        if (itemErr) console.error('[Report] Items query error:', itemErr);
        allItems = itemsData || [];
        console.log('[Report] Items found:', allItems.length);

        // Fetch product details for these items
        if (allItems.length > 0) {
          const productIds = [...new Set(allItems.map(i => i.product_id).filter(Boolean))];
          const { data: productsData } = await supabase
            .from('products')
            .select('id, name, sku')
            .in('id', productIds);
          const prodMap = {};
          (productsData || []).forEach(p => { prodMap[p.id] = p; });
          allItems.forEach(item => {
            item.products = prodMap[item.product_id] || { name: '', sku: '' };
          });
          console.log('[Report] Products matched:', Object.keys(prodMap).length);
        }
      }

      // Build items lookup by order_id
      const itemsByOrder = {};
      allItems.forEach(item => {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
        itemsByOrder[item.order_id].push(item);
      });
      console.log('[Report] itemsByOrder keys:', Object.keys(itemsByOrder).length);

      // Fetch payments
      let paymentsData = [];
      if (orderIds.length > 0) {
        const { data: pData, error: payErr } = await supabase
          .from('order_payments')
          .select('order_id, amount, payment_date')
          .in('order_id', orderIds)
          .order('payment_date', { ascending: false });
        if (payErr) console.error('Payments query error:', payErr);
        paymentsData = pData || [];
      }

      // Fetch container receptions
      const { data: receptionsData, error: recErr } = await supabase
        .from('container_receptions')
        .select('id, container_label, operation_number, reception_date, charge_amount, status, warehouse:warehouses(name)')
        .eq('distributor_id', dist.id)
        .eq('status', 'completed')
        .order('reception_date', { ascending: false });

      if (recErr) console.error('Receptions query error:', recErr);

      const esc = (s) => s ? `"${String(s).replace(/"/g, '""')}"` : '';
      const lines = [];

      // Header
      lines.push(`REPORTE DETALLADO DE DISTRIBUIDOR`);
      lines.push(`Distribuidor:,${esc(dist.full_name)}`);
      lines.push(`Empresa:,${esc(dist.company_name || '')}`);
      lines.push(`Cliente:,#${dist.client_number || 'N/A'}`);
      lines.push(`Ciudad:,${esc(dist.city || '')}`);
      lines.push(`Generado:,${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}`);
      lines.push('');

      // Orders summary
      lines.push('═══ PEDIDOS ═══');
      lines.push('Pedido,Fecha,Status,Pago Status,Total,Pagado,Saldo');
      let totalOrders = 0;
      let totalPaidOrders = 0;
      (ordersData || []).forEach(o => {
        const paid = paymentsData.filter(p => p.order_id === o.id).reduce((s, p) => s + Number(p.amount), 0);
        const bal = Number(o.total_amount) - paid;
        totalOrders += Number(o.total_amount);
        totalPaidOrders += paid;
        lines.push(`${o.order_number || 'S/N'},${new Date(o.created_at).toLocaleDateString('es-MX')},${o.status},${o.payment_status || ''},${Number(o.total_amount).toFixed(2)},${paid.toFixed(2)},${bal.toFixed(2)}`);
      });
      lines.push(`,,,,${totalOrders.toFixed(2)},${totalPaidOrders.toFixed(2)},${(totalOrders - totalPaidOrders).toFixed(2)}`);
      lines.push('');

      // Order detail lines
      lines.push('═══ DETALLE DE PEDIDOS ═══');
      lines.push('Pedido,Fecha,SKU,Producto,Cantidad,Precio Unit,Subtotal');
      (ordersData || []).forEach(o => {
        const oItems = itemsByOrder[o.id] || [];
        oItems.forEach(item => {
          lines.push(`${o.order_number || 'S/N'},${new Date(o.created_at).toLocaleDateString('es-MX')},${item.products?.sku || ''},${esc(item.products?.name || '')},${item.quantity},${Number(item.unit_price).toFixed(2)},${Number(item.subtotal || item.quantity * item.unit_price).toFixed(2)}`);
        });
      });
      lines.push('');

      // Container charges
      if ((receptionsData || []).length > 0) {
        lines.push('═══ CARGOS DE CONTENEDORES ═══');
        lines.push('Operación,Contenedor,Bodega,Fecha,Cargo');
        let totalContainers = 0;
        receptionsData.forEach(r => {
          totalContainers += Number(r.charge_amount || 0);
          lines.push(`${r.operation_number || ''},${esc(r.container_label || '')},${esc(r.warehouse?.name || '')},${new Date(r.reception_date).toLocaleDateString('es-MX')},${Number(r.charge_amount || 0).toFixed(2)}`);
        });
        lines.push(`,,,,${totalContainers.toFixed(2)}`);
        lines.push('');
      }

      // Payments
      if (paymentsData.length > 0) {
        lines.push('═══ PAGOS REALIZADOS ═══');
        lines.push('Fecha,Pedido,Monto,Status');
        paymentsData.forEach(p => {
          const ord = (ordersData || []).find(o => o.id === p.order_id);
          lines.push(`${new Date(p.payment_date).toLocaleDateString('es-MX')},${ord?.order_number || 'General'},${Number(p.amount).toFixed(2)}`);
        });
        lines.push('');
      }

      // Summary
      const totalCont = (receptionsData || []).reduce((s, r) => s + Number(r.charge_amount || 0), 0);
      lines.push('═══ RESUMEN ═══');
      lines.push(`Total Pedidos:,${totalOrders.toFixed(2)}`);
      lines.push(`Total Contenedores:,${totalCont.toFixed(2)}`);
      lines.push(`Total Facturado:,${(totalOrders + totalCont).toFixed(2)}`);
      lines.push(`Total Pagado:,${totalPaidOrders.toFixed(2)}`);
      lines.push(`SALDO PENDIENTE:,${(totalOrders + totalCont - totalPaidOrders).toFixed(2)}`);

      // BOM for Excel UTF-8
      const bom = '\uFEFF';
      const csvStr = bom + lines.join('\n');
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const safeName = (dist.full_name || 'distribuidor').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      link.setAttribute('download', `reporte_${safeName}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Error al generar reporte: ' + err.message);
    } finally {
      setExportingReport(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const safeSearch = searchTerm?.toLowerCase() || '';
    const matchesSearch =
      (user.email && user.email.toLowerCase().includes(safeSearch)) ||
      (user.full_name && user.full_name.toLowerCase().includes(safeSearch)) ||
      (user.company_name && user.company_name.toLowerCase().includes(safeSearch));
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && user.is_active) ||
      (filterStatus === 'inactive' && !user.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (sortConfig.key === 'client') {
      aValue = (a.full_name || a.email || '').toLowerCase();
      bValue = (b.full_name || b.email || '').toLowerCase();
    }

    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalClients = users.length;
  const activeClients = users.filter(u => u.is_active).length;
  const totalRevenue = '$0'; // Will reflect real data from orders

  const getInitials = (user) => {
    if (user.full_name) {
      const parts = user.full_name.split(' ');
      return parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : parts[0].substring(0, 2).toUpperCase();
    }
    return user.email ? user.email.substring(0, 2).toUpperCase() : '??';
  };

  // --- CxC Data Fetch ---
  const fetchCxC = async () => {
    setCxcLoading(true);
    // Get all distributors
    const { data: distributors } = await supabase
      .from('profiles')
      .select('id, full_name, email, city, company_name, client_number, phone')
      .eq('role', 'distributor')
      .eq('is_active', true)
      .order('full_name');

    if (!distributors) { setCxcLoading(false); return; }

    // Get all non-cancelled orders with their payments
    const { data: orders, error: ordErr } = await supabase
      .from('orders')
      .select('id, distributor_id, total_amount, status, payment_status, created_at')
      .neq('status', 'cancelled')
      .neq('status', 'rejected');

    if (ordErr) console.error('[CxC] Orders query error:', ordErr);

    const { data: payments, error: payErr } = await supabase
      .from('order_payments')
      .select('id, order_id, amount, payment_date')
      .order('payment_date', { ascending: false });

    if (payErr) console.error('[CxC] Payments query error:', payErr);

    // Get container reception charges for PRO distributors
    const { data: receptions } = await supabase
      .from('container_receptions')
      .select('id, distributor_id, charge_amount, status, reception_date')
      .eq('status', 'completed')
      .not('distributor_id', 'is', null)
      .gt('charge_amount', 0);

    // Build per-distributor summary
    const summary = distributors.map(dist => {
      const distOrders = (orders || []).filter(o => o.distributor_id === dist.id);
      const totalFacturadoOrders = distOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      // Add container reception charges
      const distReceptions = (receptions || []).filter(r => r.distributor_id === dist.id);
      const totalFacturadoReceptions = distReceptions.reduce((sum, r) => sum + (r.charge_amount || 0), 0);

      const totalFacturado = totalFacturadoOrders + totalFacturadoReceptions;

      const orderIds = distOrders.map(o => o.id);
      const distPayments = (payments || []).filter(p => orderIds.includes(p.order_id));
      const totalPagado = distPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const lastPayment = distPayments.length > 0 ? distPayments[0].payment_date : null;
      return {
        ...dist,
        totalFacturado,
        totalPagado,
        balance: totalFacturado - totalPagado,
        orderCount: distOrders.length,
        receptionCount: distReceptions.length,
        lastPayment,
      };
    }).filter(d => d.orderCount > 0 || d.receptionCount > 0 || d.balance !== 0);

    setCxcData(summary);
    setCxcLoading(false);
  };

  // CxC filtered & sorted
  const filteredCxc = cxcData.filter(d => {
    if (!cxcSearch) return true;
    const s = cxcSearch.toLowerCase();
    return (d.full_name || '').toLowerCase().includes(s)
      || (d.company_name || '').toLowerCase().includes(s)
      || (d.city || '').toLowerCase().includes(s)
      || (d.client_number || '').toLowerCase().includes(s);
  }).sort((a, b) => {
    const av = a[cxcSort.key] ?? 0;
    const bv = b[cxcSort.key] ?? 0;
    return cxcSort.dir === 'desc' ? bv - av : av - bv;
  });

  const totalGlobalFacturado = cxcData.reduce((s, d) => s + d.totalFacturado, 0);
  const totalGlobalPagado = cxcData.reduce((s, d) => s + d.totalPagado, 0);
  const totalGlobalBalance = totalGlobalFacturado - totalGlobalPagado;

  return (
    <>
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight m-0">Clientes</h1>
          <p className="text-slate-500 mt-1 m-0">Gestión integral de cartera de clientes y facturación.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedUsers.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-4 py-2.5 rounded-xl text-white font-bold bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all flex items-center gap-2 border-none cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Eliminar ({selectedUsers.length})
            </button>
          )}
          <button
            onClick={() => exportToCSV(sortedUsers)}
            className="px-4 py-2.5 rounded-xl text-slate-700 font-bold bg-white/60 hover:bg-white backdrop-blur-md border border-white/50 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#6a9a04]" /> Exportar CSV
          </button>
          {currentUserSubRole === 'super_admin' && (
            <button
              onClick={() => setShowNewCollab(true)}
              className="px-4 py-2.5 rounded-xl text-white font-bold bg-[#6a9a04] hover:bg-[#6a9a04]/90 shadow-lg shadow-[#6a9a04]/20 transition-all flex items-center gap-2 cursor-pointer border-none"
            >
              <UserPlus className="w-4 h-4" /> Crear Colaborador
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/60 backdrop-blur-md rounded-xl p-1 border border-white/50 shadow-sm w-fit">
        {[{ key: 'clientes', label: 'Clientes', icon: Users }, { key: 'cxc', label: 'Cuentas por Cobrar', icon: DollarSign }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all border-none cursor-pointer ${activeTab === t.key
              ? 'bg-[#6a9a04] text-white shadow-md'
              : 'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'clientes' && (<>
      {/* Filters & Search */}
      <section className="bg-white/60 backdrop-blur-md shadow-sm border border-white/50 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              className="w-full pl-11 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-sm"
              placeholder="Buscar por nombre, empresa o correo..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="bg-white/50 border border-slate-200 rounded-xl py-3 pl-4 pr-10 focus:ring-2 focus:ring-[#6a9a04]/30 text-sm font-medium text-slate-700 outline-none shadow-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos los Status</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
          <select
            className="bg-white/50 border border-slate-200 rounded-xl py-3 pl-4 pr-10 focus:ring-2 focus:ring-[#6a9a04]/30 text-sm font-medium text-slate-700 outline-none shadow-sm"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">Todos los Roles</option>
            <option value="distributor">Distribuidores</option>
            <option value="admin">Administradores</option>
          </select>
        </div>
      </section>

      {/* Table */}
      <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#6a9a04]/5 border-b border-[#6a9a04]/10">
                <th className="px-6 py-4 w-10">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-[#6a9a04] focus:ring-[#6a9a04] cursor-pointer accent-[#6a9a04]"
                      checked={selectedUsers.length === sortedUsers.length && sortedUsers.length > 0}
                      onChange={(e) => handleSelectAll(e, sortedUsers)}
                    />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:bg-[#6a9a04]/10 transition-colors" onClick={() => handleSort('id')}>
                  <div className="flex items-center gap-1">ID {getSortIcon('id')}</div>
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:bg-[#6a9a04]/10 transition-colors" onClick={() => handleSort('client')}>
                  <div className="flex items-center gap-1">Cliente {getSortIcon('client')}</div>
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:bg-[#6a9a04]/10 transition-colors" onClick={() => handleSort('city')}>
                  <div className="flex items-center gap-1">Ubicación {getSortIcon('city')}</div>
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Teléfono
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:bg-[#6a9a04]/10 transition-colors" onClick={() => handleSort('role')}>
                  <div className="flex items-center gap-1">Rol {getSortIcon('role')}</div>
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center cursor-pointer select-none hover:bg-[#6a9a04]/10 transition-colors" onClick={() => handleSort('is_active')}>
                  <div className="flex items-center justify-center gap-1">Status {getSortIcon('is_active')}</div>
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-[#6a9a04] rounded-full animate-spin"></div>
                      <p className="font-medium">Cargando clientes...</p>
                    </div>
                  </td>
                </tr>
              ) : sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No se encontraron clientes.
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user, idx) => {
                  const isExpanded = expandedUserId === user.id;
                  const userAddresses = addressCache[user.id] || [];
                  return (
                  <>
                  <tr key={user.id} className="hover:bg-white/40 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-[#6a9a04] focus:ring-[#6a9a04] cursor-pointer accent-[#6a9a04]"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-mono text-[#6a9a04] font-bold">{user.client_number || '—'}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${user.is_active ? 'bg-[#6a9a04]/20 text-[#6a9a04]' : 'bg-slate-200 text-slate-500'}`}>
                          {getInitials(user)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-[#6a9a04] transition-colors m-0">
                            {user.full_name || 'Sin nombre'}
                            {user.sub_role === 'distributor_pro' && <span className="ml-1.5 text-[9px] font-black bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full align-middle">PRO</span>}
                          </p>
                          <p className="text-xs text-slate-500 m-0">
                            {user.company_name ? `${user.company_name} • ${user.email}` : user.email}
                            {user.parent_distributor_id && (() => { const parent = users.find(u => u.id === user.parent_distributor_id); return parent ? <span className="ml-1 text-purple-500">→ {parent.full_name || parent.city || 'PRO'}</span> : null; })()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600">{user.city || '—'}</td>
                    <td className="px-6 py-5 text-sm text-slate-600">{user.phone || '—'}</td>
                    <td className="px-6 py-5 text-sm">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-[#6a9a04]/10 text-[#6a9a04]' : 'bg-[#6a9a04]/10 text-[#6a9a04]'}`}>
                        {user.role === 'admin' && <Shield className="w-3 h-3" />}
                        {user.role === 'admin' ? 'Admin' : 'Distribuidor'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${user.is_active ? 'bg-[#6a9a04]/10 text-[#6a9a04] border-[#6a9a04]/20' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${user.is_active ? 'bg-[#6a9a04]' : 'bg-slate-400'}`} />
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {user.role === 'distributor' && (
                          <button
                            className={`p-2 rounded-lg transition-colors border bg-transparent cursor-pointer shadow-sm hover:shadow-sm ${
                              isExpanded ? 'bg-blue-50 border-blue-200 text-blue-600' : 'hover:bg-blue-50 border-transparent hover:border-blue-200'
                            }`}
                            onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                            title="Ver Direcciones"
                          >
                            <MapPin className={`w-4 h-4 ${isExpanded ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'}`} />
                          </button>
                        )}
                        <button
                          className="p-2 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-slate-200 bg-transparent cursor-pointer shadow-sm hover:shadow-sm"
                          onClick={() => handleEditClick(user)}
                          title="Editar Usuario"
                        >
                          <Edit2 className="w-4 h-4 text-slate-500 hover:text-[#6a9a04]" />
                        </button>
                        <button
                          className="p-2 rounded-lg hover:bg-red-50 transition-colors border border-transparent hover:border-red-200 bg-transparent cursor-pointer shadow-sm hover:shadow-sm"
                          onClick={() => handleDeleteSingle(user.id)}
                          title="Eliminar Usuario"
                        >
                          <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Expandable Addresses Row */}
                  {isExpanded && (
                    <tr key={`${user.id}-addr`}>
                      <td colSpan="8" className="px-6 py-0">
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mb-3 mt-1">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-blue-600" />
                              <span className="text-xs font-black text-blue-700 uppercase tracking-wider">Direcciones de Entrega</span>
                              <span className="text-[10px] font-bold text-blue-400 bg-blue-100 px-2 py-0.5 rounded-full">{userAddresses.length}</span>
                            </div>
                            <Link
                              href={`/dashboard/precios?distributor=${user.id}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6a9a04] text-white text-[11px] font-bold no-underline hover:bg-[#6a9a04]/90 transition-colors shadow-sm"
                            >
                              <DollarSign size={12} /> Asignar Precios
                            </Link>
                          </div>
                          {userAddresses.length > 0 ? (
                            <div className="space-y-2">
                              {userAddresses.map(addr => (
                                <div key={addr.id} className="flex items-start justify-between bg-white rounded-lg px-4 py-3 border border-blue-100/50">
                                  <div>
                                    <p className="font-bold text-sm text-slate-900 m-0 flex items-center gap-2">
                                      {addr.label || 'Dirección'}
                                      {addr.is_default && <span className="text-[9px] font-black bg-[#6a9a04]/10 text-[#6a9a04] px-1.5 py-0.5 rounded-full">DEFAULT</span>}
                                    </p>
                                    <p className="text-xs text-slate-500 m-0 mt-1">
                                      {[addr.street, addr.neighborhood, addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}
                                    </p>
                                    {addr.reference && <p className="text-[11px] text-slate-400 m-0 mt-0.5">Ref: {addr.reference}</p>}
                                  </div>
                                  <Link
                                    href={`/dashboard/precios?distributor=${user.id}&address=${addr.id}`}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 no-underline hover:border-[#6a9a04]/30 hover:text-[#6a9a04] transition-colors shrink-0 mt-1"
                                  >
                                    <DollarSign size={11} /> Precios
                                  </Link>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-sm text-slate-400">
                              <MapPin size={20} className="mx-auto mb-1 opacity-40" />
                              Este distribuidor no tiene direcciones registradas.
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <footer className="px-6 py-4 bg-white/40 border-t border-slate-100/50 flex items-center justify-between">
          <p className="text-sm text-slate-500 font-medium m-0">Mostrando {sortedUsers.length} de {users.length} clientes</p>
        </footer>
      </div>

      {/* Stats Overview */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/50 p-6 rounded-2xl flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-[#6a9a04]/10 flex items-center justify-center text-[#6a9a04]">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight m-0">Total Clientes</p>
            <p className="text-2xl font-black text-slate-900 m-0">{totalClients}</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/50 p-6 rounded-2xl flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-[#dee24b]/30 flex items-center justify-center text-[#6a9a04]">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight m-0">Clientes Activos</p>
            <p className="text-2xl font-black text-slate-900 m-0">{activeClients}</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/50 p-6 rounded-2xl flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-[#6a9a04]/10 flex items-center justify-center text-[#6a9a04]">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight m-0">Facturación Mes</p>
            <p className="text-2xl font-black text-slate-900 m-0">{totalRevenue}</p>
          </div>
        </div>
      </section>

      {/* Edit User Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center px-4">
          <div className="bg-white/90 backdrop-blur-xl border border-white max-w-[500px] w-full rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200/50 flex justify-between items-center bg-white/50">
              <h3 className="text-lg font-bold text-slate-900 m-0">Editar Cliente</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 bg-transparent border border-transparent transition-colors cursor-pointer text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nombre Completo</label>
                <input type="text" value={selectedUser.full_name || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Correo Electrónico</label>
                <input type="text" value={selectedUser.email} disabled
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nombre de la Empresa</label>
                <input type="text" value={selectedUser.company_name || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, company_name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 outline-none"
                  placeholder="Ej. Mi Empresa S.A."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Ciudad</label>
                  <input type="text" value={selectedUser.city || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, city: e.target.value })}
                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 outline-none"
                    placeholder="Ej. Monterrey, NL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Teléfono</label>
                  <input type="tel" value={selectedUser.phone || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 outline-none"
                    placeholder="81 1234 5678"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Domicilio</label>
                <input type="text" value={selectedUser.address || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, address: e.target.value })}
                  className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 outline-none"
                  placeholder="Ej. Calle Falsa 123"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Rol</label>
                  <select
                    value={selectedUser.role}
                    onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 outline-none"
                  >
                    <option value="distributor">Distribuidor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Estado</label>
                  <select
                    value={selectedUser.is_active ? 'true' : 'false'}
                    onChange={(e) => setSelectedUser({ ...selectedUser, is_active: e.target.value === 'true' })}
                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 outline-none"
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>
              {selectedUser.role === 'distributor' && (
                <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Tipo Distribuidor</label>
                    <select
                      value={selectedUser.sub_role || ''}
                      onChange={(e) => setSelectedUser({ ...selectedUser, sub_role: e.target.value || null })}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 outline-none"
                    >
                      <option value="">Distribuidor Regular</option>
                      <option value="distributor_pro">Distribuidor PRO (gestiona zona)</option>
                    </select>
                  </div>
                  {selectedUser.sub_role !== 'distributor_pro' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Asignar a PRO</label>
                    <select
                      value={selectedUser.parent_distributor_id || ''}
                      onChange={(e) => setSelectedUser({ ...selectedUser, parent_distributor_id: e.target.value || null })}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 outline-none"
                    >
                      <option value="">Sin asignar (directo a Greenland)</option>
                      {users.filter(u => u.role === 'distributor' && u.sub_role === 'distributor_pro' && u.id !== selectedUser.id).map(pro => (
                        <option key={pro.id} value={pro.id}>🏢 {pro.full_name || pro.email} {pro.city ? `— ${pro.city}` : ''}</option>
                      ))}
                    </select>
                  </div>
                  )}
                </div>
                {selectedUser.sub_role === 'distributor_pro' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mt-4">
                    <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">🏭 Almacén Asignado (Cobertura)</label>
                    <select
                      value={selectedUser.assigned_warehouse_id || ''}
                      onChange={(e) => setSelectedUser({ ...selectedUser, assigned_warehouse_id: e.target.value || null })}
                      className="w-full px-4 py-3 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-300 text-slate-800 outline-none"
                    >
                      <option value="">Sin almacén asignado</option>
                      {allWarehouses.map(wh => (
                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-purple-500 mt-1">El distribuidor PRO verá la cobertura de este almacén en su portal</p>
                  </div>
                )}
                </>
              )}
            </div>
            {selectedUser.role === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Sub-Rol Admin</label>
                <select
                  value={selectedUser.sub_role || 'viewer'}
                  onChange={(e) => setSelectedUser({ ...selectedUser, sub_role: e.target.value })}
                  className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 outline-none"
                >
                  <option value="super_admin">Super Admin (acceso total)</option>
                  <option value="warehouse_admin">Admin Bodega (inventarios)</option>
                  <option value="accountant">Contabilidad (pagos/precios)</option>
                  <option value="viewer">Solo Lectura</option>
                </select>
              </div>
            )}
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} disabled={updating}
                className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white/50 border border-slate-200 hover:bg-white cursor-pointer transition-all"
              >Cancelar</button>
              <button onClick={handleSaveUser} disabled={updating}
                className="px-5 py-2.5 rounded-xl text-white font-bold bg-[#6a9a04] hover:bg-[#6a9a04]/90 shadow-lg shadow-[#6a9a04]/20 cursor-pointer transition-all flex items-center gap-2 border-none"
              >
                {updating ? 'Guardando...' : <><Save className="w-4 h-4" /> Guardar Cambios</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center px-4">
          <div className="bg-white/90 backdrop-blur-xl border border-white max-w-[400px] w-full rounded-2xl shadow-2xl overflow-hidden text-center p-8">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">
              ¿Eliminar {deleteModal.isBulk ? `${selectedUsers.length} usuario(s)` : 'usuario'}?
            </h3>
            <p className="text-slate-500 font-medium mb-8">
              Esta acción es permanente y no se puede deshacer. Los clientes perderán acceso al portal inmediatamente.
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteModal({ isOpen: false, isBulk: false, targetId: null })} disabled={loading}
                className="px-6 py-3 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all flex-1">
                Cancelar
              </button>
              <button onClick={executeDelete} disabled={loading}
                className="px-6 py-3 rounded-xl text-white font-bold bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 cursor-pointer transition-all border-none flex-1">
                {loading ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Collaborator Modal */}
      {showNewCollab && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center px-4" onClick={() => setShowNewCollab(false)}>
          <div className="bg-white/90 backdrop-blur-xl border border-white max-w-[500px] w-full rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200/50 flex justify-between items-center bg-white/50">
              <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#6a9a04]" /> Crear Colaborador
              </h3>
              <button onClick={() => setShowNewCollab(false)} className="p-1.5 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input type="text" value={newCollab.full_name} onChange={e => setNewCollab(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm outline-none shadow-sm" placeholder="Ej. Andrea López" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Correo *</label>
                <input type="email" value={newCollab.email} onChange={e => setNewCollab(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm outline-none shadow-sm" placeholder="andrea@greenland-products.com.mx" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña *</label>
                <input type="password" value={newCollab.password} onChange={e => setNewCollab(p => ({ ...p, password: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm outline-none shadow-sm" placeholder="Mínimo 6 caracteres" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Rol</label>
                <select value={newCollab.sub_role} onChange={e => setNewCollab(p => ({ ...p, sub_role: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 text-sm outline-none shadow-sm">
                  <option value="super_admin">Super Admin (acceso total)</option>
                  <option value="warehouse_admin">Admin Bodega (inventarios)</option>
                  <option value="accountant">Contabilidad (pagos/precios)</option>
                  <option value="viewer">Solo Lectura</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowNewCollab(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm">
                  Cancelar</button>
                <button disabled={creatingCollab || !newCollab.full_name || !newCollab.email || !newCollab.password}
                  onClick={async () => {
                    if (newCollab.password.length < 6) { alert('La contraseña debe tener mínimo 6 caracteres'); return; }
                    setCreatingCollab(true);
                    const { data, error } = await supabase.auth.signUp({
                      email: newCollab.email,
                      password: newCollab.password,
                      options: { data: { full_name: newCollab.full_name } }
                    });
                    if (error) { alert('Error: ' + error.message); setCreatingCollab(false); return; }
                    if (data.user) {
                      await supabase.from('profiles').update({
                        role: 'admin',
                        sub_role: newCollab.sub_role,
                        full_name: newCollab.full_name,
                        is_active: true
                      }).eq('id', data.user.id);
                    }
                    setCreatingCollab(false);
                    setShowNewCollab(false);
                    setNewCollab({ full_name: '', email: '', password: '', sub_role: 'viewer' });
                    alert('✅ Colaborador creado. Debe confirmar su email para iniciar sesión.');
                    fetchUsers();
                  }}
                  className="px-5 py-2.5 rounded-xl text-white font-bold bg-[#6a9a04] hover:bg-[#6a9a04]/90 shadow-lg shadow-[#6a9a04]/30 cursor-pointer transition-all border-none disabled:opacity-50 flex items-center gap-2">
                  {creatingCollab ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  {creatingCollab ? 'Creando...' : 'Crear Colaborador'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </>)}

      {/* ===== CUENTAS POR COBRAR TAB ===== */}
      {activeTab === 'cxc' && (
        <div>
          {/* CxC Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider m-0">Total Facturado</p>
              <p className="text-2xl font-black text-slate-900 m-0 mt-1">${totalGlobalFacturado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider m-0">Total Cobrado</p>
              <p className="text-2xl font-black text-green-600 m-0 mt-1">${totalGlobalPagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider m-0">Saldo Pendiente</p>
              <p className={`text-2xl font-black m-0 mt-1 ${totalGlobalBalance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                ${totalGlobalBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* CxC Search */}
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm p-4 mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Buscar distribuidor..." value={cxcSearch}
                onChange={(e) => setCxcSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm" />
            </div>
          </div>

          {/* CxC Table */}
          {cxcLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
              <div className="w-10 h-10 border-3 border-slate-300 border-l-[#6a9a04] rounded-full animate-spin" />
              <p>Calculando saldos...</p>
            </div>
          ) : (
            <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#6a9a04]/5 border-b border-[#6a9a04]/10">
                      <th className="px-5 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Distribuidor</th>
                      <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Ciudad</th>
                      <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 text-center">Pedidos</th>
                      <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 text-right cursor-pointer select-none hover:bg-[#6a9a04]/10 transition-colors"
                        onClick={() => setCxcSort(s => ({ key: 'totalFacturado', dir: s.key === 'totalFacturado' && s.dir === 'desc' ? 'asc' : 'desc' }))}>
                        Facturado {cxcSort.key === 'totalFacturado' && (cxcSort.dir === 'desc' ? '↓' : '↑')}
                      </th>
                      <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 text-right cursor-pointer select-none hover:bg-[#6a9a04]/10 transition-colors"
                        onClick={() => setCxcSort(s => ({ key: 'totalPagado', dir: s.key === 'totalPagado' && s.dir === 'desc' ? 'asc' : 'desc' }))}>
                        Pagado {cxcSort.key === 'totalPagado' && (cxcSort.dir === 'desc' ? '↓' : '↑')}
                      </th>
                      <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 text-right cursor-pointer select-none hover:bg-[#6a9a04]/10 transition-colors"
                        onClick={() => setCxcSort(s => ({ key: 'balance', dir: s.key === 'balance' && s.dir === 'desc' ? 'asc' : 'desc' }))}>
                        Saldo {cxcSort.key === 'balance' && (cxcSort.dir === 'desc' ? '↓' : '↑')}
                      </th>
                      <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Último Pago</th>
                      <th className="px-4 py-4 text-[11px] font-black uppercase tracking-wider text-slate-500 text-center">Reporte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCxc.length === 0 ? (
                      <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">No se encontraron distribuidores con saldo.</td></tr>
                    ) : (
                      filteredCxc.map(d => (
                        <tr key={d.id} className="hover:bg-white/50 transition-colors">
                          <td className="px-5 py-4">
                            <p className="font-bold text-sm text-slate-900 m-0">{d.full_name || d.email}</p>
                            <p className="text-[11px] text-slate-400 m-0">{d.company_name || ''} {d.client_number ? `• #${d.client_number}` : ''}</p>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">{d.city || '—'}</td>
                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-sm font-bold text-slate-700">{d.orderCount}</span>
                          </td>
                          <td className="px-4 py-4 text-right font-medium text-slate-700">
                            ${d.totalFacturado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-4 text-right font-medium text-green-600">
                            ${d.totalPagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className={`font-black text-sm ${d.balance > 0 ? 'text-red-500' : d.balance === 0 ? 'text-green-600' : 'text-slate-500'}`}>
                              ${d.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-500">
                            {d.lastPayment ? new Date(d.lastPayment).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : <span className="text-slate-300">Sin pagos</span>}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => exportDistributorReport(d)}
                              disabled={exportingReport === d.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#6a9a04] bg-[#6a9a04]/10 hover:bg-[#6a9a04]/20 rounded-lg border-none cursor-pointer transition-all disabled:opacity-50"
                              title="Descargar reporte detallado"
                            >
                              {exportingReport === d.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                              Reporte
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
                <p className="text-xs text-slate-500 m-0">{filteredCxc.length} distribuidores con movimientos</p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

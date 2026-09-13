'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useSearchParams } from 'next/navigation';
import { formatDateOnly } from '@/utils/formatters';

export function useUsersAndCxc() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  // Tab: 'distribuidores' | 'administradores' | 'cxc'
  const initialTab = searchParams?.get('tab') === 'cxc'
    ? 'cxc'
    : searchParams?.get('tab') === 'administradores'
    ? 'administradores'
    : 'distribuidores';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Selection and Sorting
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'client_number', direction: 'desc' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, isBulk: false, targetId: null });

  // Badge ID modal (EXCLUSIVELY FOR ADMIN TEAM MEMBERS)
  const [badgeUser, setBadgeUser] = useState(null);
  const [showEditBadgeTexts, setShowEditBadgeTexts] = useState(false);
  const [badgeSettings, setBadgeSettings] = useState({
    mision: 'Liderar la innovación sostenible en soluciones modulares e industriales, impactando positivamente el entorno y la sociedad.',
    vision: 'Ser el referente global en soluciones avanzadas, reconocidos por calidad y compromiso ambiental para el 2030.',
    valores: 'CALIDAD: Excelencia en cada proceso.\nINNOVACIÓN: Soluciones tecnológicas de vanguardia.\nSOSTENIBILIDAD: Compromiso con el futuro.',
    emergencias: 'Tel: (844) 105 8692 | contacto@greenland-products.com.mx'
  });

  const [downloadingFront, setDownloadingFront] = useState(false);
  const [downloadingBack, setDownloadingBack] = useState(false);

  // New collaborator modal
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
  const [exportingReport, setExportingReport] = useState(null);

  // Address drawer state
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [addressCache, setAddressCache] = useState({});
  const [addressLoading, setAddressLoading] = useState(false);

  // Warehouses
  const [allWarehouses, setAllWarehouses] = useState([]);

  useEffect(() => {
    fetchUsers();
    fetchWarehouses();
    fetchUserRole();
    fetchCxC(); // Prefetch CxC data in background on mount
  }, []);

  useEffect(() => {
    if (activeTab === 'cxc' && cxcData.length === 0 && !cxcLoading) {
      fetchCxC();
    }
  }, [activeTab]);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('sub_role')
          .eq('id', user.id)
          .single();
        if (profile) setCurrentUserSubRole(profile.sub_role);
      }
    } catch (e) {
      console.error('[Users] Error fetching current user role:', e);
    }
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('id, name').eq('is_active', true).order('name');
    if (data) setAllWarehouses(data);
  };

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const toggleAddressDrawer = async (userId) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(userId);

    // If addresses for this user are not yet cached, fetch them
    if (!addressCache[userId]) {
      setAddressLoading(true);
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false });

      if (!error && data) {
        setAddressCache(prev => ({ ...prev, [userId]: data }));
      } else {
        setAddressCache(prev => ({ ...prev, [userId]: [] }));
      }
      setAddressLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser({ ...user });
    setIsModalOpen(true);
  };

  const handleSaveUser = async () => {
    setUpdating(true);

    const updateData = {
      role: selectedUser.role,
      sub_role: selectedUser.sub_role || null,
      is_active: selectedUser.is_active,
      full_name: selectedUser.full_name,
      company_name: selectedUser.company_name,
      city: selectedUser.city,
      phone: selectedUser.phone,
      client_number: selectedUser.client_number,
      address: selectedUser.address || null,
      job_title: selectedUser.job_title || null,
      authorization_pin: selectedUser.authorization_pin || null,
      employee_barcode: selectedUser.employee_barcode || null,
    };

    if (selectedUser.role === 'distributor') {
      updateData.parent_distributor_id = selectedUser.parent_distributor_id || null;
      updateData.assigned_warehouse_id = selectedUser.sub_role === 'distributor_pro'
        ? (selectedUser.assigned_warehouse_id || null)
        : null;
      updateData.product_segment = selectedUser.product_segment || 'mobiliario';
    } else {
      updateData.parent_distributor_id = null;
      updateData.assigned_warehouse_id = null;
      updateData.product_segment = null;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', selectedUser.id);

    if (error) {
      alert('Error al actualizar usuario: ' + error.message);
    } else {
      setUsers(users.map(u => (u.id === selectedUser.id ? { ...u, ...updateData } : u)));
      setIsModalOpen(false);
    }
    setUpdating(false);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectAll = (e, targetList) => {
    if (e.target.checked) {
      setSelectedUsers(targetList.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (id) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(uId => uId !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    setDeleteModal({ isOpen: true, isBulk: true, targetId: null });
  };

  const handleDeleteSingle = (id) => {
    setDeleteModal({ isOpen: true, isBulk: false, targetId: id });
  };

  const confirmDelete = async () => {
    const idsToDelete = deleteModal.isBulk ? selectedUsers : [deleteModal.targetId];
    if (!idsToDelete || idsToDelete.length === 0 || !idsToDelete[0]) {
      setDeleteModal({ isOpen: false, isBulk: false, targetId: null });
      return;
    }

    try {
      if (idsToDelete.length === 1) {
        const singleId = idsToDelete[0];
        // Try RPC first for clean cascade deletion
        const { error: rpcErr } = await supabase.rpc('delete_user', { user_id: singleId });
        if (rpcErr) {
          const { error: rpcErr2 } = await supabase.rpc('delete_user', { target_user_id: singleId });
          if (rpcErr2) {
            // Direct cleanup fallback: delete child records first
            await supabase.from('addresses').delete().eq('user_id', singleId);
            await supabase.from('cart').delete().eq('user_id', singleId);
            await supabase.from('distributor_pricing').delete().eq('user_id', singleId);

            const { error: directErr } = await supabase.from('profiles').delete().eq('id', singleId);
            if (directErr) throw directErr;
          }
        }
      } else {
        const { error: rpcErr } = await supabase.rpc('delete_users', { user_ids: idsToDelete });
        if (rpcErr) {
          const { error: rpcErr2 } = await supabase.rpc('delete_users', { target_user_ids: idsToDelete });
          if (rpcErr2) {
            await supabase.from('addresses').delete().in('user_id', idsToDelete);
            await supabase.from('cart').delete().in('user_id', idsToDelete);
            await supabase.from('distributor_pricing').delete().in('user_id', idsToDelete);

            const { error: directErr } = await supabase.from('profiles').delete().in('id', idsToDelete);
            if (directErr) throw directErr;
          }
        }
      }

      setUsers(prev => prev.filter(u => !idsToDelete.includes(u.id)));
      if (deleteModal.isBulk) setSelectedUsers([]);
    } catch (err) {
      alert('Error eliminando usuario: ' + (err.message || err));
    } finally {
      setDeleteModal({ isOpen: false, isBulk: false, targetId: null });
    }
  };

  const handleCreateCollaborator = async (e) => {
    e.preventDefault();
    if (!newCollab.email || !newCollab.password || !newCollab.full_name) {
      alert('Por favor llena todos los campos obligatorios');
      return;
    }
    setCreatingCollab(true);

    try {
      // Create user using Supabase auth signUp
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: newCollab.email,
        password: newCollab.password,
        options: {
          data: {
            full_name: newCollab.full_name,
            role: 'admin',
            sub_role: newCollab.sub_role
          }
        }
      });

      if (authErr) {
        alert('Error al crear colaborador: ' + authErr.message);
        setCreatingCollab(false);
        return;
      }

      const newUserId = authData.user?.id;

      if (newUserId) {
        // Upsert profile for the new admin collaborator
        const { error: profErr } = await supabase.from('profiles').upsert({
          id: newUserId,
          full_name: newCollab.full_name,
          email: newCollab.email,
          role: 'admin',
          sub_role: newCollab.sub_role,
          is_active: true
        });

        if (profErr) console.error('Error upserting profile:', profErr);
      }

      alert(`✅ Colaborador ${newCollab.full_name} creado exitosamente como Administrador.`);
      setShowNewCollab(false);
      setNewCollab({ full_name: '', email: '', password: '', sub_role: 'viewer' });
      fetchUsers();
    } catch (err) {
      alert('Error inesperado: ' + err.message);
    }
    setCreatingCollab(false);
  };

  // Badge Image Download Generator (EXCLUSIVELY FOR ADMIN TEAM MEMBERS)
  const downloadBadgeImage = async (elementId, filename, side) => {
    if (side === 'front') setDownloadingFront(true);
    if (side === 'back') setDownloadingBack(true);

    try {
      if (!window.htmlToImage) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('No se pudo cargar la librería de conversión de imagen'));
          document.head.appendChild(script);
        });
      }
      const element = document.getElementById(elementId);
      if (!element) return;

      const dataUrl = await window.htmlToImage.toPng(element, {
        pixelRatio: 3,
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error al generar imagen con html-to-image:', err);
      // Fallback Engine: html2canvas
      try {
        if (!window.html2canvas) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        const element = document.getElementById(elementId);
        if (!element) return;
        const canvas = await window.html2canvas(element, { scale: 3, useCORS: true });
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err2) {
        alert('No se pudo descargar la imagen: ' + err2.message);
      }
    } finally {
      if (side === 'front') setDownloadingFront(false);
      if (side === 'back') setDownloadingBack(false);
    }
  };

  // CxC Logic
  const fetchCxC = async () => {
    setCxcLoading(true);
    const { data: distributors, error: distErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'distributor');

    if (distErr || !distributors) {
      setCxcLoading(false);
      return;
    }

    const { data: orders, error: ordErr } = await supabase
      .from('orders')
      .select('id, distributor_id, total_amount, status')
      .neq('status', 'cancelled')
      .neq('status', 'rejected');

    const { data: payments, error: payErr } = await supabase
      .from('order_payments')
      .select('id, order_id, amount, payment_date')
      .order('payment_date', { ascending: false });

    // Container reception charges for PRO distributors
    const { data: receptions } = await supabase
      .from('container_receptions')
      .select('id, distributor_id, charge_amount, status, reception_date')
      .eq('status', 'completed')
      .not('distributor_id', 'is', null);

    // Approved container payments
    const { data: containerPayments } = await supabase
      .from('distributor_payments')
      .select('distributor_id, amount, container_amount, payment_type, payment_date')
      .eq('status', 'approved')
      .in('payment_type', ['containers', 'mixed']);

    const summary = distributors.map(dist => {
      const distOrders = (orders || []).filter(o => o.distributor_id === dist.id);
      const totalFacturadoOrders = distOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      const distReceptions = (receptions || []).filter(r => r.distributor_id === dist.id);
      const totalFacturadoReceptions = distReceptions.reduce((sum, r) => sum + Number(r.charge_amount || 0), 0);

      const totalFacturado = totalFacturadoOrders + totalFacturadoReceptions;

      const orderIds = distOrders.map(o => o.id);
      const distPaymentsList = (payments || []).filter(p => orderIds.includes(p.order_id));
      const totalPagadoPedidos = distPaymentsList.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const distContainerPayments = (containerPayments || []).filter(cp => cp.distributor_id === dist.id);
      const totalPagadoContenedores = distContainerPayments.reduce((sum, cp) => {
        if (cp.payment_type === 'containers') return sum + Number(cp.amount || 0);
        return sum + Number(cp.container_amount || 0);
      }, 0);

      const totalPagado = totalPagadoPedidos + totalPagadoContenedores;
      const lastOrderPayment = distPaymentsList.length > 0 ? distPaymentsList[0].payment_date : null;
      const lastContainerPayment = distContainerPayments.length > 0 ? distContainerPayments[0].payment_date : null;
      const lastPayment = [lastOrderPayment, lastContainerPayment].filter(Boolean).sort().reverse()[0] || null;

      return {
        ...dist,
        totalFacturado,
        totalPagado,
        totalPagadoPedidos,
        totalPagadoContenedores,
        balance: totalFacturado - totalPagado,
        orderCount: distOrders.length,
        receptionCount: distReceptions.length,
        lastPayment,
      };
    }).filter(d => d.orderCount > 0 || d.receptionCount > 0 || d.balance !== 0);

    setCxcData(summary);
    setCxcLoading(false);
  };

  const exportDistributorReport = async (dist) => {
    setExportingReport(dist.id);
    try {
      const { data: ordersData, error: ordErr } = await supabase
        .from('orders')
        .select('id, order_number, created_at, total_amount, status, payment_status')
        .eq('distributor_id', dist.id)
        .neq('status', 'cancelled')
        .neq('status', 'rejected')
        .order('created_at', { ascending: false });

      if (ordErr) console.error('Orders query error:', ordErr);

      const orderIds = (ordersData || []).map(o => o.id);

      let allItems = [];
      if (orderIds.length > 0) {
        const { data: itemsData, error: itemsErr } = await supabase
          .from('order_items')
          .select('id, order_id, product_id, quantity, unit_price, subtotal')
          .in('order_id', orderIds);
        if (itemsErr) console.error('Order items query error:', itemsErr);
        allItems = itemsData || [];

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
        }
      }

      const itemsByOrder = {};
      allItems.forEach(item => {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
        itemsByOrder[item.order_id].push(item);
      });

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

      const { data: receptionsData } = await supabase
        .from('container_receptions')
        .select('id, container_label, operation_number, reception_date, charge_amount, status, warehouse:warehouses(name)')
        .eq('distributor_id', dist.id)
        .eq('status', 'completed')
        .order('reception_date', { ascending: false });

      const esc = (s) => s ? `"${String(s).replace(/"/g, '""')}"` : '';
      const lines = [];

      lines.push(`REPORTE DETALLADO DE DISTRIBUIDOR`);
      lines.push(`Distribuidor:,${esc(dist.full_name)}`);
      lines.push(`Empresa:,${esc(dist.company_name || '')}`);
      lines.push(`Cliente:,#${dist.client_number || 'N/A'}`);
      lines.push(`Ciudad:,${esc(dist.city || '')}`);
      lines.push(`Generado:,${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}`);
      lines.push('');

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

      lines.push('═══ DETALLE DE PEDIDOS ═══');
      lines.push('Pedido,Fecha,SKU,Producto,Cantidad,Precio Unit,Subtotal');
      (ordersData || []).forEach(o => {
        const oItems = itemsByOrder[o.id] || [];
        oItems.forEach(item => {
          lines.push(`${o.order_number || 'S/N'},${new Date(o.created_at).toLocaleDateString('es-MX')},${item.products?.sku || ''},${esc(item.products?.name || '')},${item.quantity},${Number(item.unit_price).toFixed(2)},${Number(item.subtotal || item.quantity * item.unit_price).toFixed(2)}`);
        });
      });
      lines.push('');

      if ((receptionsData || []).length > 0) {
        lines.push('═══ CARGOS DE CONTENEDORES ═══');
        lines.push('Operación,Contenedor,Bodega,Fecha,Cargo');
        let totalContainers = 0;
        receptionsData.forEach(r => {
          totalContainers += Number(r.charge_amount || 0);
          lines.push(`${r.operation_number || ''},${esc(r.container_label || '')},${esc(r.warehouse?.name || '')},${formatDateOnly(r.reception_date)},${Number(r.charge_amount || 0).toFixed(2)}`);
        });
        lines.push(`,,,,${totalContainers.toFixed(2)}`);
        lines.push('');
      }

      if (paymentsData.length > 0) {
        lines.push('═══ PAGOS REALIZADOS ═══');
        lines.push('Fecha,Pedido,Monto');
        paymentsData.forEach(p => {
          const ord = (ordersData || []).find(o => o.id === p.order_id);
          lines.push(`${formatDateOnly(p.payment_date)},${ord?.order_number || 'General'},${Number(p.amount).toFixed(2)}`);
        });
        lines.push('');
      }

      const totalCont = (receptionsData || []).reduce((s, r) => s + Number(r.charge_amount || 0), 0);
      lines.push('═══ RESUMEN ═══');
      lines.push(`Total Pedidos:,${totalOrders.toFixed(2)}`);
      lines.push(`Total Contenedores:,${totalCont.toFixed(2)}`);
      lines.push(`Total Facturado:,${(totalOrders + totalCont).toFixed(2)}`);
      lines.push(`Total Pagado:,${totalPaidOrders.toFixed(2)}`);
      lines.push(`SALDO PENDIENTE:,${(totalOrders + totalCont - totalPaidOrders).toFixed(2)}`);

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

  const exportUsersCsv = (usersToExport) => {
    const esc = (s) => s ? `"${String(s).replace(/"/g, '""')}"` : '""';
    const lines = ['ID,Nombre,Empresa,Email,Telefono,Ciudad,Rol,SubRol,N_Cliente,Estado,Fecha_Registro'];
    (usersToExport || []).forEach(u => {
      lines.push([
        u.id,
        esc(u.full_name),
        esc(u.company_name),
        esc(u.email),
        esc(u.phone),
        esc(u.city),
        u.role || '',
        u.sub_role || '',
        esc(u.client_number),
        u.is_active ? 'Activo' : 'Inactivo',
        u.created_at ? new Date(u.created_at).toLocaleDateString('es-MX') : ''
      ].join(','));
    });
    const bom = '\uFEFF';
    const csvStr = bom + lines.join('\n');
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered lists by Role:
  const distributors = users.filter(u => u.role === 'distributor');
  const admins = users.filter(u => u.role === 'admin');

  // Filter helpers
  const filterList = (list) => {
    return list.filter(user => {
      const safeSearch = searchTerm?.toLowerCase() || '';
      const matchesSearch =
        !safeSearch ||
        (user.email && user.email.toLowerCase().includes(safeSearch)) ||
        (user.full_name && user.full_name.toLowerCase().includes(safeSearch)) ||
        (user.company_name && user.company_name.toLowerCase().includes(safeSearch)) ||
        (user.client_number && user.client_number.toLowerCase().includes(safeSearch)) ||
        (user.city && user.city.toLowerCase().includes(safeSearch)) ||
        (user.phone && user.phone.includes(safeSearch));

      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'active' && user.is_active) ||
        (filterStatus === 'inactive' && !user.is_active);

      return matchesSearch && matchesStatus;
    });
  };

  const sortList = (list) => {
    return [...list].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'client_number') {
        const getNum = (val) => {
          if (!val) return 0;
          const match = String(val).match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        };
        aValue = getNum(a.client_number);
        bValue = getNum(b.client_number);
      } else if (sortConfig.key === 'client') {
        aValue = (a.full_name || a.email || '').toLowerCase();
        bValue = (b.full_name || b.email || '').toLowerCase();
      }

      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filteredDistributors = sortList(filterList(distributors));
  const filteredAdmins = sortList(filterList(admins));

  // CxC Filter & Sort
  const filteredCxc = cxcData.filter(d => {
    const s = cxcSearch.toLowerCase();
    return !s ||
      (d.full_name && d.full_name.toLowerCase().includes(s)) ||
      (d.email && d.email.toLowerCase().includes(s)) ||
      (d.company_name && d.company_name.toLowerCase().includes(s)) ||
      (d.client_number && d.client_number.toLowerCase().includes(s)) ||
      (d.city && d.city.toLowerCase().includes(s));
  }).sort((a, b) => {
    const dir = cxcSort.dir === 'desc' ? -1 : 1;
    if (cxcSort.key === 'balance') return (a.balance - b.balance) * dir;
    if (cxcSort.key === 'totalFacturado') return (a.totalFacturado - b.totalFacturado) * dir;
    if (cxcSort.key === 'totalPagado') return (a.totalPagado - b.totalPagado) * dir;
    return 0;
  });

  const totalGlobalFacturado = cxcData.reduce((sum, d) => sum + d.totalFacturado, 0);
  const totalGlobalPagado = cxcData.reduce((sum, d) => sum + d.totalPagado, 0);
  const totalGlobalBalance = cxcData.reduce((sum, d) => sum + d.balance, 0);

  const getInitials = (user) => {
    if (user.full_name) {
      const parts = user.full_name.split(' ');
      return parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : parts[0].substring(0, 2).toUpperCase();
    }
    return user.email ? user.email.substring(0, 2).toUpperCase() : '??';
  };

  return {
    supabase,
    activeTab, setActiveTab,
    users, loading, searchTerm, setSearchTerm,
    filterStatus, setFilterStatus,
    distributors, admins,
    filteredDistributors, filteredAdmins,
    selectedUser, setSelectedUser, isModalOpen, setIsModalOpen, updating,
    selectedUsers, setSelectedUsers, sortConfig, handleSort,
    deleteModal, setDeleteModal, confirmDelete,
    badgeUser, setBadgeUser, showEditBadgeTexts, setShowEditBadgeTexts,
    badgeSettings, setBadgeSettings, downloadingFront, downloadingBack, downloadBadgeImage,
    showNewCollab, setShowNewCollab, newCollab, setNewCollab, creatingCollab, handleCreateCollaborator,
    currentUserSubRole, unauthorized,
    cxcData, cxcLoading, cxcSearch, setCxcSearch, cxcSort, setCxcSort, filteredCxc,
    totalGlobalFacturado, totalGlobalPagado, totalGlobalBalance,
    exportingReport, exportDistributorReport, exportUsersCsv,
    expandedUserId, setExpandedUserId, addressCache, addressLoading, toggleAddressDrawer,
    allWarehouses, handleEditClick, handleSaveUser, handleSelectAll, handleSelectUser,
    handleDeleteSelected, handleDeleteSingle, getInitials, fetchUsers, fetchCxC
  };
}

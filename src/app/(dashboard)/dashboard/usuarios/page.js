'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Search, Filter, Edit2, Shield, AlertCircle, X, Save, UserPlus, Trash2, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export default function UsersPage() {
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

  const supabase = createClient();

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setUsers(data);
    setLoading(false);
  };

  const handleEditClick = (user) => {
    setSelectedUser({ ...user });
    setIsModalOpen(true);
  };

  const handleSaveUser = async () => {
    setUpdating(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        role: selectedUser.role,
        is_active: selectedUser.is_active,
        full_name: selectedUser.full_name,
        city: selectedUser.city,
        phone: selectedUser.phone,
      })
      .eq('id', selectedUser.id);

    if (error) {
      alert('Error updating user: ' + error.message);
    } else {
      setUsers(users.map(u => (u.id === selectedUser.id ? selectedUser : u)));
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
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#ec5b13]" /> : <ArrowDown className="w-3 h-3 text-[#ec5b13]" />;
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
      const { error } = await supabase.from('profiles').delete().in('id', selectedUsers);
      if (error) {
        alert('Error eliminando usuarios: ' + error.message);
      } else {
        setUsers(users.filter(u => !selectedUsers.includes(u.id)));
        setSelectedUsers([]);
      }
    } else {
      const { error } = await supabase.from('profiles').delete().eq('id', deleteModal.targetId);
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
    const headers = ['ID', 'Nombre', 'Email', 'Ciudad', 'Telefono', 'Rol', 'Status', 'Fecha Registro'];
    const csvContent = [
      headers.join(','),
      ...usersToExport.map(u => [
        u.id,
        `"${userExportStr(u.full_name)}"`,
        `"${userExportStr(u.email)}"`,
        `"${userExportStr(u.city)}"`,
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

  const filteredUsers = users.filter(user => {
    const safeSearch = searchTerm?.toLowerCase() || '';
    const matchesSearch =
      (user.email && user.email.toLowerCase().includes(safeSearch)) ||
      (user.full_name && user.full_name.toLowerCase().includes(safeSearch));
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
  const totalRevenue = '$240.5k'; // Placeholder – connect to real data if available

  const getInitials = (user) => {
    if (user.full_name) {
      const parts = user.full_name.split(' ');
      return parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : parts[0].substring(0, 2).toUpperCase();
    }
    return user.email ? user.email.substring(0, 2).toUpperCase() : '??';
  };

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
            <Download className="w-4 h-4 text-[#ec5b13]" /> Exportar CSV
          </button>
        </div>
      </header>

      {/* Filters & Search */}
      <section className="bg-white/60 backdrop-blur-md shadow-sm border border-white/50 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              className="w-full pl-11 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ec5b13]/30 focus:border-[#ec5b13] text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-sm"
              placeholder="Buscar por nombre, empresa o correo..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="bg-white/50 border border-slate-200 rounded-xl py-3 pl-4 pr-10 focus:ring-2 focus:ring-[#ec5b13]/30 text-sm font-medium text-slate-700 outline-none shadow-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos los Status</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
          <select
            className="bg-white/50 border border-slate-200 rounded-xl py-3 pl-4 pr-10 focus:ring-2 focus:ring-[#ec5b13]/30 text-sm font-medium text-slate-700 outline-none shadow-sm"
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
                      className="w-4 h-4 rounded border-slate-300 text-[#ec5b13] focus:ring-[#ec5b13] cursor-pointer accent-[#ec5b13]"
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
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-[#ec5b13] rounded-full animate-spin"></div>
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
                sortedUsers.map((user, idx) => (
                  <tr key={user.id} className="hover:bg-white/40 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-[#ec5b13] focus:ring-[#ec5b13] cursor-pointer accent-[#ec5b13]"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-mono text-slate-400">#{String(idx + 1).padStart(4, '0')}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${user.is_active ? 'bg-[#6a9a04]/20 text-[#6a9a04]' : 'bg-slate-200 text-slate-500'}`}>
                          {getInitials(user)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-[#6a9a04] transition-colors m-0">{user.full_name || 'Sin nombre'}</p>
                          <p className="text-xs text-slate-500 m-0">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600">{user.city || '—'}</td>
                    <td className="px-6 py-5 text-sm text-slate-600">{user.phone || '—'}</td>
                    <td className="px-6 py-5 text-sm">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-[#ec5b13]/10 text-[#ec5b13]' : 'bg-[#6a9a04]/10 text-[#6a9a04]'}`}>
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
                        <button
                          className="p-2 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-slate-200 bg-transparent cursor-pointer shadow-sm hover:shadow-sm"
                          onClick={() => handleEditClick(user)}
                          title="Editar Usuario"
                        >
                          <Edit2 className="w-4 h-4 text-slate-500 hover:text-[#ec5b13]" />
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
                ))
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
          <div className="w-12 h-12 rounded-xl bg-[#ec5b13]/10 flex items-center justify-center text-[#ec5b13]">
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
          <div className="bg-white/90 backdrop-blur-xl border border-white max-w-[500px] w-full rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200/50 flex justify-between items-center bg-white/50">
              <h3 className="text-lg font-bold text-slate-900 m-0">Editar Cliente</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 bg-transparent border border-transparent transition-colors cursor-pointer text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nombre Completo</label>
                <input type="text" value={selectedUser.full_name || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ec5b13]/30 focus:border-[#ec5b13] text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Correo Electrónico</label>
                <input type="text" value={selectedUser.email} disabled
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Ciudad</label>
                  <input type="text" value={selectedUser.city || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, city: e.target.value })}
                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ec5b13]/30 focus:border-[#ec5b13] text-slate-800 outline-none"
                    placeholder="Ej. Monterrey, NL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Teléfono</label>
                  <input type="tel" value={selectedUser.phone || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ec5b13]/30 focus:border-[#ec5b13] text-slate-800 outline-none"
                    placeholder="81 1234 5678"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Rol</label>
                  <select
                    value={selectedUser.role}
                    onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ec5b13]/30 focus:border-[#ec5b13] text-slate-800 outline-none"
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
                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ec5b13]/30 focus:border-[#ec5b13] text-slate-800 outline-none"
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} disabled={updating}
                className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white/50 border border-slate-200 hover:bg-white cursor-pointer transition-all"
              >Cancelar</button>
              <button onClick={handleSaveUser} disabled={updating}
                className="px-5 py-2.5 rounded-xl text-white font-bold bg-[#ec5b13] hover:bg-[#ec5b13]/90 shadow-lg shadow-[#ec5b13]/20 cursor-pointer transition-all flex items-center gap-2 border-none"
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
              <button
                onClick={() => setDeleteModal({ isOpen: false, isBulk: false, targetId: null })}
                disabled={loading}
                className="px-6 py-3 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={executeDelete}
                disabled={loading}
                className="px-6 py-3 rounded-xl text-white font-bold bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 cursor-pointer transition-all border-none flex-1"
              >
                {loading ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

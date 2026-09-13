'use client';
import React from 'react';
import { Search, Edit2, Shield, Trash2, ArrowUpDown, ArrowUp, ArrowDown, UserPlus, Download, CreditCard, Warehouse, KeyRound } from 'lucide-react';
import { formatDateOnly } from '@/utils/formatters';

export default function AdminsTab({
  admins = [],
  filteredAdmins = [],
  loading = false,
  searchTerm = '',
  setSearchTerm,
  filterStatus = 'all',
  setFilterStatus,
  sortConfig = { key: 'created_at', direction: 'desc' },
  handleSort,
  selectedUsers = [],
  handleSelectAll,
  handleSelectUser,
  handleDeleteSelected,
  handleEditClick,
  handleDeleteSingle,
  setBadgeUser,
  setShowNewCollab,
  exportUsersCsv,
  allWarehouses = [],
  getInitials
}) {
  const isAllSelected = filteredAdmins.length > 0 && filteredAdmins.every(u => selectedUsers.includes(u.id));

  const getSubRoleBadge = (subRole) => {
    switch (subRole) {
      case 'super_admin':
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 shadow-sm">
            <Shield size={12} />
            Super Admin
          </span>
        );
      case 'warehouse_admin':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
            <Warehouse size={12} />
            Admin Bodega
          </span>
        );
      case 'accountant':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
            Contabilidad
          </span>
        );
      case 'viewer':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
            Solo Lectura
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre, correo o cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#6a9a04]/20 focus:border-[#6a9a04] transition-all"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6a9a04]/20 transition-all"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Solo Activos</option>
            <option value="inactive">Solo Inactivos</option>
          </select>

          {/* Export CSV */}
          <button
            onClick={() => exportUsersCsv(filteredAdmins)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-200/80"
          >
            <Download size={14} />
            Exportar CSV
          </button>

          {/* New Collaborator */}
          <button
            onClick={() => setShowNewCollab(true)}
            className="px-4 py-2 bg-[#6a9a04] hover:bg-[#588003] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-[#6a9a04]/20 cursor-pointer transition-all active:scale-95"
          >
            <UserPlus size={15} />
            Nuevo Colaborador
          </button>
        </div>
      </div>

      {/* Batch Actions Bar */}
      {selectedUsers.length > 0 && (
        <div className="bg-[#6a9a04]/10 border border-[#6a9a04]/30 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
          <span className="font-semibold text-slate-800">
            {selectedUsers.length} administrador(es) seleccionado(s)
          </span>
          <button
            onClick={handleDeleteSelected}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Trash2 size={13} />
            Eliminar Selección
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked, filteredAdmins)}
                    className="rounded border-slate-300 text-[#6a9a04] focus:ring-[#6a9a04] cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('client')}>
                  <div className="flex items-center gap-1">
                    Administrador / Colaborador
                    {sortConfig.key === 'client' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : <ArrowUpDown size={13} className="text-slate-300" />}
                  </div>
                </th>
                <th className="px-4 py-3">Cargo / Nivel de Acceso</th>
                <th className="px-4 py-3">Bodega Asignada</th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('created_at')}>
                  <div className="flex items-center gap-1">
                    Fecha Alta
                    {sortConfig.key === 'created_at' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : <ArrowUpDown size={13} className="text-slate-300" />}
                  </div>
                </th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Cargando equipo de administración...
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No se encontraron colaboradores administradores con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((user) => {
                  const isSelected = selectedUsers.includes(user.id);
                  const assignedWh = allWarehouses.find(w => w.id === user.assigned_warehouse_id);

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-[#6a9a04]/5' : ''}`}
                    >
                      {/* Select Checkbox */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                          className="rounded border-slate-300 text-[#6a9a04] focus:ring-[#6a9a04] cursor-pointer"
                        />
                      </td>

                      {/* Admin Info */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                            {getInitials(user)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 m-0">{user.full_name || 'Sin nombre'}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-slate-500 text-[11px] m-0">{user.email}</span>
                              {user.job_title && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  • {user.job_title}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Sub-role */}
                      <td className="px-4 py-4">
                        {getSubRoleBadge(user.sub_role)}
                      </td>

                      {/* Warehouse */}
                      <td className="px-4 py-4">
                        {assignedWh ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                            <Warehouse size={12} />
                            {assignedWh.name.replace('Bodega ', '')}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-normal">Acceso Global</span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="px-4 py-4 text-xs text-slate-500">
                        {user.created_at ? formatDateOnly(user.created_at) : '—'}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          user.is_active
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Credencial PVC Gafete Button - ONLY FOR ADMINS */}
                          <button
                            onClick={() => setBadgeUser(user)}
                            className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 cursor-pointer transition-colors flex items-center gap-1 text-xs font-semibold"
                            title="Generar Credencial / Gafete PVC"
                          >
                            <CreditCard size={14} />
                            <span>Gafete PVC</span>
                          </button>

                          {/* Edit User */}
                          <button
                            onClick={() => handleEditClick(user)}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer transition-colors"
                            title="Editar Perfil"
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Delete User */}
                          <button
                            onClick={() => handleDeleteSingle(user.id)}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer transition-colors"
                            title="Eliminar Administrador"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

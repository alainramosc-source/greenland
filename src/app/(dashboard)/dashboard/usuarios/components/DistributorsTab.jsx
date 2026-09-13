'use client';
import React from 'react';
import { Search, Filter, Edit2, Trash2, MapPin, ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown, Building2, User, Phone, CheckCircle, AlertCircle, Warehouse, Loader2 } from 'lucide-react';
import { formatDateOnly } from '@/utils/formatters';

export default function DistributorsTab({
  distributors = [],
  filteredDistributors = [],
  loading = false,
  searchTerm = '',
  setSearchTerm,
  filterStatus = 'all',
  setFilterStatus,
  sortConfig = { key: 'client_number', direction: 'desc' },
  handleSort,
  selectedUsers = [],
  handleSelectAll,
  handleSelectUser,
  handleDeleteSelected,
  handleEditClick,
  handleDeleteSingle,
  exportUsersCsv,
  expandedUserId,
  toggleAddressDrawer,
  addressCache = {},
  addressLoading = false,
  allWarehouses = [],
  getInitials
}) {
  const isAllSelected = filteredDistributors.length > 0 && filteredDistributors.every(u => selectedUsers.includes(u.id));

  return (
    <div className="space-y-4">
      {/* Search & Filters Bar */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre, correo, empresa, # cliente, ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#6a9a04]/20 focus:border-[#6a9a04] transition-all"
          />
        </div>

        {/* Filters & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Filter size={13} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">Estado:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Solo Activos</option>
              <option value="inactive">Solo Inactivos</option>
            </select>
          </div>

          {/* Export CSV */}
          <button
            onClick={() => exportUsersCsv(filteredDistributors)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-200/80"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Batch Actions Bar */}
      {selectedUsers.length > 0 && (
        <div className="bg-[#6a9a04]/10 border border-[#6a9a04]/30 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
          <span className="font-semibold text-slate-800">
            {selectedUsers.length} distribuidor(es) seleccionado(s)
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
                    onChange={(e) => handleSelectAll(e.target.checked, filteredDistributors)}
                    className="rounded border-slate-300 text-[#6a9a04] focus:ring-[#6a9a04] cursor-pointer"
                  />
                </th>

                {/* Column 1: Nº CLIENTE / ID (Sortable descending by default) */}
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors"
                  onClick={() => handleSort('client_number')}
                >
                  <div className="flex items-center gap-1">
                    Nº Cliente / ID
                    {sortConfig.key === 'client_number' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-[#6a9a04]" /> : <ArrowDown size={13} className="text-[#6a9a04]" />
                    ) : <ArrowUpDown size={13} className="text-slate-300" />}
                  </div>
                </th>

                {/* Column 2: CLIENTE / DISTRIBUIDOR */}
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors"
                  onClick={() => handleSort('client')}
                >
                  <div className="flex items-center gap-1">
                    Cliente / Distribuidor
                    {sortConfig.key === 'client' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : <ArrowUpDown size={13} className="text-slate-300" />}
                  </div>
                </th>

                {/* Column 3: CIUDAD / TELÉFONO */}
                <th className="px-4 py-3">Ciudad / Teléfono</th>

                {/* Column 4: BODEGA ASIGNADA */}
                <th className="px-4 py-3">Bodega Asignada</th>

                {/* Column 5: FECHA REGISTRO */}
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    Fecha Registro
                    {sortConfig.key === 'created_at' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : <ArrowUpDown size={13} className="text-slate-300" />}
                  </div>
                </th>

                {/* Column 6: ESTADO */}
                <th className="px-4 py-3">Estado</th>

                {/* Column 7: ACCIONES */}
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Cargando distribuidores...
                  </td>
                </tr>
              ) : filteredDistributors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No se encontraron distribuidores con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredDistributors.map((user) => {
                  const isSelected = selectedUsers.includes(user.id);
                  const isExpanded = expandedUserId === user.id;
                  const userAddresses = addressCache[user.id] || [];
                  const assignedWh = allWarehouses.find(w => w.id === user.assigned_warehouse_id);

                  const displayClientNum = user.client_number
                    ? (user.client_number.startsWith('#') ? user.client_number : `#DIST-${String(user.client_number).replace(/[^0-9]/g, '').padStart(3, '0')}`)
                    : '—';

                  return (
                    <React.Fragment key={user.id}>
                      <tr className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-[#6a9a04]/5' : ''}`}>
                        {/* Checkbox */}
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                            className="rounded border-slate-300 text-[#6a9a04] focus:ring-[#6a9a04] cursor-pointer"
                          />
                        </td>

                        {/* Column 1: Nº CLIENTE / ID */}
                        <td className="px-4 py-4">
                          <span className="inline-block font-mono text-[11px] font-bold text-[#6a9a04] bg-[#6a9a04]/10 px-2 py-0.5 rounded-md border border-[#6a9a04]/20 shadow-xs">
                            {displayClientNum}
                          </span>
                        </td>

                        {/* Column 2: CLIENTE / DISTRIBUIDOR */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#6a9a04] to-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0">
                              {getInitials(user)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 m-0">{user.full_name || 'Sin nombre'}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-slate-500 text-[11px] m-0">{user.email}</span>
                                {user.company_name && (
                                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                                    {user.company_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Column 3: CIUDAD / TELÉFONO */}
                        <td className="px-4 py-4 text-xs text-slate-600">
                          <p className="font-semibold text-slate-800 m-0">{user.city || '—'}</p>
                          {user.phone && <p className="text-[11px] text-slate-400 m-0">{user.phone}</p>}
                        </td>

                        {/* Column 4: BODEGA ASIGNADA */}
                        <td className="px-4 py-4">
                          {assignedWh ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                              <Warehouse size={12} />
                              {assignedWh.name.replace('Bodega ', '')}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-normal">Todas / General</span>
                          )}
                        </td>

                        {/* Column 5: FECHA REGISTRO */}
                        <td className="px-4 py-4 text-xs text-slate-500">
                          {user.created_at ? formatDateOnly(user.created_at) : '—'}
                        </td>

                        {/* Column 6: ESTADO */}
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

                        {/* Column 7: ACCIONES */}
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => toggleAddressDrawer(user.id)}
                              className={`p-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                                isExpanded
                                  ? 'bg-[#6a9a04] text-white border-[#6a9a04]'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                              title="Ver Direcciones Registradas"
                            >
                              <MapPin size={14} />
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>

                            <button
                              onClick={() => handleEditClick(user)}
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer transition-colors"
                              title="Editar Perfil"
                            >
                              <Edit2 size={14} />
                            </button>

                            <button
                              onClick={() => handleDeleteSingle(user.id)}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer transition-colors"
                              title="Eliminar Distribuidor"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Address Drawer */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="bg-slate-50/80 p-4 border-b border-slate-200">
                            <div className="space-y-3 max-w-4xl mx-auto">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5 m-0">
                                  <MapPin size={14} className="text-[#6a9a04]" />
                                  Direcciones Registradas ({userAddresses.length})
                                </h4>
                              </div>

                              {addressLoading && userAddresses.length === 0 ? (
                                <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                                  <Loader2 size={14} className="animate-spin text-[#6a9a04]" />
                                  <span>Cargando direcciones...</span>
                                </div>
                              ) : userAddresses.length === 0 ? (
                                <p className="text-xs text-slate-400 italic m-0 py-1">
                                  No hay direcciones registradas para este cliente.
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {userAddresses.map((addr) => (
                                    <div
                                      key={addr.id}
                                      className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs space-y-1 relative"
                                    >
                                      {addr.is_default && (
                                        <span className="absolute top-2 right-2 bg-green-100 text-green-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                                          Predeterminada
                                        </span>
                                      )}
                                      <p className="font-bold text-slate-800 m-0">
                                        {addr.title || addr.recipient_name || 'Dirección de Entrega'}
                                      </p>
                                      <p className="text-slate-600 m-0">
                                        {addr.street} {addr.exterior_number} {addr.interior_number ? `Int ${addr.interior_number}` : ''}
                                      </p>
                                      <p className="text-slate-500 m-0">
                                        Col. {addr.neighborhood || '—'}, {addr.city}, {addr.state} CP {addr.postal_code}
                                      </p>
                                      {addr.phone && (
                                        <p className="text-slate-400 text-[11px] m-0">
                                          📞 Tel: {addr.phone}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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

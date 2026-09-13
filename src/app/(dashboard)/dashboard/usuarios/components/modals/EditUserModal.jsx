'use client';
import React from 'react';
import { X, Save, AlertCircle, Loader2, Shield, Warehouse, CreditCard, KeyRound } from 'lucide-react';

export default function EditUserModal({
  isOpen,
  onClose,
  selectedUser,
  setSelectedUser,
  handleSaveUser,
  updating,
  allWarehouses = [],
  allUsers = []
}) {
  if (!isOpen || !selectedUser) return null;

  const isAdmin = selectedUser.role === 'admin';
  const isDistributor = selectedUser.role === 'distributor';
  const proDistributors = allUsers.filter(u => u.role === 'distributor' && u.sub_role === 'distributor_pro' && u.id !== selectedUser.id);

  const generateBarcode = () => {
    if (selectedUser.employee_barcode) {
      if (!confirm('Este colaborador ya tiene asignado el código de empleado ' + selectedUser.employee_barcode + '. ¿Desea regenerarlo por uno nuevo?')) {
        return;
      }
    }
    const rand = Math.floor(100000 + Math.random() * 900000);
    setSelectedUser({ ...selectedUser, employee_barcode: `EMP-${rand}` });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 m-0">
              {isAdmin ? '👤 Editar Colaborador / Empleado' : '🏢 Editar Cliente'}
            </h3>
            <p className="text-xs text-slate-500 m-0">Actualice la información y permisos del perfil</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4 text-xs">
          {/* Full Name */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nombre Completo</label>
            <input
              type="text"
              value={selectedUser.full_name || ''}
              onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6a9a04]/20 focus:border-[#6a9a04] outline-none"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Correo Electrónico</label>
            <input
              type="email"
              value={selectedUser.email || ''}
              disabled
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
            />
          </div>

          {/* Company Name */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nombre de la Empresa</label>
            <input
              type="text"
              placeholder="Ej. Mi Empresa S.A."
              value={selectedUser.company_name || ''}
              onChange={(e) => setSelectedUser({ ...selectedUser, company_name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6a9a04]/20 focus:border-[#6a9a04] outline-none"
            />
          </div>

          {/* City & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Ciudad</label>
              <input
                type="text"
                value={selectedUser.city || ''}
                onChange={(e) => setSelectedUser({ ...selectedUser, city: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6a9a04]/20 focus:border-[#6a9a04] outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Teléfono</label>
              <input
                type="text"
                value={selectedUser.phone || ''}
                onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6a9a04]/20 focus:border-[#6a9a04] outline-none"
              />
            </div>
          </div>

          {/* Address / Domicilio */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Domicilio</label>
            <input
              type="text"
              placeholder="Ej. Carretera Tampico-Mante km 14.5, Ejido Miramar..."
              value={selectedUser.address || ''}
              onChange={(e) => setSelectedUser({ ...selectedUser, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6a9a04]/20 focus:border-[#6a9a04] outline-none"
            />
          </div>

          {/* Role & Status (Label: Estado) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Rol de Usuario</label>
              <select
                value={selectedUser.role || 'distributor'}
                onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6a9a04]/20 focus:border-[#6a9a04] outline-none font-medium"
              >
                <option value="distributor">Distribuidor / Cliente</option>
                <option value="admin">Administrador / Empleado</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Estado</label>
              <select
                value={selectedUser.is_active ? 'true' : 'false'}
                onChange={(e) => setSelectedUser({ ...selectedUser, is_active: e.target.value === 'true' })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6a9a04]/20 focus:border-[#6a9a04] outline-none font-medium"
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          </div>

          {/* Specific ADMIN Fields */}
          {isAdmin && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              {/* Sub-Role Admin */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Sub-Rol Admin</label>
                <select
                  value={selectedUser.sub_role || 'viewer'}
                  onChange={(e) => setSelectedUser({ ...selectedUser, sub_role: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 focus:border-[#6a9a04] outline-none font-medium text-slate-800"
                >
                  <option value="super_admin">Super Admin (acceso total y autorizaciones)</option>
                  <option value="warehouse_admin">Admin Bodega (inventarios y mostrador)</option>
                  <option value="accountant">Contabilidad (pagos/precios)</option>
                  <option value="viewer">Solo Lectura</option>
                </select>
              </div>

              {/* Job Title / Cargo Laboral */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">💼 Puesto / Cargo Laboral</label>
                <input
                  type="text"
                  placeholder="Ej. Operario de Bodega / Director Operativo / Ventas Mostrador"
                  value={selectedUser.job_title || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, job_title: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/20 focus:border-[#6a9a04] outline-none"
                />
              </div>

              {/* PIN & Barcode Grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">🔢 PIN Autorización Signer</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Ej. 1928"
                    value={selectedUser.authorization_pin || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, authorization_pin: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-center outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">🏷️ Código Barras</label>
                    {!selectedUser.employee_barcode && (
                      <button
                        type="button"
                        onClick={generateBarcode}
                        className="text-[10px] font-bold text-[#6a9a04] hover:underline bg-transparent border-none cursor-pointer"
                      >
                        ⚡ Generar
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Ej. EMP-477249"
                    value={selectedUser.employee_barcode || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, employee_barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-center outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Specific DISTRIBUTOR Fields */}
          {isDistributor && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              {/* Tipo Distribuidor & Línea de Producto Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo Distribuidor</label>
                  <select
                    value={selectedUser.sub_role || 'distributor_standard'}
                    onChange={(e) => setSelectedUser({ ...selectedUser, sub_role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6a9a04]/20 focus:border-[#6a9a04] outline-none font-medium"
                  >
                    <option value="distributor_standard">Distribuidor Estándar</option>
                    <option value="distributor_pro">Distribuidor PRO (gestión de almacén)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Línea de Producto</label>
                  <select
                    value={selectedUser.product_segment || 'mobiliario'}
                    onChange={(e) => setSelectedUser({ ...selectedUser, product_segment: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6a9a04]/20 focus:border-[#6a9a04] outline-none font-medium"
                  >
                    <option value="mobiliario">🪑 Mobiliario</option>
                    <option value="deco">🏠 Deco (Revestimientos)</option>
                  </select>
                </div>
              </div>

              {selectedUser.sub_role !== 'distributor_pro' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Asignar a PRO (Padre)</label>
                  <select
                    value={selectedUser.parent_distributor_id || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, parent_distributor_id: e.target.value || null })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6a9a04]/20 focus:border-[#6a9a04] outline-none font-medium"
                  >
                    <option value="">Sin asignar (directo a Greenland)</option>
                    {proDistributors.map((pro) => (
                      <option key={pro.id} value={pro.id}>🏢 {pro.full_name || pro.email} {pro.city ? `— ${pro.city}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedUser.sub_role === 'distributor_pro' && (
                <div className="bg-purple-50 p-3.5 rounded-2xl border border-purple-200 space-y-1.5">
                  <label className="block font-bold text-purple-800 uppercase tracking-wider text-[11px]">
                    🏭 ALMACÉN ASIGNADO (COBERTURA)
                  </label>
                  <select
                    value={selectedUser.assigned_warehouse_id || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, assigned_warehouse_id: e.target.value || null })}
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none font-semibold text-slate-800"
                  >
                    <option value="">Sin almacén asignado</option>
                    {allWarehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-purple-600 m-0 italic">
                    El distribuidor PRO verá la cobertura de este almacén en su portal
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveUser}
            disabled={updating}
            className="px-5 py-2 bg-[#6a9a04] hover:bg-[#588003] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-[#6a9a04]/20 cursor-pointer transition-all disabled:opacity-50"
          >
            {updating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

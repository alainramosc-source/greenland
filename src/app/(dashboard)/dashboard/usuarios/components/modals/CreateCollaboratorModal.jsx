'use client';
import React from 'react';
import { X, UserPlus, Loader2, Shield } from 'lucide-react';

export default function CreateCollaboratorModal({
  isOpen,
  onClose,
  newCollab,
  setNewCollab,
  handleCreateCollaborator,
  creatingCollab
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Shield size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">Registrar Colaborador</h3>
              <p className="text-xs text-slate-500 m-0">Crear nuevo usuario para el equipo de administración</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nombre Completo</label>
            <input
              type="text"
              placeholder="Ej. Maria Guadalupe Ramirez"
              value={newCollab.full_name}
              onChange={(e) => setNewCollab({ ...newCollab, full_name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Correo Electrónico</label>
            <input
              type="email"
              placeholder="colaborador@greenland-products.com.mx"
              value={newCollab.email}
              onChange={(e) => setNewCollab({ ...newCollab, email: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Contraseña Provisional</label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={newCollab.password}
              onChange={(e) => setNewCollab({ ...newCollab, password: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Sub-Rol Admin</label>
            <select
              value={newCollab.sub_role || 'viewer'}
              onChange={(e) => setNewCollab({ ...newCollab, sub_role: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none font-medium"
            >
              <option value="super_admin">Super Admin (acceso total)</option>
              <option value="warehouse_admin">Admin Bodega (inventarios)</option>
              <option value="accountant">Contabilidad (pagos/precios)</option>
              <option value="viewer">Solo Lectura</option>
            </select>
          </div>
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
            onClick={handleCreateCollaborator}
            disabled={creatingCollab}
            className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-purple-700/20 cursor-pointer transition-all disabled:opacity-50"
          >
            {creatingCollab ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Creando cuenta...</span>
              </>
            ) : (
              <>
                <UserPlus size={14} />
                <span>Crear Colaborador</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

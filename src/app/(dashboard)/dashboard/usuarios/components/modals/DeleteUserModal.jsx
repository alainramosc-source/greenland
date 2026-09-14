'use client';
import React from 'react';
import { AlertCircle, X, Trash2 } from 'lucide-react';

export default function DeleteUserModal({
  deleteModal,
  setDeleteModal,
  confirmDelete,
  selectedUsersCount = 0
}) {
  if (!deleteModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle size={20} />
            <h3 className="text-base font-bold text-slate-900 m-0">Confirmar Eliminación</h3>
          </div>
          <button
            onClick={() => setDeleteModal({ isOpen: false, isBulk: false, targetId: null })}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message */}
        <p className="text-xs text-slate-600 leading-relaxed m-0">
          {deleteModal.isBulk ? (
            <>
              ¿Está seguro de que desea eliminar permanentemente los <strong className="text-slate-900">{selectedUsersCount} usuarios seleccionados</strong>? Esta acción no se puede deshacer.
            </>
          ) : (
            <>
              ¿Está seguro de que desea eliminar este usuario? La información de la cuenta y sus accesos serán revocados permanentemente.
            </>
          )}
        </p>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => setDeleteModal({ isOpen: false, isBulk: false, targetId: null })}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={confirmDelete}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer transition-all"
          >
            <Trash2 size={14} />
            <span>Eliminar Definitivamente</span>
          </button>
        </div>
      </div>
    </div>
  );
}

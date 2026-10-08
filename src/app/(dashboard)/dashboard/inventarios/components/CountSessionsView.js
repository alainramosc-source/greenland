'use client';

import React, { useState } from 'react';
import { ClipboardList, Plus, Search, Calendar, User, Warehouse, ChevronRight, X, Loader2, Lock } from 'lucide-react';
import Link from 'next/link';

const STATUS_LABELS = {
  draft: { label: 'Borrador', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  in_progress: { label: 'En Progreso', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  submitted: { label: 'Enviado', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  approved: { label: 'Aprobado', color: '#6a9a04', bg: '#ecfccb', border: '#d9f99d' },
  posted: { label: 'Aplicado', color: '#059669', bg: '#d1fae5', border: '#a7f3d0' },
  applied: { label: 'Aplicado', color: '#059669', bg: '#d1fae5', border: '#a7f3d0' },
  cancelled: { label: 'Cancelado', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
};

export default function CountSessionsView({
  sessions = [],
  warehouses = [],
  onCreateSession,
  loading = false
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter(s => {
    const query = searchQuery.toLowerCase();
    const whName = (s.warehouse?.name || s.warehouses?.name || '').toLowerCase();
    const notes = (s.notes || '').toLowerCase();
    const code = (s.session_code || s.id || '').toLowerCase();
    const resp = (s.responsible?.full_name || '').toLowerCase();
    return whName.includes(query) || notes.includes(query) || code.includes(query) || resp.includes(query);
  });

  const handleStartSessionSubmit = (e) => {
    e.preventDefault();
    if (!selectedWarehouse) return;
    onCreateSession({
      warehouseId: selectedWarehouse,
      notes: sessionNotes
    });
    setShowCreateModal(false);
    setSelectedWarehouse('');
    setSessionNotes('');
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar sesión de conteo por bodega, folio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm"
          />
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#6a9a04] hover:bg-[#6a9a04]/90 text-white text-sm font-bold rounded-xl border-none cursor-pointer transition-all shadow-lg shadow-[#6a9a04]/20 shrink-0"
        >
          <Plus size={16} /> Nuevo Conteo
        </button>
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-12 text-center">
          <ClipboardList size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-lg font-bold text-slate-400">Sin sesiones de conteo</p>
          <p className="text-sm text-slate-400 mt-1">Crea tu primera sesión de conteo para iniciar.</p>
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-xl rounded-2xl overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredSessions.map((session) => {
              const rawStatus = (session.status || 'draft').toLowerCase();
              const st = STATUS_LABELS[rawStatus] || STATUS_LABELS.draft;
              const whName = session.warehouse?.name || session.warehouses?.name || 'Bodega N/A';
              const respName = session.responsible?.full_name || 'Sin responsable';
              const code = session.session_code || `CNT-${session.id.slice(0, 6).toUpperCase()}`;

              return (
                <Link
                  key={session.id}
                  href={`/dashboard/inventarios/conteo/${session.id}`}
                  className="px-6 py-5 flex items-center gap-4 hover:bg-white/50 transition-colors cursor-pointer group no-underline"
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: st.bg }}>
                    <ClipboardList size={20} style={{ color: st.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 m-0">{code}</p>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border" style={{ background: st.bg, color: st.color, borderColor: st.border }}>
                        {st.label}
                      </span>
                      {session.freeze_inventory && <Lock size={12} className="text-amber-500" title="Inventario congelado" />}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-1.5">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Warehouse size={13} className="text-slate-400" /> {whName}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <User size={13} className="text-slate-400" /> {respName}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar size={13} className="text-slate-400" />
                        {new Date(session.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-[#6a9a04] transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Nueva Sesión */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-base m-0">Iniciar Nueva Sesión de Conteo</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleStartSessionSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Bodega a Auditar *
                </label>
                <select
                  required
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
                >
                  <option value="">Selecciona una bodega...</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name || wh.codigo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notas / Motivo de Auditoría
                </label>
                <textarea
                  rows="2"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Ej: Conteo mensual de cierre de mes..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-[#6a9a04]/20"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border-none cursor-pointer bg-transparent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#6a9a04] hover:bg-[#6a9a04]/90 rounded-xl shadow-lg shadow-[#6a9a04]/20 border-none cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Crear Sesión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

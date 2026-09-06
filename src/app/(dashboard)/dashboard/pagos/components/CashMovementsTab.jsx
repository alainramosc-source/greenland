'use client';
import { useState } from 'react';
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, DollarSign, Calendar, RefreshCw,
  Plus, Minus, FileSpreadsheet, Download, Search, CheckCircle2, AlertTriangle,
  Edit, Edit3, Check, X, UserCheck, PenTool, Loader2, ClipboardCheck, Scale, AlertCircle, ShieldCheck
} from 'lucide-react';
import { formatDateOnly } from '@/utils/formatters';

export default function CashMovementsTab({
  cashMovements = [],
  loading = false,
  onRefresh,
  cajaDateFrom, setCajaDateFrom,
  cajaDateTo, setCajaDateTo,
  cajaSubTab, setCajaSubTab,
  dailySearchTerm, setDailySearchTerm,
  showEntryModal, setShowEntryModal, entryForm, setEntryForm, entrySubmitting, onRegisterEntry,
  showExitModal, setShowExitModal, exitForm, setExitForm, exitSubmitting, onRegisterExit,
  editModal, setEditModal, editForm, setEditForm, editSubmitting, onEditMovement,
  showAuditModal, setShowAuditModal, auditForm, setAuditForm, auditSubmitting, onPerformAudit,
  cashAudits = [],
  onSignExit,
  userSubRole,
  currentUserId,
  onExportExcel,
  actionLoading,
  onApplyAudit
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Period Filtering (cajaDateFrom to cajaDateTo)
  const filteredCashByDate = cashMovements.filter(m => {
    const mDate = (m.movement_date || m.created_at || '').split('T')[0];
    if (cajaDateFrom && mDate < cajaDateFrom) return false;
    if (cajaDateTo && mDate > cajaDateTo) return false;
    return true;
  });

  // 2. Period KPIs (totalEntries, totalExits, saldoDebido) matching MAIN
  const totalEntries = filteredCashByDate.filter(m => m.type === 'entry').reduce((s, m) => s + Number(m.amount || 0), 0);
  const totalExits = filteredCashByDate.filter(m => (m.type === 'exit' || m.type === 'salida' || m.type === 'egreso') && m.approval_status === 'approved').reduce((s, m) => s + Number(m.amount || 0), 0);
  const saldoDebido = totalEntries - totalExits;

  // 3. Global balance anchored to latest applied audit matching MAIN
  const latestAppliedAudit = (cashAudits || [])
    .filter(a => a.applied)
    .sort((a, b) => new Date(b.created_at || b.audit_date) - new Date(a.created_at || a.audit_date))[0];

  const auditBaseBalance = latestAppliedAudit ? Number(latestAppliedAudit.counted_balance || 0) : 0;
  const auditCutoffTime = latestAppliedAudit ? new Date(latestAppliedAudit.created_at || latestAppliedAudit.audit_date).getTime() : 0;

  const activeCash = latestAppliedAudit
    ? cashMovements.filter(m => {
        if (m.concept && m.concept.includes('Ajuste por arqueo de caja')) return false;
        const mTime = new Date(m.created_at || m.movement_date).getTime();
        return mTime > auditCutoffTime;
      })
    : cashMovements;

  const activeEntries = activeCash.filter(m => m.type === 'entry').reduce((s, m) => s + Number(m.amount || 0), 0);
  const activeExits = activeCash.filter(m => (m.type === 'exit' || m.type === 'salida' || m.type === 'egreso') && m.approval_status === 'approved').reduce((s, m) => s + Number(m.amount || 0), 0);
  const globalBalance = auditBaseBalance + activeEntries - activeExits;

  // Filtered movements for search
  const filteredMovements = filteredCashByDate.filter(m => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (m.reference_number || m.reference || '').toLowerCase().includes(term) ||
      (m.concept || m.notes || '').toLowerCase().includes(term) ||
      (m.created_by_name || m.responsible || '').toLowerCase().includes(term)
    );
  });

  const getSignatureCount = (m) => {
    let count = 0;
    if (m.approved_by_1) count++;
    if (m.approved_by_2) count++;
    return count;
  };

  const canSign = (m) => {
    if (userSubRole === 'lectura') return false;
    if (m.approved_by_1 && m.approved_by_2) return false;
    if (currentUserId && (m.approved_by_1 === currentUserId || m.approved_by_2 === currentUserId)) return false;
    if (!currentUserId && (m.approved_by_1 || m.approved_by_2)) return false;
    return true;
  };

  // Daily map calculation for daily breakdown
  const dailyMap = {};
  let dailyAccumulated = 0;

  const sortedMovements = [...cashMovements].sort((a, b) => {
    const dA = (a.movement_date || a.created_at || '').split('T')[0];
    const dB = (b.movement_date || b.created_at || '').split('T')[0];
    if (dA !== dB) return dA.localeCompare(dB);
    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
  });

  sortedMovements.forEach(m => {
    const amt = Number(m.amount) || 0;
    const isApproved = m.type === 'entry' || ((m.type === 'exit' || m.type === 'salida' || m.type === 'egreso') && m.approval_status === 'approved');
    const startBal = dailyAccumulated;

    if (isApproved) {
      if (m.type === 'entry') dailyAccumulated += amt;
      else dailyAccumulated -= amt;
    }

    const dateKey = (m.movement_date || m.created_at || '').split('T')[0] || 'Sin Fecha';
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = {
        date: dateKey,
        entries: 0,
        exits: 0,
        startBalance: startBal,
        endBalance: dailyAccumulated,
        count: 0,
        movements: [],
        hasDrasticDrop: false,
        netChange: 0,
      };
    }

    dailyMap[dateKey].count++;
    dailyMap[dateKey].movements.push(m);
    if (m.type === 'entry') dailyMap[dateKey].entries += amt;
    if ((m.type === 'exit' || m.type === 'salida' || m.type === 'egreso') && m.approval_status === 'approved') dailyMap[dateKey].exits += amt;
    dailyMap[dateKey].endBalance = dailyAccumulated;
    dailyMap[dateKey].netChange = dailyMap[dateKey].entries - dailyMap[dateKey].exits;

    if (dailyMap[dateKey].netChange <= -100000 || (dailyMap[dateKey].endBalance < 0 && dailyMap[dateKey].startBalance >= 0)) {
      dailyMap[dateKey].hasDrasticDrop = true;
    }
  });

  const rawDailyList = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
  const latestRow = rawDailyList[0];
  const balanceOffset = latestRow ? (globalBalance - latestRow.endBalance) : 0;

  const dailyList = rawDailyList.map(row => ({
    ...row,
    startBalance: row.startBalance + balanceOffset,
    endBalance: row.endBalance + balanceOffset
  }));
  const filteredDailyList = dailyList.filter(row => {
    if (!dailySearchTerm) return true;
    const s = dailySearchTerm.toLowerCase();
    return row.date.includes(s) || row.endBalance.toString().includes(s) || row.netChange.toString().includes(s);
  });

  return (
    <div className="space-y-6">
      {/* Controls & Date Pickers */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Calendar className="w-4 h-4 text-[#6a9a04]" />
            <span>Período:</span>
          </div>
          <input
            type="date"
            value={cajaDateFrom || ''}
            onChange={(e) => setCajaDateFrom(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6a9a04]"
          />
          <span className="text-slate-400 text-xs">a</span>
          <input
            type="date"
            value={cajaDateTo || ''}
            onChange={(e) => setCajaDateTo(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6a9a04]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {userSubRole !== 'lectura' && (
            <>
              <button
                onClick={() => setShowEntryModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                <Plus size={14} />
                <span>Registrar Entrada</span>
              </button>
              <button
                onClick={() => setShowExitModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                <Minus size={14} />
                <span>Salida de Efectivo</span>
              </button>
              <button
                onClick={() => setShowAuditModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                <ClipboardCheck size={14} />
                <span>Arqueo de Caja</span>
              </button>
            </>
          )}

          <button
            onClick={onExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors"
          >
            <Download size={14} />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* 4 KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Wallet size={20} className="text-blue-600" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Saldo Debido en Caja</span>
          </div>
          <p className={`text-2xl font-black ${globalBalance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
            ${globalBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Histórico total</p>
        </div>

        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ArrowDownCircle size={20} className="text-emerald-500" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Entradas Periodo</span>
          </div>
          <p className="text-2xl font-black text-emerald-600">
            ${totalEntries.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <ArrowUpCircle size={20} className="text-red-500" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Salidas Periodo</span>
          </div>
          <p className="text-2xl font-black text-red-600">
            ${totalExits.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <DollarSign size={20} className="text-purple-500" />
            </div>
            <span className="text-sm text-slate-500 font-medium">Balance Periodo</span>
          </div>
          <p className={`text-2xl font-black ${saldoDebido >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
            ${saldoDebido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Sub-tab switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setCajaSubTab('movimientos')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            cajaSubTab === 'movimientos'
              ? 'border-[#6a9a04] text-[#6a9a04]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Movimientos del Periodo ({filteredCashByDate.length})
        </button>
        <button
          onClick={() => setCajaSubTab('diario')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            cajaSubTab === 'diario'
              ? 'border-[#6a9a04] text-[#6a9a04]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📅 Desglose de Saldo Diario (Histórico)
        </button>
      </div>

      {/* View: Movimientos */}
      {cajaSubTab === 'movimientos' && (
        <div className="bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl overflow-hidden shadow-sm space-y-4 p-4">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ref, concepto, usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6a9a04]"
            />
          </div>

          <div className="space-y-3">
            {filteredMovements.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No se encontraron movimientos de caja para el período seleccionado.
              </div>
            ) : (
              filteredMovements.map((m, idx) => {
                const sigCount = getSignatureCount(m);
                const isExit = m.type === 'exit' || m.type === 'salida' || m.type === 'egreso';
                const isPendingSig = isExit && m.approval_status !== 'approved';

                return (
                  <div
                    key={m.id || idx}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isPendingSig ? 'bg-amber-50/50 border-amber-200' : 'bg-white/80 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        m.type === 'entry' ? 'bg-emerald-50 text-emerald-600' : isPendingSig ? 'bg-amber-50 border-2 border-amber-200 text-amber-500' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {m.type === 'entry' ? <ArrowDownCircle size={18} /> : isPendingSig ? <PenTool size={18} /> : <ArrowUpCircle size={18} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-lg font-black ${m.type === 'entry' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {m.type === 'entry' ? '+' : '-'}${Number(m.amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs font-semibold text-slate-400 capitalize">
                            {m.type === 'entry' ? 'Entrada' : 'Salida'}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-800 mt-0.5">{m.concept || m.notes || 'Venta mostrador'}</p>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap font-mono">
                          <span>{formatDateOnly(m.movement_date || m.created_at)}</span>
                          <span>•</span>
                          <span>{m.responsible || 'Sistema'}</span>
                          {m.created_by_name && (
                            <>
                              <span>•</span>
                              <span>Registró: {m.created_by_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions & Badges */}
                    <div className="flex items-center gap-2 justify-end flex-wrap">
                      {isPendingSig ? (
                        <>
                          <button
                            onClick={() => {
                              setEditModal(m);
                              setEditForm({
                                amount: m.amount,
                                concept: m.concept || '',
                                responsible: m.responsible || '',
                                notes: m.notes || '',
                                movement_date: (m.movement_date || m.created_at || '').split('T')[0]
                              });
                            }}
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-100 flex items-center justify-center border-none cursor-pointer transition-colors"
                            title="Editar movimiento"
                          >
                            <Edit3 size={14} className="text-slate-500 hover:text-blue-600" />
                          </button>

                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            sigCount === 0 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            ⏳ Firmas {sigCount}/2
                          </span>

                          {canSign(m) && (
                            <button
                              onClick={() => onSignExit(m.id)}
                              disabled={actionLoading === m.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg border-none cursor-pointer transition-colors disabled:opacity-50 shadow-sm"
                            >
                              {actionLoading === m.id ? <Loader2 size={12} className="animate-spin" /> : <PenTool size={12} />}
                              <span>Firmar</span>
                            </button>
                          )}

                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Manual
                          </span>
                        </>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          m.reference_type === 'counter_sale'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.reference_type === 'recycling_purchase'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {m.reference_type === 'counter_sale' ? 'Venta Mostrador' : m.reference_type === 'recycling_purchase' ? 'Compra Recycling' : 'Aprobado'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* View: Diario */}
      {cajaSubTab === 'diario' && (
        <div className="bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl overflow-hidden shadow-sm p-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por fecha, saldo..."
              value={dailySearchTerm}
              onChange={(e) => setDailySearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6a9a04]"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                  <th className="p-3">Fecha</th>
                  <th className="p-3 text-right">Saldo Inicial</th>
                  <th className="p-3 text-right text-emerald-600">Entradas</th>
                  <th className="p-3 text-right text-rose-600">Salidas</th>
                  <th className="p-3 text-right">Cambio Neto</th>
                  <th className="p-3 text-right">Saldo Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDailyList.map((row, idx) => (
                  <tr key={row.date || idx} className={`hover:bg-slate-50/50 ${row.hasDrasticDrop ? 'bg-rose-50/40' : ''}`}>
                    <td className="p-3 font-mono text-xs font-bold text-slate-900">{row.date}</td>
                    <td className="p-3 text-right text-xs text-slate-500">${row.startBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-xs text-emerald-600 font-bold">${row.entries.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-xs text-rose-600 font-bold">${row.exits.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className={`p-3 text-right text-xs font-bold ${row.netChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ${row.netChange.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right text-xs font-black text-slate-900">${row.endBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historial de Arqueos de Caja */}
      {cashAudits.length > 0 && (
        <div className="bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-indigo-500" /> Historial de Arqueos de Caja
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            {cashAudits.map((audit) => {
              const diff = Number(audit.counted_balance) - Number(audit.expected_balance);
              return (
                <div key={audit.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{audit.audit_date}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${audit.applied ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {audit.applied ? 'Aplicado' : 'Pendiente'}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      Realizado por: <span className="font-bold">{audit.performed_by}</span>
                      {audit.notes && ` • ${audit.notes}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Esperado vs Contado</span>
                      <span className="font-bold text-slate-700">
                        $${Number(audit.expected_balance).toLocaleString('es-MX')} / $${Number(audit.counted_balance).toLocaleString('es-MX')}
                      </span>
                      <span className={`block font-bold text-[11px] ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        Dif: $${diff.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {!audit.applied && onApplyAudit && (
                      <button
                        onClick={() => onApplyAudit(audit)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
                      >
                        Aplicar Arqueo
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Movement Overlay Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Edit3 size={20} className="text-blue-500" /> Editar Movimiento de Caja
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Monto ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Concepto *</label>
                <input
                  type="text"
                  value={editForm.concept}
                  onChange={e => setEditForm(f => ({ ...f, concept: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Responsable *</label>
                <input
                  type="text"
                  value={editForm.responsible}
                  onChange={e => setEditForm(f => ({ ...f, responsible: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={editForm.movement_date}
                  onChange={e => setEditForm(f => ({ ...f, movement_date: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notas (opcional)</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={onEditMovement}
                disabled={editSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {editSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Edit3 size={14} />}
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Registrar Entrada de Efectivo</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Monto ($):</label>
                <input
                  type="number"
                  value={entryForm.amount}
                  onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full p-2.5 rounded-xl border border-slate-200 mt-1 focus:ring-2 focus:ring-[#6a9a04]"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Concepto:</label>
                <input
                  type="text"
                  value={entryForm.concept}
                  onChange={(e) => setEntryForm({ ...entryForm, concept: e.target.value })}
                  placeholder="Ej. Inyección de caja inicial"
                  className="w-full p-2.5 rounded-xl border border-slate-200 mt-1 focus:ring-2 focus:ring-[#6a9a04]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowEntryModal(false)} className="px-4 py-2 rounded-xl text-slate-600 font-semibold text-xs">Cancelar</button>
              <button onClick={onRegisterEntry} disabled={entrySubmitting} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs">Guardar Entrada</button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Registrar Salida de Efectivo</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Monto ($):</label>
                <input
                  type="number"
                  value={exitForm.amount}
                  onChange={(e) => setExitForm({ ...exitForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full p-2.5 rounded-xl border border-slate-200 mt-1 focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Concepto / Destino:</label>
                <input
                  type="text"
                  value={exitForm.concept}
                  onChange={(e) => setExitForm({ ...exitForm, concept: e.target.value })}
                  placeholder="Ej. Depósito bancario, gasto operativo"
                  className="w-full p-2.5 rounded-xl border border-slate-200 mt-1 focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowExitModal(false)} className="px-4 py-2 rounded-xl text-slate-600 font-semibold text-xs">Cancelar</button>
              <button onClick={onRegisterExit} disabled={exitSubmitting} className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs">Guardar Salida</button>
            </div>
          </div>
        </div>
      )}
    
      {/* Audit Modal (Arqueo de Caja) */}
      {showAuditModal && (() => {
        const expectedBalance = globalBalance;
        const countedVal = parseFloat(auditForm.counted) || 0;
        const diff = countedVal - expectedBalance;
        const absDiff = Math.abs(diff);
        const diffColor = auditForm.counted === '' ? 'text-slate-400' : absDiff === 0 ? 'text-emerald-600' : absDiff <= 500 ? 'text-amber-600' : 'text-red-600';
        const diffBg = auditForm.counted === '' ? 'bg-slate-50' : absDiff === 0 ? 'bg-emerald-50 border-emerald-200' : absDiff <= 500 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

        return (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAuditModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Scale size={20} className="text-indigo-500" /> Arqueo de Caja
                </h3>
                <button onClick={() => setShowAuditModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 bg-transparent border-none cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Expected balance */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Saldo Esperado en Caja (Sistema)</p>
                  <p className="text-3xl font-black text-slate-900">${expectedBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {latestAppliedAudit ? 'Saldo actual en sistema (anclado al último arqueo aplicado + movimientos posteriores)' : 'Histórico total: entradas - salidas aprobadas'}
                  </p>
                </div>

                {/* Counted input */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Monto Contado (Efectivo Físico) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={auditForm.counted}
                    onChange={e => setAuditForm(f => ({ ...f, counted: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-2xl font-black text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {/* Difference display */}
                <div className={`rounded-xl p-4 border ${diffBg} transition-all`}>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Diferencia</p>
                  <p className={`text-2xl font-black ${diffColor}`}>
                    {auditForm.counted === '' ? '—' : `${diff >= 0 ? '+' : ''}$${diff.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                  </p>
                  {auditForm.counted !== '' && (
                    <p className={`text-xs mt-1 ${diffColor}`}>
                      {absDiff === 0 ? '✅ Cuadra perfecto' : absDiff <= 500 ? '⚠️ Diferencia menor — revisar' : '🔴 Diferencia significativa — investigar'}
                    </p>
                  )}
                </div>

                {/* Performed by input */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">¿Quién realizó el conteo? *</label>
                  <input
                    type="text"
                    value={auditForm.performed_by}
                    onChange={e => setAuditForm(f => ({ ...f, performed_by: e.target.value }))}
                    placeholder="Ej. Didier Fdz, Alain Ramos"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Notes input */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Notas / Observaciones (opcional)</label>
                  <input
                    type="text"
                    value={auditForm.notes}
                    onChange={e => setAuditForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Ej. Sobrante por cambio no reclamado..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={onPerformAudit}
                  disabled={auditSubmitting || !auditForm.counted || !auditForm.performed_by}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {auditSubmitting ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
                  <span>Guardar Arqueo</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
</div>
  );
}

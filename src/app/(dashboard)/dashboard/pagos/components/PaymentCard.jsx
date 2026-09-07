'use client';
import { useState } from 'react';
import { Eye, CheckCircle, XCircle, ChevronDown, ChevronUp, Clock, AlertTriangle, Loader2 } from 'lucide-react';

export default function PaymentCard({
  payment: p,
  onApprove,
  onOpenRejectModal,
  onOpenLightbox,
  actionLoading,
  userSubRole,
  orderMap = {},
  cashReceivedBy = {},
  setCashReceivedBy
}) {
  const [expanded, setExpanded] = useState(false);

  const getStatusConfig = (status) => {
    switch (status) {
      case 'approved':
        return { bg: '#ecfdf5', color: '#059669', label: 'Aprobado', icon: CheckCircle };
      case 'rejected':
        return { bg: '#fef2f2', color: '#dc2626', label: 'Rechazado', icon: XCircle };
      case 'pending':
      default:
        return { bg: '#fef3c7', color: '#d97706', label: 'Pendiente', icon: Clock };
    }
  };

  const statusCfg = getStatusConfig(p.status);
  const StatusIcon = statusCfg.icon;

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-MX', { year: '2-digit', month: 'short', day: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const distName = p.profiles?.full_name || p.distributor_name || 'Distribuidor Desconocido';
  const clientNum = p.profiles?.client_number || p.distributor_client_number;

  const formattedAmount = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(p.amount || 0);

  return (
    <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Main Info */}
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
          >
            <StatusIcon size={24} />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl font-black text-slate-900">
                {formattedAmount}
              </span>
              <span className="text-xs font-semibold text-slate-400 capitalize">
                {p.payment_method || 'transferencia'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mt-0.5 flex-wrap">
              <span>{distName}</span>
              {clientNum && (
                <span className="font-mono text-[#6a9a04] bg-[#6a9a04]/10 px-1.5 py-0.5 rounded text-[11px]">
                  {clientNum}
                </span>
              )}
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-normal">{formatDateOnly(p.created_at)}</span>
              {p.reference_number && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono text-slate-500 font-normal">Ref: {p.reference_number}</span>
                </>
              )}
            </div>

            {/* Allocated Orders (Azulito) / Containers (Moradito) Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {p.allocations && p.allocations.length > 0 ? (
                <>
                  {p.allocations.map((alloc, i) => {
                    if (!alloc.order_id) {
                      return (
                        <span key={i} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          📦 {p.payment_type === 'containers' || p.payment_type === 'mixed' ? 'Contenedores' : 'Sin asignar'}
                          <span className="font-bold text-purple-800 ml-0.5">→ ${Number(alloc.amount || 0).toLocaleString('es-MX')}</span>
                        </span>
                      );
                    }
                    const ord = orderMap ? orderMap[alloc.order_id] : null;
                    const rawNum = ord ? ord.order_number : (p.orders?.order_number ? p.orders.order_number : '');
                    const cleanNum = rawNum ? (String(rawNum).startsWith('ORD-') ? String(rawNum) : `ORD-${rawNum}`) : '';
                    const ordTotal = ord ? Number(ord.total_amount || 0) : (p.orders?.total_amount ? Number(p.orders.total_amount) : 0);

                    return (
                      <span key={i} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        📦 #{cleanNum || 'Pedido'} {ordTotal ? `(${ordTotal.toLocaleString('es-MX')})` : ''}
                        <span className="font-bold text-blue-800 ml-0.5">→ ${Number(alloc.amount || 0).toLocaleString('es-MX')}</span>
                      </span>
                    );
                  })}

                  {(p.payment_type === 'containers' || p.payment_type === 'mixed') && p.container_amount > 0 && !p.allocations.some(a => !a.order_id) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      📦 Contenedores <span className="font-bold text-purple-800 ml-1">→ ${Number(p.container_amount).toLocaleString('es-MX')}</span>
                    </span>
                  )}
                </>
              ) : p.orders?.order_number ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  📦 #{String(p.orders.order_number).startsWith('ORD-') ? p.orders.order_number : `ORD-${p.orders.order_number}`} (${Number(p.orders.total_amount || 0).toLocaleString('es-MX')})
                  <span className="font-bold text-blue-800 ml-0.5">→ ${Number(p.amount || 0).toLocaleString('es-MX')}</span>
                </span>
              ) : (p.payment_type === 'containers' || !p.order_id || (p.notes && p.notes.toLowerCase().includes('contenedor')) || (p.concept && p.concept.toLowerCase().includes('contenedor'))) ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  📦 Contenedores
                  <span className="font-bold text-purple-800 ml-1">→ ${Number(p.amount || 0).toLocaleString('es-MX')}</span>
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 italic">Sin asignación</span>
              )}
            </div>
          </div>
        </div>

        {/* Amount & Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
          <div className="flex items-center gap-2">
            {p.receipt_url && (
              <button
                onClick={() => onOpenLightbox(p.receipt_url)}
                className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-none cursor-pointer transition-colors"
                title="Ver comprobante"
              >
                <Eye size={16} className="text-slate-500" />
              </button>
            )}

            {p.status === 'pending' && userSubRole !== 'lectura' && (
              <>
                {(p.payment_method?.toLowerCase() === 'efectivo' || p.payment_method?.toLowerCase() === 'cash') && (
                  <input
                    type="text"
                    placeholder="Recibido por *"
                    value={cashReceivedBy[p.id] || ''}
                    onChange={(e) => setCashReceivedBy && setCashReceivedBy(prev => ({ ...prev, [p.id]: e.target.value }))}
                    className="px-3 py-1.5 rounded-xl border border-amber-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6a9a04]/30 bg-amber-50/80 placeholder:text-slate-400 w-36"
                  />
                )}
                <button
                  onClick={() => onApprove(p.id)}
                  disabled={actionLoading === p.id}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-bold border-none cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
                >
                  {actionLoading === p.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  <span>Aprobar</span>
                </button>
                <button
                  onClick={() => onOpenRejectModal(p.id)}
                  disabled={actionLoading === p.id}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold border-none cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
                >
                  <XCircle size={14} />
                  <span>Rechazar</span>
                </button>
              </>
            )}

            <button
              onClick={() => setExpanded(!expanded)}
              className="w-9 h-9 rounded-lg bg-slate-50 text-slate-400 hover:text-slate-700 flex items-center justify-center border-none cursor-pointer transition-colors"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Drawer */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 text-xs space-y-2 text-slate-600">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <span className="font-bold text-slate-700">ID de Pago:</span>
              <p className="font-mono text-slate-500 text-[11px] truncate">{p.id}</p>
            </div>
            <div>
              <span className="font-bold text-slate-700">Notas / Concepto:</span>
              <p>{p.notes || p.concept || 'Sin notas adicionadas'}</p>
            </div>
            {p.rejection_reason && (
              <div>
                <span className="font-bold text-rose-600">Motivo Rechazo:</span>
                <p className="text-rose-700">{p.rejection_reason}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

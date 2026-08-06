'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { ScrollText, Search, Filter, Loader2, User, Package, CreditCard, ShieldCheck, ClipboardList, Download, ArrowRightLeft } from 'lucide-react';

const ACTION_LABELS = {
    stock_increase: { label: 'Entrada de Inventario', icon: Package, color: '#059669' },
    stock_decrease: { label: 'Salida de Inventario', icon: Package, color: '#ef4444' },
    stock_transfer: { label: 'Transferencia de Stock', icon: ArrowRightLeft, color: '#8b5cf6' },
    count_created: { label: 'Conteo Creado', icon: ClipboardList, color: '#3b82f6' },
    count_submitted: { label: 'Conteo Enviado', icon: ClipboardList, color: '#f59e0b' },
    count_approved: { label: 'Conteo Aprobado', icon: ShieldCheck, color: '#6a9a04' },
    count_posted: { label: 'Conteo Aplicado', icon: Package, color: '#059669' },
    sub_role_changed: { label: 'Rol Cambiado', icon: User, color: '#8b5cf6' },
    payment_approved: { label: 'Pago Aprobado', icon: CreditCard, color: '#6a9a04' },
    payment_rejected: { label: 'Pago Rechazado', icon: CreditCard, color: '#ef4444' },
};

export default function AuditoriaPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('all');

    const PAGE_SIZE = 200;
    const supabase = createClient();

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async (loadMore = false) => {
        if (loadMore) setLoadingMore(true); else setLoading(true);
        const offset = loadMore ? logs.length : 0;
        const { data } = await supabase
            .from('audit_log')
            .select('*, user:profiles!audit_log_user_id_fkey(full_name, email)')
            .order('created_at', { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1);
        if (data) {
            if (loadMore) {
                setLogs(prev => [...prev, ...data]);
            } else {
                setLogs(data);
            }
            setHasMore(data.length === PAGE_SIZE);
        }
        setLoading(false);
        setLoadingMore(false);
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = !searchTerm ||
            (log.user?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            JSON.stringify(log.details || {}).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesAction = filterAction === 'all' || log.action === filterAction;
        return matchesSearch && matchesAction;
    });

    const uniqueActions = [...new Set(logs.map(l => l.action))];

    const exportToExcel = () => {
        const headers = ['Fecha', 'Usuario', 'Acción', 'SKU', 'Almacén', 'Antes', 'Después', 'Cambio', 'Razón', 'Detalles'];
        const rows = filteredLogs.map(log => {
            const d = log.details || {};
            const isStock = log.action === 'stock_increase' || log.action === 'stock_decrease';
            const actionLabel = ACTION_LABELS[log.action]?.label || log.action;
            return [
                new Date(log.created_at).toLocaleString('es-MX'),
                log.user?.full_name || log.user?.email || 'Sistema',
                actionLabel,
                isStock ? (d.sku || '') : '',
                isStock ? (d.warehouse || '') : '',
                isStock ? (d.before ?? '') : '',
                isStock ? (d.after ?? '') : '',
                isStock ? (d.change ?? '') : '',
                d.reason || '',
                !isStock ? Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(' | ') : ''
            ];
        });

        const csvContent = '\uFEFF' + [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 size={32} className="animate-spin text-[#6a9a04]" />
        </div>
    );

    return (
        <div className="relative">
            <div className="relative z-10 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 m-0">Auditoría</h1>
                        <p className="text-slate-500 mt-1 font-medium m-0">Registro inmutable de acciones del sistema.</p>
                    </div>
                    <p className="text-sm text-slate-400 m-0">{filteredLogs.length} registros</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar..." className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none w-56 shadow-sm focus:ring-2 focus:ring-[#6a9a04]/20" />
                    </div>
                    <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
                        className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none shadow-sm">
                        <option value="all">Todas las acciones</option>
                        {uniqueActions.map(a => (
                            <option key={a} value={a}>{ACTION_LABELS[a]?.label || a}</option>
                        ))}
                    </select>
                    <button onClick={exportToExcel} disabled={filteredLogs.length === 0}
                        className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-[#6a9a04] hover:bg-[#5a8503] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-sm transition-colors">
                        <Download size={16} />
                        Exportar Excel
                    </button>
                </div>

                {/* Logs Table */}
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-xl rounded-2xl overflow-hidden">
                    <div className="divide-y divide-slate-100">
                        {filteredLogs.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <ScrollText size={48} className="mx-auto mb-4 text-slate-300" />
                                <p className="text-lg font-bold">Sin registros</p>
                            </div>
                        ) : (
                            filteredLogs.map(log => {
                                const actionInfo = ACTION_LABELS[log.action] || { label: log.action, icon: ScrollText, color: '#94a3b8' };
                                const IconComp = actionInfo.icon;
                                const d = log.details || {};
                                const isStock = log.action === 'stock_increase' || log.action === 'stock_decrease';
                                const isTransfer = log.action === 'stock_transfer';
                                return (
                                    <div key={log.id} className="px-6 py-4 hover:bg-white/50 transition-colors">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${actionInfo.color}15` }}>
                                                <IconComp size={18} style={{ color: actionInfo.color }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-bold text-slate-900">{actionInfo.label}</span>
                                                    {(isStock || isTransfer) && d.sku && (
                                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-[#6a9a04]/10 text-[#6a9a04]">{d.sku}</span>
                                                    )}
                                                </div>
                                                {isTransfer ? (
                                                    <div className="mt-2 space-y-1.5">
                                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                                            <span className="font-semibold text-slate-400 w-16 shrink-0">Ruta</span>
                                                            <span className="font-bold">{d.from_warehouse}</span>
                                                            <span className="text-purple-500 font-black">→</span>
                                                            <span className="font-bold">{d.to_warehouse}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="font-semibold text-slate-400 w-16 shrink-0">Piezas</span>
                                                            <span className="font-mono font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{d.quantity}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="font-semibold text-slate-400 w-16 shrink-0">Origen</span>
                                                            <span className="font-mono text-slate-500">{d.from_before}</span>
                                                            <span className="text-slate-300">→</span>
                                                            <span className="font-mono font-bold text-slate-900">{d.from_after}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="font-semibold text-slate-400 w-16 shrink-0">Destino</span>
                                                            <span className="font-mono text-slate-500">{d.to_before}</span>
                                                            <span className="text-slate-300">→</span>
                                                            <span className="font-mono font-bold text-slate-900">{d.to_after}</span>
                                                        </div>
                                                    </div>
                                                ) : isStock ? (
                                                    <div className="mt-2 space-y-1.5">
                                                        {d.warehouse && (
                                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                                <span className="font-semibold text-slate-400 w-16 shrink-0">Almacén</span>
                                                                <span className="font-bold">{d.warehouse}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="font-semibold text-slate-400 w-16 shrink-0">Cantidad</span>
                                                            <span className="font-mono font-bold text-slate-500">{d.before}</span>
                                                            <span className="text-slate-300">→</span>
                                                            <span className="font-mono font-bold text-slate-900">{d.after}</span>
                                                            <span className={`font-mono font-black text-xs px-1.5 py-0.5 rounded ${d.change > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                                                {d.change > 0 ? '+' : ''}{d.change}
                                                            </span>
                                                        </div>
                                                        {d.reason && (
                                                            <div className="flex items-start gap-2 text-xs text-slate-500">
                                                                <span className="font-semibold text-slate-400 w-16 shrink-0">Razón</span>
                                                                <span>{d.reason}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    Object.keys(d).length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                            {Object.entries(d).map(([k, v]) => (
                                                                <span key={k} className="text-[11px] bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-slate-500">
                                                                    <span className="font-bold text-slate-400">{k}:</span> {String(v)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )
                                                )}
                                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                                        <User size={10} /> {log.user?.full_name || log.user?.email || 'Sistema'}
                                                    </span>
                                                    <span className="text-[11px] text-slate-300">
                                                        {new Date(log.created_at).toLocaleString('es-MX')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    {hasMore && (
                        <div className="p-4 text-center border-t border-slate-100">
                            <button
                                onClick={() => fetchLogs(true)}
                                disabled={loadingMore}
                                className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 cursor-pointer transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingMore ? (
                                    <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Cargando...</span>
                                ) : (
                                    `Cargar más registros (${logs.length} cargados)`
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

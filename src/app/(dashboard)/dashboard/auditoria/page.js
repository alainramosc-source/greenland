'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { ScrollText, Search, Filter, Loader2, User, Package, CreditCard, ShieldCheck, ClipboardList } from 'lucide-react';

const ACTION_LABELS = {
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
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('all');

    const supabase = createClient();

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('audit_log')
            .select('*, user:profiles!audit_log_user_id_fkey(full_name, email)')
            .order('created_at', { ascending: false })
            .limit(200);
        setLogs(data || []);
        setLoading(false);
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
                                return (
                                    <div key={log.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/50 transition-colors">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${actionInfo.color}15` }}>
                                            <IconComp size={18} style={{ color: actionInfo.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-bold text-slate-900">{actionInfo.label}</span>
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500">{log.entity_type}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    <User size={10} /> {log.user?.full_name || log.user?.email || '—'}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(log.created_at).toLocaleString('es-MX')}
                                                </span>
                                            </div>
                                        </div>
                                        {log.details && Object.keys(log.details).length > 0 && (
                                            <div className="text-[10px] font-mono text-slate-400 bg-slate-50 rounded-lg px-3 py-2 max-w-[200px] overflow-hidden whitespace-nowrap text-ellipsis shrink-0" title={JSON.stringify(log.details)}>
                                                {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

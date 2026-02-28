'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
    ArrowLeft, ClipboardList, Save, Loader2, Search, Upload,
    Package, AlertTriangle, CheckCircle, FileSpreadsheet, X
} from 'lucide-react';

const STATUS_LABELS = {
    draft: { label: 'Borrador', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
    in_progress: { label: 'En Progreso', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    submitted: { label: 'Enviado', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    approved: { label: 'Aprobado', color: '#6a9a04', bg: 'rgba(106,154,4,0.12)' },
    posted: { label: 'Aplicado', color: '#059669', bg: 'rgba(5,150,105,0.12)' },
};

export default function ConteoDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const supabase = createClient();
    const skuInputRef = useRef(null);

    const [session, setSession] = useState(null);
    const [lines, setLines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDiff, setFilterDiff] = useState('all'); // all, differences, uncounted
    const [skuInput, setSkuInput] = useState('');
    const [userId, setUserId] = useState(null);

    useEffect(() => { fetchSession(); }, [id]);

    const fetchSession = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        setUserId(user.id);

        const { data: sessionData } = await supabase
            .from('inventory_count_sessions')
            .select('*, warehouse:warehouses(name), responsible:profiles!inventory_count_sessions_responsible_user_id_fkey(full_name)')
            .eq('id', id)
            .single();
        setSession(sessionData);

        const { data: linesData } = await supabase
            .from('inventory_count_lines')
            .select('*, product:products(name, sku)')
            .eq('session_id', id)
            .order('sku', { ascending: true });
        setLines(linesData || []);
        setLoading(false);
    };

    // Update a line's counted quantity
    const updateLineCount = (lineId, value) => {
        setLines(prev => prev.map(l =>
            l.id === lineId ? { ...l, qty_counted: value === '' ? null : Number(value), _dirty: true } : l
        ));
    };

    // Update a line's reason
    const updateLineReason = (lineId, value) => {
        setLines(prev => prev.map(l =>
            l.id === lineId ? { ...l, reason: value, _dirty: true } : l
        ));
    };

    // Save all dirty lines
    const saveLines = async () => {
        const dirtyLines = lines.filter(l => l._dirty);
        if (dirtyLines.length === 0) { alert('No hay cambios por guardar'); return; }
        setSaving(true);

        for (const line of dirtyLines) {
            await supabase.from('inventory_count_lines').update({
                qty_counted: line.qty_counted,
                reason: line.reason || null,
                counted_by: userId,
                counted_at: new Date().toISOString()
            }).eq('id', line.id);
        }

        // Update session status to in_progress if draft
        if (session.status === 'draft') {
            await supabase.from('inventory_count_sessions').update({
                status: 'in_progress',
                started_at: new Date().toISOString()
            }).eq('id', id);
        }

        setSaving(false);
        setLines(prev => prev.map(l => ({ ...l, _dirty: false })));
        alert(`✅ ${dirtyLines.length} líneas guardadas`);
        fetchSession();
    };

    // Quick SKU input — find line and focus
    const handleSkuSubmit = (e) => {
        e.preventDefault();
        const sku = skuInput.trim().toUpperCase();
        if (!sku) return;

        const lineIndex = lines.findIndex(l =>
            (l.sku || l.product?.sku || '').toUpperCase() === sku
        );

        if (lineIndex === -1) {
            alert(`SKU "${sku}" no encontrado en esta sesión`);
        } else {
            // Focus the input for that line
            const input = document.getElementById(`count-input-${lines[lineIndex].id}`);
            if (input) { input.focus(); input.select(); }
        }
        setSkuInput('');
    };

    // CSV Import
    const handleCSVImport = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const wb = XLSX.read(ev.target.result, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

            let matched = 0;
            const updatedLines = [...lines];

            for (const row of rows) {
                if (!row[0]) continue;
                const sku = String(row[0]).trim().toUpperCase();
                const qty = Number(row[1]);
                if (isNaN(qty)) continue;

                const idx = updatedLines.findIndex(l =>
                    (l.sku || l.product?.sku || '').toUpperCase() === sku
                );
                if (idx !== -1) {
                    updatedLines[idx] = { ...updatedLines[idx], qty_counted: qty, _dirty: true };
                    matched++;
                }
            }

            setLines(updatedLines);
            alert(`CSV importado: ${matched} SKUs coincidieron de ${rows.length - 1} filas`);
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    // Filter lines
    const filteredLines = lines.filter(l => {
        const matchesSearch = !searchTerm ||
            (l.sku || l.product?.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (l.product?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

        if (filterDiff === 'differences') return matchesSearch && l.qty_counted !== null && l.qty_counted !== l.qty_system_snapshot;
        if (filterDiff === 'uncounted') return matchesSearch && l.qty_counted === null;
        return matchesSearch;
    });

    // Stats
    const totalLines = lines.length;
    const countedLines = lines.filter(l => l.qty_counted !== null).length;
    const diffLines = lines.filter(l => l.qty_counted !== null && l.qty_counted !== l.qty_system_snapshot).length;
    const dirtyCount = lines.filter(l => l._dirty).length;

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 size={32} className="animate-spin text-[#6a9a04]" />
        </div>
    );

    if (!session) return (
        <div className="text-center py-20 text-slate-400">
            <p className="text-lg font-bold">Sesión no encontrada</p>
            <button onClick={() => router.push('/dashboard/inventarios')}
                className="mt-4 px-5 py-2.5 bg-[#6a9a04] text-white rounded-xl font-bold border-none cursor-pointer">Volver</button>
        </div>
    );

    const st = STATUS_LABELS[session.status] || STATUS_LABELS.draft;
    const canEdit = ['draft', 'in_progress'].includes(session.status);

    return (
        <div className="relative">
            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.push('/dashboard/inventarios')}
                        className="w-10 h-10 rounded-xl bg-white/60 border border-white/50 flex items-center justify-center text-slate-500 hover:text-[#6a9a04] hover:bg-white transition-all cursor-pointer">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-slate-900 m-0">{session.session_code}</h1>
                            <span className="px-3 py-1 rounded-lg text-xs font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1 m-0">
                            {session.warehouse?.name} · {session.responsible?.full_name || '—'} · {new Date(session.created_at).toLocaleDateString('es-MX')}
                            {session.notes && <span className="ml-3 text-slate-400">— {session.notes}</span>}
                        </p>
                    </div>
                    {canEdit && (
                        <button onClick={saveLines} disabled={saving || dirtyCount === 0}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#6a9a04] text-white font-bold text-sm rounded-xl border-none cursor-pointer hover:bg-[#6a9a04]/90 transition-all shadow-lg shadow-[#6a9a04]/20 disabled:opacity-50">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Guardar {dirtyCount > 0 ? `(${dirtyCount})` : ''}
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><Package size={18} className="text-slate-500" /></div>
                        <div><p className="text-[10px] font-bold text-slate-500 uppercase m-0">Total SKUs</p><p className="text-xl font-black text-slate-900 m-0">{totalLines}</p></div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#6a9a04]/10 flex items-center justify-center"><CheckCircle size={18} className="text-[#6a9a04]" /></div>
                        <div><p className="text-[10px] font-bold text-slate-500 uppercase m-0">Contados</p><p className="text-xl font-black text-slate-900 m-0">{countedLines} <span className="text-xs text-slate-400 font-normal">/ {totalLines}</span></p></div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><AlertTriangle size={18} className="text-amber-500" /></div>
                        <div><p className="text-[10px] font-bold text-slate-500 uppercase m-0">Diferencias</p><p className="text-xl font-black text-amber-500 m-0">{diffLines}</p></div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><ClipboardList size={18} className="text-blue-500" /></div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase m-0">Progreso</p>
                            <p className="text-xl font-black text-slate-900 m-0">{totalLines > 0 ? Math.round(countedLines / totalLines * 100) : 0}%</p>
                        </div>
                    </div>
                </div>

                {/* Quick SKU Input + Search + Filters + CSV Import */}
                {canEdit && (
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                        <form onSubmit={handleSkuSubmit} className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input ref={skuInputRef} type="text" value={skuInput} onChange={e => setSkuInput(e.target.value)}
                                    placeholder="SKU rápido + Enter"
                                    className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none w-48 shadow-sm focus:ring-2 focus:ring-[#6a9a04]/20" />
                            </div>
                        </form>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Filtrar..." className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none w-40 shadow-sm" />
                        </div>
                        <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)}
                            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none shadow-sm">
                            <option value="all">Todos</option>
                            <option value="differences">Con diferencia</option>
                            <option value="uncounted">Sin contar</option>
                        </select>
                        <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                            <Upload size={14} /> Importar CSV
                            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleCSVImport} className="hidden" />
                        </label>
                    </div>
                )}

                {!canEdit && (
                    <div className="flex items-center gap-3 mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Filtrar..." className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none w-48 shadow-sm" />
                        </div>
                        <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)}
                            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none shadow-sm">
                            <option value="all">Todos</option>
                            <option value="differences">Con diferencia</option>
                            <option value="uncounted">Sin contar</option>
                        </select>
                    </div>
                )}

                {/* Counting Table */}
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-xl rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500 w-24">SKU</th>
                                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Producto</th>
                                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500 text-center w-24">Sistema</th>
                                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500 text-center w-28">Contado</th>
                                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500 text-center w-24">Diferencia</th>
                                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500 w-44">Motivo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLines.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No hay líneas que mostrar.</td></tr>
                                ) : (
                                    filteredLines.map(line => {
                                        const diff = line.qty_counted !== null ? line.qty_counted - line.qty_system_snapshot : null;
                                        const hasDiff = diff !== null && diff !== 0;
                                        return (
                                            <tr key={line.id} className={`transition-colors ${hasDiff ? 'bg-amber-50/30' : ''} ${line._dirty ? 'bg-blue-50/30' : ''}`}>
                                                <td className="px-4 py-3 font-mono text-xs font-bold text-[#6a9a04]">{line.sku || line.product?.sku || '—'}</td>
                                                <td className="px-4 py-3 text-sm text-slate-900">{line.product?.name || '—'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-sm font-bold text-slate-500">{line.qty_system_snapshot}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {canEdit ? (
                                                        <input id={`count-input-${line.id}`} type="number" min="0"
                                                            value={line.qty_counted ?? ''}
                                                            onChange={e => updateLineCount(line.id, e.target.value)}
                                                            className={`w-20 px-3 py-2 rounded-lg border text-center text-sm font-bold outline-none ${hasDiff ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-900'
                                                                } focus:ring-2 focus:ring-[#6a9a04]/20`}
                                                            placeholder="—" />
                                                    ) : (
                                                        <span className={`text-sm font-bold ${hasDiff ? 'text-amber-600' : 'text-slate-900'}`}>
                                                            {line.qty_counted ?? '—'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {diff !== null ? (
                                                        <span className={`text-sm font-black ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                                            {diff > 0 ? `+${diff}` : diff}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-300">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {canEdit ? (
                                                        <input type="text" value={line.reason || ''}
                                                            onChange={e => updateLineReason(line.id, e.target.value)}
                                                            placeholder={hasDiff ? 'Motivo...' : ''}
                                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#6a9a04]/20" />
                                                    ) : (
                                                        <span className="text-sm text-slate-500">{line.reason || '—'}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
                        <p className="text-xs text-slate-500 m-0">
                            Mostrando {filteredLines.length} de {totalLines} líneas
                            {dirtyCount > 0 && <span className="ml-3 text-blue-500 font-bold">({dirtyCount} sin guardar)</span>}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

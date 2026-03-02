'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import {
    Users, Search, Filter, Eye, Download, Check, X, Loader2,
    FileText, Shield, AlertTriangle, Clock, ChevronRight, Building2, User
} from 'lucide-react';

const STATUS_MAP = {
    started: { label: 'Iniciado', color: 'bg-slate-100 text-slate-600' },
    docs_uploaded: { label: 'Docs Cargados', color: 'bg-amber-100 text-amber-700' },
    contract_generated: { label: 'Contrato Generado', color: 'bg-blue-100 text-blue-700' },
    contract_signed: { label: 'Contrato Firmado', color: 'bg-green-100 text-green-700' },
    active: { label: 'Activo', color: 'bg-[#6a9a04]/10 text-[#6a9a04]' },
};

export default function ExpedientesPage() {
    const supabase = createClient();
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        async function load() {
            const { data } = await supabase
                .from('distributor_profiles')
                .select('*, profiles:user_id(full_name, email, phone, client_number)')
                .order('created_at', { ascending: false });
            if (data) setProfiles(data);
            setLoading(false);
        }
        load();
    }, []);

    const filtered = profiles.filter(p => {
        const name = p.full_name || p.legal_name || p.profiles?.full_name || '';
        const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) ||
            (p.rfc || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.profiles?.client_number || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || p.onboarding_status === statusFilter;
        return matchSearch && matchStatus;
    });

    const stats = {
        total: profiles.length,
        pending: profiles.filter(p => ['started', 'docs_uploaded'].includes(p.onboarding_status)).length,
        signed: profiles.filter(p => p.onboarding_status === 'contract_signed' || p.onboarding_status === 'active').length,
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#6a9a04]" />
        </div>
    );

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <Shield className="text-[#6a9a04]" /> Expedientes de Distribuidores
                </h1>
                <p className="text-slate-500 mt-1">Gestiona expedientes, documentos y contratos de tus distribuidores</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Total Expedientes', value: stats.total, icon: Users, color: 'text-slate-600' },
                    { label: 'Pendientes', value: stats.pending, icon: Clock, color: 'text-amber-600' },
                    { label: 'Firmados', value: stats.signed, icon: Check, color: 'text-green-600' },
                ].map(s => (
                    <div key={s.label} className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <s.icon size={16} className={s.color} />
                            <span className="text-xs font-bold text-slate-500 uppercase">{s.label}</span>
                        </div>
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="flex-1 relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nombre, RFC o número de cliente..."
                        className="w-full pl-10 pr-4 py-3 bg-white/60 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#6a9a04]/30" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="px-4 py-3 bg-white/60 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#6a9a04]/30">
                    <option value="all">Todos los estatus</option>
                    {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <Users size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="font-bold">No se encontraron expedientes</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200/50">
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Distribuidor</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Tipo</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">RFC</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Estatus</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Fecha</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(p => {
                                const st = STATUS_MAP[p.onboarding_status] || STATUS_MAP.started;
                                return (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{p.full_name || p.legal_name || p.profiles?.full_name || '—'}</div>
                                            <div className="text-xs text-slate-500">{p.profiles?.email}</div>
                                            {p.profiles?.client_number && <div className="text-[10px] font-mono text-[#6a9a04] mt-0.5">{p.profiles.client_number}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600">
                                                {p.person_type === 'fisica' ? <User size={12} /> : <Building2 size={12} />}
                                                {p.person_type === 'fisica' ? 'Física' : 'Moral'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm text-slate-700">{p.rfc || '—'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${st.color}`}>{st.label}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(p.created_at).toLocaleDateString('es-MX')}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Link href={`/dashboard/expedientes/${p.id}`}
                                                className="inline-flex items-center gap-1 bg-slate-100 hover:bg-[#6a9a04]/10 text-slate-700 hover:text-[#6a9a04] px-3 py-1.5 rounded-lg text-xs font-bold transition-all no-underline">
                                                <Eye size={14} /> Ver Expediente
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

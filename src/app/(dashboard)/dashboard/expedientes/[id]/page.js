'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import {
    ArrowLeft, User, Building2, FileText, Download, Check, X, Loader2,
    Shield, Clock, Eye, CheckCircle, XCircle, AlertTriangle, ScrollText
} from 'lucide-react';

const DOC_LABELS = {
    identificacion: 'Identificación Oficial',
    comprobante_domicilio: 'Comprobante de Domicilio',
    constancia_fiscal: 'Constancia de Situación Fiscal',
    acta_constitutiva: 'Acta Constitutiva',
    poder_representante: 'Poder del Representante Legal',
    identificacion_rep: 'ID del Representante Legal',
};

const STATUS_MAP = {
    started: { label: 'Iniciado', color: 'bg-slate-100 text-slate-600', icon: Clock },
    docs_uploaded: { label: 'Documentos Cargados', color: 'bg-amber-100 text-amber-700', icon: FileText },
    contract_generated: { label: 'Contrato Generado', color: 'bg-blue-100 text-blue-700', icon: FileText },
    contract_signed: { label: 'Contrato Firmado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    active: { label: 'Activo', color: 'bg-[#6a9a04]/10 text-[#6a9a04]', icon: Shield },
};

export default function ExpedienteDetailPage() {
    const { id } = useParams();
    const supabase = createClient();
    const [profile, setProfile] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [auditLog, setAuditLog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    const fetchAll = async () => {
        const [profRes, docsRes, contrRes, auditRes] = await Promise.all([
            supabase.from('distributor_profiles').select('*, profiles:user_id(full_name, email, phone, client_number)').eq('id', id).single(),
            supabase.from('distributor_documents').select('*').eq('distributor_profile_id', id).order('uploaded_at', { ascending: false }),
            supabase.from('distributor_contracts').select('*').eq('distributor_profile_id', id).order('created_at', { ascending: false }),
            supabase.from('onboarding_audit_log').select('*').eq('distributor_profile_id', id).order('created_at', { ascending: false }),
        ]);
        if (profRes.data) setProfile(profRes.data);
        if (docsRes.data) setDocuments(docsRes.data);
        if (contrRes.data) setContracts(contrRes.data);
        if (auditRes.data) setAuditLog(auditRes.data);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [id]);

    const handleDocAction = async (docId, action, reason = '') => {
        setActionLoading(docId);
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('distributor_documents').update({
            status: action, reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
            ...(action === 'rejected' ? { rejection_reason: reason } : {}),
        }).eq('id', docId);

        await supabase.from('onboarding_audit_log').insert({
            user_id: user?.id, distributor_profile_id: id,
            action: `document_${action}`, entity_type: 'document', entity_id: docId,
            details: { action, reason },
        });
        await fetchAll();
        setActionLoading(null);
    };

    const handleActivate = async () => {
        if (!confirm('¿Activar este distribuidor? Esto marcará su expediente como completo.')) return;
        setActionLoading('activate');
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('distributor_profiles').update({ onboarding_status: 'active', updated_at: new Date().toISOString() }).eq('id', id);
        await supabase.from('onboarding_audit_log').insert({
            user_id: user?.id, distributor_profile_id: id,
            action: 'status_changed', details: { new_status: 'active' },
        });
        await fetchAll();
        setActionLoading(null);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#6a9a04]" />
        </div>
    );

    if (!profile) return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-slate-500">Expediente no encontrado</p>
        </div>
    );

    const st = STATUS_MAP[profile.onboarding_status] || STATUS_MAP.started;
    const addr = profile.fiscal_address || {};
    const nombre = profile.full_name || profile.legal_name || profile.profiles?.full_name || '—';

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            <Link href="/dashboard/expedientes" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#6a9a04] mb-4 no-underline font-medium">
                <ArrowLeft size={16} /> Volver a expedientes
            </Link>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        {profile.person_type === 'fisica' ? <User className="text-[#6a9a04]" /> : <Building2 className="text-[#6a9a04]" />}
                        {nombre}
                    </h1>
                    <p className="text-slate-500 mt-1">{profile.profiles?.email} · {profile.rfc || 'Sin RFC'}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${st.color}`}>{st.label}</span>
                    {profile.onboarding_status === 'contract_signed' && (
                        <button onClick={handleActivate} disabled={actionLoading === 'activate'}
                            className="flex items-center gap-2 bg-[#6a9a04] text-white px-4 py-2 rounded-xl text-sm font-bold border-none cursor-pointer shadow-lg shadow-[#6a9a04]/20 hover:bg-[#6a9a04]/90 transition-all disabled:opacity-50">
                            {actionLoading === 'activate' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} Activar Distribuidor
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Legal Data */}
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Shield size={18} className="text-[#6a9a04]" /> Datos Legales
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase mb-0.5">Tipo</p>
                                <p className="text-slate-800 font-medium">{profile.person_type === 'fisica' ? 'Persona Física' : 'Persona Moral'}</p>
                            </div>
                            {profile.person_type === 'fisica' ? (
                                <>
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase mb-0.5">Nombre</p>
                                        <p className="text-slate-800 font-medium">{profile.full_name || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase mb-0.5">CURP</p>
                                        <p className="text-slate-800 font-mono">{profile.curp || '—'}</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase mb-0.5">Razón Social</p>
                                        <p className="text-slate-800 font-medium">{profile.legal_name || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase mb-0.5">Representante Legal</p>
                                        <p className="text-slate-800 font-medium">{profile.legal_rep_name || '—'}</p>
                                    </div>
                                </>
                            )}
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase mb-0.5">RFC</p>
                                <p className="text-slate-800 font-mono">{profile.rfc || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase mb-0.5">Régimen Fiscal</p>
                                <p className="text-slate-800">{profile.tax_regime || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase mb-0.5">Correo</p>
                                <p className="text-slate-800">{profile.email || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase mb-0.5">Teléfono</p>
                                <p className="text-slate-800">{profile.phone || '—'}</p>
                            </div>
                            <div className="col-span-2 md:col-span-3">
                                <p className="text-xs text-slate-500 font-bold uppercase mb-0.5">Domicilio Fiscal</p>
                                <p className="text-slate-800">
                                    {addr.street ? `${addr.street} ${addr.exterior_num || ''} ${addr.interior_num ? 'Int. ' + addr.interior_num : ''}, Col. ${addr.colonia || ''}, C.P. ${addr.zip_code || ''}, ${addr.city || ''}, ${addr.state || ''}` : '—'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Documents */}
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <FileText size={18} className="text-[#6a9a04]" /> Documentos ({documents.length})
                        </h3>
                        {documents.length === 0 ? (
                            <p className="text-slate-400 text-sm text-center py-4">Sin documentos cargados</p>
                        ) : (
                            <div className="space-y-3">
                                {documents.map(doc => (
                                    <div key={doc.id} className={`p-4 rounded-xl border ${doc.status === 'approved' ? 'border-green-200 bg-green-50/50' :
                                            doc.status === 'rejected' ? 'border-red-200 bg-red-50/50' :
                                                'border-slate-200 bg-slate-50/50'
                                        }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="font-bold text-sm text-slate-800">{DOC_LABELS[doc.document_type] || doc.document_type}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {doc.file_name} · {new Date(doc.uploaded_at).toLocaleString('es-MX')}
                                                    {doc.upload_ip && <span className="ml-2 font-mono">IP: {doc.upload_ip}</span>}
                                                </p>
                                                {doc.status === 'rejected' && doc.rejection_reason && (
                                                    <p className="text-xs text-red-600 mt-1">Motivo: {doc.rejection_reason}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${doc.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                        doc.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                            'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {doc.status === 'approved' ? '✓ Aprobado' : doc.status === 'rejected' ? '✗ Rechazado' : '⏳ Pendiente'}
                                                </span>
                                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                                                    className="p-1.5 hover:bg-white rounded-lg transition-colors" title="Ver">
                                                    <Eye size={16} className="text-slate-500" />
                                                </a>
                                                <a href={doc.file_url} download className="p-1.5 hover:bg-white rounded-lg transition-colors" title="Descargar">
                                                    <Download size={16} className="text-slate-500" />
                                                </a>
                                                {doc.status === 'pending' && (
                                                    <>
                                                        <button onClick={() => handleDocAction(doc.id, 'approved')} disabled={actionLoading === doc.id}
                                                            className="p-1.5 hover:bg-green-100 rounded-lg transition-colors border-none bg-transparent cursor-pointer" title="Aprobar">
                                                            <CheckCircle size={16} className="text-green-600" />
                                                        </button>
                                                        <button onClick={() => {
                                                            const reason = prompt('Motivo del rechazo:');
                                                            if (reason) handleDocAction(doc.id, 'rejected', reason);
                                                        }} disabled={actionLoading === doc.id}
                                                            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors border-none bg-transparent cursor-pointer" title="Rechazar">
                                                            <XCircle size={16} className="text-red-500" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Contracts */}
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <FileText size={18} className="text-[#6a9a04]" /> Contratos
                        </h3>
                        {contracts.length === 0 ? (
                            <p className="text-slate-400 text-sm text-center py-4">Sin contratos generados</p>
                        ) : (
                            <div className="space-y-3">
                                {contracts.map(c => (
                                    <div key={c.id} className={`p-4 rounded-xl border ${c.status === 'signed' ? 'border-green-200 bg-green-50/50' : 'border-blue-200 bg-blue-50/50'}`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-sm text-slate-800">Contrato v{c.contract_version}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {c.status === 'signed' ? `Firmado: ${new Date(c.signed_at).toLocaleString('es-MX')}` : `Generado: ${new Date(c.created_at).toLocaleString('es-MX')}`}
                                                    {c.signer_ip && <span className="ml-2 font-mono">IP: {c.signer_ip}</span>}
                                                </p>
                                                {c.document_hash && <p className="text-[10px] font-mono text-slate-400 mt-0.5">SHA-256: {c.document_hash.substring(0, 32)}...</p>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.status === 'signed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {c.status === 'signed' ? '✅ Firmado' : '📄 Generado'}
                                                </span>
                                                {c.contract_signed_pdf_url && (
                                                    <a href={c.contract_signed_pdf_url} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold no-underline hover:bg-green-700 transition-all">
                                                        <Download size={14} /> Firmado
                                                    </a>
                                                )}
                                                {c.contract_pdf_url && (
                                                    <a href={c.contract_pdf_url} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-bold no-underline hover:bg-blue-600 transition-all">
                                                        <Download size={14} /> Original
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Declarations */}
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <CheckCircle size={16} className="text-[#6a9a04]" /> Declaraciones
                        </h3>
                        {profile.declarations_accepted_at ? (
                            <div className="space-y-2 text-sm">
                                <p className="flex items-center gap-2"><Check size={14} className="text-green-600" /> <span className="text-slate-700">Información veraz</span></p>
                                <p className="flex items-center gap-2"><Check size={14} className="text-green-600" /> <span className="text-slate-700">Términos aceptados</span></p>
                                <p className="flex items-center gap-2"><Check size={14} className="text-green-600" /> <span className="text-slate-700">Contrato aceptado</span></p>
                                <div className="mt-3 pt-3 border-t border-slate-200">
                                    <p className="text-xs text-slate-500"><span className="font-bold">Fecha:</span> {new Date(profile.declarations_accepted_at).toLocaleString('es-MX')}</p>
                                    <p className="text-xs text-slate-500"><span className="font-bold">IP:</span> <span className="font-mono">{profile.declarations_ip || '—'}</span></p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">Pendiente de aceptación</p>
                        )}
                    </div>

                    {/* Audit Log */}
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <ScrollText size={16} className="text-[#6a9a04]" /> Bitácora de Auditoría
                        </h3>
                        {auditLog.length === 0 ? (
                            <p className="text-sm text-slate-400">Sin registros</p>
                        ) : (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                {auditLog.map(log => (
                                    <div key={log.id} className="text-xs border-l-2 border-[#6a9a04]/30 pl-3">
                                        <p className="font-bold text-slate-700">{log.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                                        <p className="text-slate-500">{new Date(log.created_at).toLocaleString('es-MX')}</p>
                                        {log.ip_address && <p className="text-slate-400 font-mono">IP: {log.ip_address}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

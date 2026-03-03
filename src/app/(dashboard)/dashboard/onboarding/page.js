'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
    User, Building2, FileText, CheckSquare, PenLine,
    ArrowRight, ArrowLeft, Upload, Check, X, Loader2,
    Shield, AlertTriangle, Download, Eye, Trash2, ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const TAX_REGIMES = [
    { code: '601', label: '601 - General de Ley Personas Morales' },
    { code: '603', label: '603 - Personas Morales con Fines no Lucrativos' },
    { code: '605', label: '605 - Sueldos y Salarios e Ingresos Asimilados' },
    { code: '606', label: '606 - Arrendamiento' },
    { code: '607', label: '607 - Régimen de Enajenación o Adquisición de Bienes' },
    { code: '608', label: '608 - Demás ingresos' },
    { code: '610', label: '610 - Residentes en el Extranjero sin EP' },
    { code: '611', label: '611 - Ingresos por Dividendos' },
    { code: '612', label: '612 - Personas Físicas con Actividades Empresariales y Profesionales' },
    { code: '614', label: '614 - Ingresos por intereses' },
    { code: '615', label: '615 - Régimen de los ingresos por obtención de premios' },
    { code: '616', label: '616 - Sin obligaciones fiscales' },
    { code: '620', label: '620 - Sociedades Cooperativas de Producción' },
    { code: '621', label: '621 - Incorporación Fiscal' },
    { code: '622', label: '622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
    { code: '623', label: '623 - Opcional para Grupos de Sociedades' },
    { code: '624', label: '624 - Coordinados' },
    { code: '625', label: '625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
    { code: '626', label: '626 - Régimen Simplificado de Confianza' },
];

const DOCS_FISICA = [
    { type: 'identificacion', label: 'Identificación oficial (INE o Pasaporte)', required: true },
    { type: 'comprobante_domicilio', label: 'Comprobante de domicilio (≤ 3 meses)', required: true },
    { type: 'constancia_fiscal', label: 'Constancia de Situación Fiscal (PDF SAT)', required: true },
];

const DOCS_MORAL = [
    { type: 'acta_constitutiva', label: 'Acta Constitutiva', required: true },
    { type: 'poder_representante', label: 'Poder del Representante Legal', required: true },
    { type: 'identificacion_rep', label: 'Identificación del Representante Legal', required: true },
    { type: 'constancia_fiscal', label: 'Constancia de Situación Fiscal', required: true },
    { type: 'comprobante_domicilio', label: 'Comprobante de Domicilio Fiscal', required: true },
];

const STEPS = [
    { num: 1, label: 'Tipo de Persona', icon: User },
    { num: 2, label: 'Datos Generales', icon: FileText },
    { num: 3, label: 'Documentos', icon: Upload },
    { num: 4, label: 'Consentimiento', icon: CheckSquare },
    { num: 5, label: 'Contrato y Firma', icon: PenLine },
];

export default function OnboardingPage() {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [step, setStep] = useState(1);
    const [userId, setUserId] = useState(null);
    const [profile, setProfile] = useState(null); // distributor_profiles row
    const [documents, setDocuments] = useState([]);
    const [contract, setContract] = useState(null);
    const [uploading, setUploading] = useState({});

    // Form state
    const [personType, setPersonType] = useState('');
    const [formData, setFormData] = useState({
        rfc: '', curp: '', tax_regime: '', email: '', phone: '',
        full_name: '', legal_name: '', legal_rep_name: '',
        street: '', exterior_num: '', interior_num: '', colonia: '',
        zip_code: '', city: '', state: '',
    });
    const [declarations, setDeclarations] = useState({
        info_true: false, terms: false, contract: false,
    });

    // Signature
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSigned, setHasSigned] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    // Load existing profile
    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }
            setUserId(user.id);

            const { data: dp } = await supabase
                .from('distributor_profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (dp) {
                setProfile(dp);
                setPersonType(dp.person_type);
                const addr = dp.fiscal_address || {};
                setFormData({
                    rfc: dp.rfc || '', curp: dp.curp || '', tax_regime: dp.tax_regime || '',
                    email: dp.email || '', phone: dp.phone || '',
                    full_name: dp.full_name || '', legal_name: dp.legal_name || '',
                    legal_rep_name: dp.legal_rep_name || '',
                    street: addr.street || '', exterior_num: addr.exterior_num || '',
                    interior_num: addr.interior_num || '', colonia: addr.colonia || '',
                    zip_code: addr.zip_code || '', city: addr.city || '', state: addr.state || '',
                });
                setDeclarations({
                    info_true: dp.declaration_info_true || false,
                    terms: dp.declaration_terms_accepted || false,
                    contract: dp.declaration_contract_accepted || false,
                });

                // Determine step from status
                if (dp.onboarding_status === 'active' || dp.onboarding_status === 'contract_signed') setStep(5);
                else if (dp.onboarding_status === 'contract_generated') setStep(5);
                else if (dp.declarations_accepted_at) setStep(5);
                else if (dp.onboarding_status === 'docs_uploaded') setStep(4);
                else setStep(2);

                // Load docs
                const { data: docs } = await supabase
                    .from('distributor_documents')
                    .select('*')
                    .eq('distributor_profile_id', dp.id);
                if (docs) setDocuments(docs);

                // Load contract
                const { data: cont } = await supabase
                    .from('distributor_contracts')
                    .select('*')
                    .eq('distributor_profile_id', dp.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                if (cont) setContract(cont);
            }
            setLoading(false);
        }
        load();
    }, []);

    const getIp = async () => {
        try {
            const r = await fetch('/api/get-ip');
            const d = await r.json();
            return d.ip || 'unknown';
        } catch { return 'unknown'; }
    };

    // Generate signed URL for private bucket files (valid 1 hour)
    const getSignedUrl = async (storagePath) => {
        if (!storagePath) { alert('No se encontró la ruta del archivo.'); return null; }
        // Handle old data that may have full URL instead of just path
        let cleanPath = storagePath;
        const match = storagePath.match(/onboarding-docs\/(.+?)(\?|$)/);
        if (match) cleanPath = match[1];

        const { data, error } = await supabase.storage.from('onboarding-docs').createSignedUrl(cleanPath, 3600);
        if (error || !data?.signedUrl) {
            alert('Error al generar enlace de descarga: ' + (error?.message || 'Archivo no encontrado'));
            return null;
        }
        return data.signedUrl;
    };

    const auditLog = async (action, details = {}, profileId = null) => {
        const ip = await getIp();
        await supabase.from('onboarding_audit_log').insert({
            user_id: userId,
            distributor_profile_id: profileId || profile?.id,
            action,
            details,
            ip_address: ip,
        });
    };

    // STEP 1: Save person type
    const handleSavePersonType = async () => {
        if (!personType) return;
        setSaving(true);
        if (profile) {
            await supabase.from('distributor_profiles').update({ person_type: personType, updated_at: new Date().toISOString() }).eq('id', profile.id);
            setProfile({ ...profile, person_type: personType });
        } else {
            const { data, error } = await supabase.from('distributor_profiles').insert({
                user_id: userId, person_type: personType,
            }).select().single();
            if (data) {
                setProfile(data);
                await auditLog('profile_created', { person_type: personType }, data.id);
            }
        }
        setSaving(false);
        setStep(2);
    };

    // STEP 2: Save general data
    const handleSaveGeneralData = async () => {
        if (!profile) return;
        setSaving(true);
        const fiscal_address = {
            street: formData.street, exterior_num: formData.exterior_num,
            interior_num: formData.interior_num, colonia: formData.colonia,
            zip_code: formData.zip_code, city: formData.city, state: formData.state, country: 'México',
        };
        const updateData = {
            rfc: formData.rfc, tax_regime: formData.tax_regime,
            email: formData.email, phone: formData.phone,
            fiscal_address, updated_at: new Date().toISOString(),
        };
        if (personType === 'fisica') {
            updateData.full_name = formData.full_name;
            updateData.curp = formData.curp;
        } else {
            updateData.legal_name = formData.legal_name;
            updateData.legal_rep_name = formData.legal_rep_name;
        }
        await supabase.from('distributor_profiles').update(updateData).eq('id', profile.id);
        await auditLog('profile_updated', updateData);
        setProfile({ ...profile, ...updateData });
        setSaving(false);
        setStep(3);
    };

    // STEP 3: Upload document
    const handleUploadDoc = async (docType, file) => {
        if (!file || !profile) return;
        setUploading(prev => ({ ...prev, [docType]: true }));
        const ext = file.name.split('.').pop();
        const path = `${userId}/${docType}_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('onboarding-docs')
            .upload(path, file, { cacheControl: '3600', upsert: true });

        if (uploadError) {
            alert('Error al subir: ' + uploadError.message);
            setUploading(prev => ({ ...prev, [docType]: false }));
            return;
        }

        const ip = await getIp();

        // Delete existing doc of same type
        const existing = documents.find(d => d.document_type === docType);
        if (existing) {
            await supabase.from('distributor_documents').delete().eq('id', existing.id);
        }

        const { data: doc } = await supabase.from('distributor_documents').insert({
            distributor_profile_id: profile.id,
            user_id: userId,
            document_type: docType,
            file_name: file.name,
            file_url: path,
            file_size: file.size,
            mime_type: file.type,
            upload_ip: ip,
        }).select().single();

        if (doc) {
            setDocuments(prev => [...prev.filter(d => d.document_type !== docType), doc]);
            await auditLog('document_uploaded', { document_type: docType, file_name: file.name });
        }
        setUploading(prev => ({ ...prev, [docType]: false }));
    };

    const requiredDocs = personType === 'fisica' ? DOCS_FISICA : DOCS_MORAL;
    const allDocsUploaded = requiredDocs.every(rd => documents.some(d => d.document_type === rd.type));

    const handleFinishDocs = async () => {
        if (!allDocsUploaded) { alert('Sube todos los documentos requeridos.'); return; }
        await supabase.from('distributor_profiles').update({ onboarding_status: 'docs_uploaded', updated_at: new Date().toISOString() }).eq('id', profile.id);
        await auditLog('status_changed', { new_status: 'docs_uploaded' });
        setProfile({ ...profile, onboarding_status: 'docs_uploaded' });
        setStep(4);
    };

    // STEP 4: Declarations
    const handleAcceptDeclarations = async () => {
        if (!declarations.info_true || !declarations.terms || !declarations.contract) {
            alert('Debes aceptar todas las declaraciones.'); return;
        }
        setSaving(true);
        const ip = await getIp();
        await supabase.from('distributor_profiles').update({
            declaration_info_true: true,
            declaration_terms_accepted: true,
            declaration_contract_accepted: true,
            declarations_accepted_at: new Date().toISOString(),
            declarations_ip: ip,
            onboarding_status: 'contract_generated',
            updated_at: new Date().toISOString(),
        }).eq('id', profile.id);

        await auditLog('consent_accepted', { ip, declarations });
        setProfile({ ...profile, onboarding_status: 'contract_generated', declarations_accepted_at: new Date().toISOString() });
        setSaving(false);
        setStep(5);
    };

    // STEP 5: Generate contract PDF
    const generateContractPdf = useCallback(async () => {
        setGeneratingPdf(true);
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF('p', 'mm', 'letter');
        const margin = 20;
        const pageW = 215.9;
        const contentW = pageW - margin * 2;
        let y = margin;

        const addText = (text, size = 10, style = 'normal', align = 'left') => {
            doc.setFontSize(size);
            doc.setFont('helvetica', style);
            const lines = doc.splitTextToSize(text, contentW);
            lines.forEach(line => {
                if (y > 260) { doc.addPage(); y = margin; }
                doc.text(line, align === 'center' ? pageW / 2 : margin, y, { align });
                y += size * 0.45;
            });
            y += 2;
        };

        // Header
        addText('CONTRATO DE COLABORACIÓN COMERCIAL', 16, 'bold', 'center');
        y += 5;
        addText('GREENLAND PRODUCTS', 12, 'bold', 'center');
        y += 10;

        // Date
        const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
        addText(`Fecha: ${fecha}`, 10);
        y += 5;

        // Parties
        addText('PARTES:', 12, 'bold');
        addText('Por una parte, GREENLAND PRODUCTS (en adelante "LA EMPRESA"), con domicilio en [Domicilio de Greenland].', 10);
        y += 3;

        const nombre = personType === 'fisica' ? formData.full_name : formData.legal_name;
        const tipo = personType === 'fisica' ? 'Persona Física' : 'Persona Moral';
        addText(`Por otra parte, ${nombre || '[Nombre del Distribuidor]'} (en adelante "EL DISTRIBUIDOR"), ${tipo}, con RFC ${formData.rfc || '[RFC]'}, con domicilio fiscal en ${formData.street || '[Calle]'} ${formData.exterior_num || ''}, Col. ${formData.colonia || '[Colonia]'}, C.P. ${formData.zip_code || '[CP]'}, ${formData.city || '[Ciudad]'}, ${formData.state || '[Estado]'}.`, 10);
        y += 3;

        if (personType === 'moral' && formData.legal_rep_name) {
            addText(`Representado legalmente por: ${formData.legal_rep_name}`, 10);
            y += 3;
        }

        // Clauses (placeholder — will be replaced with real contract text)
        y += 5;
        addText('DECLARACIONES:', 12, 'bold');
        y += 2;
        addText('I. LA EMPRESA declara ser una persona moral legalmente constituida conforme a las leyes mexicanas, dedicada a la fabricación y comercialización de mobiliario.', 10);
        addText('II. EL DISTRIBUIDOR declara que los datos proporcionados en el proceso de registro son veraces y que cuenta con la capacidad legal para celebrar el presente contrato.', 10);
        addText('III. Ambas partes declaran su libre voluntad de celebrar el presente contrato.', 10);

        y += 5;
        addText('CLÁUSULAS:', 12, 'bold');
        y += 2;

        const clausulas = [
            { title: 'PRIMERA — Objeto', text: 'El presente contrato tiene como objeto establecer los términos y condiciones bajo los cuales EL DISTRIBUIDOR comercializará los productos de LA EMPRESA en el territorio acordado.' },
            { title: 'SEGUNDA — Obligaciones del Distribuidor', text: 'EL DISTRIBUIDOR se obliga a: (a) Adquirir productos exclusivamente de LA EMPRESA; (b) Mantener existencias mínimas según política comercial; (c) Respetar precios sugeridos; (d) Proporcionar reportes de inventario cuando se soliciten.' },
            { title: 'TERCERA — Obligaciones de la Empresa', text: 'LA EMPRESA se obliga a: (a) Suministrar productos en tiempo y forma; (b) Proporcionar material de apoyo para la venta; (c) Respetar los territorios asignados.' },
            { title: 'CUARTA — Precios y Pagos', text: 'Los precios serán los establecidos en la lista vigente de LA EMPRESA. Los pagos se realizarán según los términos acordados para cada pedido.' },
            { title: 'QUINTA — Vigencia', text: 'El presente contrato tendrá una vigencia de 1 (un) año a partir de la fecha de firma, con renovación automática por períodos iguales salvo notificación por escrito con 30 días de anticipación.' },
            { title: 'SEXTA — Confidencialidad', text: 'Ambas partes se obligan a mantener la confidencialidad de la información comercial, técnica y financiera que se intercambie con motivo del presente contrato.' },
            { title: 'SÉPTIMA — Jurisdicción', text: 'Para la interpretación y cumplimiento del presente contrato, las partes se someten a la jurisdicción de los tribunales competentes de la Ciudad de México, renunciando a cualquier otro fuero que pudiera corresponderles.' },
        ];

        clausulas.forEach(c => {
            addText(c.title, 10, 'bold');
            addText(c.text, 10);
            y += 3;
        });

        // Signature area
        y += 15;
        if (y > 230) { doc.addPage(); y = margin + 20; }
        addText('FIRMAS:', 12, 'bold');
        y += 10;

        doc.setDrawColor(150);
        // Left: Empresa
        doc.line(margin, y, margin + 70, y);
        doc.setFontSize(9);
        doc.text('Por LA EMPRESA', margin, y + 5);
        doc.text('Greenland Products', margin, y + 10);

        // Right: Distribuidor
        doc.line(margin + 100, y, margin + 100 + 70, y);
        doc.text('Por EL DISTRIBUIDOR', margin + 100, y + 5);
        doc.text(nombre || '[Nombre]', margin + 100, y + 10);

        return doc;
    }, [personType, formData]);

    const handleGenerateContract = async () => {
        setGeneratingPdf(true);
        try {
            const doc = await generateContractPdf();
            const pdfBlob = doc.output('blob');

            // Upload PDF
            const path = `${userId}/contrato_v1_${Date.now()}.pdf`;
            await supabase.storage.from('onboarding-docs').upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true });

            // Save contract record (store path, not public URL)
            const { data: cont } = await supabase.from('distributor_contracts').insert({
                distributor_profile_id: profile.id, user_id: userId,
                contract_pdf_url: path,
                status: 'generated',
            }).select().single();

            if (cont) {
                setContract(cont);
                await auditLog('contract_generated', { contract_id: cont.id });
            }
        } catch (err) {
            alert('Error generando contrato: ' + err.message);
        }
        setGeneratingPdf(false);
    };

    // Canvas signature
    const initCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    useEffect(() => { if (step === 5) setTimeout(initCanvas, 200); }, [step, initCanvas]);

    const getPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };

    const startDraw = (e) => {
        e.preventDefault();
        setIsDrawing(true);
        const ctx = canvasRef.current.getContext('2d');
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const ctx = canvasRef.current.getContext('2d');
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        setHasSigned(true);
    };

    const endDraw = () => setIsDrawing(false);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSigned(false);
    };

    // Sign contract
    const handleSignContract = async () => {
        if (!hasSigned || !contract) { alert('Dibuja tu firma primero.'); return; }
        setGeneratingPdf(true);

        try {
            // Get signature as image
            const sigDataUrl = canvasRef.current.toDataURL('image/png');

            // Regenerate PDF with signature embedded
            const doc = await generateContractPdf();
            const pageCount = doc.internal.getNumberOfPages();
            doc.setPage(pageCount);

            // Add signature image at distributor's signing area
            const sigY = 240;
            doc.addImage(sigDataUrl, 'PNG', 120, sigY - 30, 55, 25);

            const pdfBlob = doc.output('blob');

            // Compute hash
            const arrayBuf = await pdfBlob.arrayBuffer();
            const hashBuf = await crypto.subtle.digest('SHA-256', arrayBuf);
            const hashArr = Array.from(new Uint8Array(hashBuf));
            const hashHex = hashArr.map(b => b.toString(16).padStart(2, '0')).join('');

            // Upload signed PDF
            const path = `${userId}/contrato_firmado_${Date.now()}.pdf`;
            await supabase.storage.from('onboarding-docs').upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true });

            // Upload signature image
            const sigBlob = await (await fetch(sigDataUrl)).blob();
            const sigPath = `${userId}/firma_${Date.now()}.png`;
            await supabase.storage.from('onboarding-docs').upload(sigPath, sigBlob, { contentType: 'image/png', upsert: true });

            const ip = await getIp();

            // Update contract (store paths, not public URLs)
            await supabase.from('distributor_contracts').update({
                contract_signed_pdf_url: path,
                signature_image_url: sigPath,
                signed_at: new Date().toISOString(),
                signer_ip: ip,
                document_hash: hashHex,
                status: 'signed',
            }).eq('id', contract.id);

            // Update profile status
            await supabase.from('distributor_profiles').update({
                onboarding_status: 'contract_signed',
                updated_at: new Date().toISOString(),
            }).eq('id', profile.id);

            await auditLog('contract_signed', { contract_id: contract.id, hash: hashHex, ip });

            setContract({ ...contract, status: 'signed', contract_signed_pdf_url: path, document_hash: hashHex });
            setProfile({ ...profile, onboarding_status: 'contract_signed' });
            alert('✅ ¡Contrato firmado exitosamente! Tu expediente está completo.');
        } catch (err) {
            alert('Error al firmar: ' + err.message);
        }
        setGeneratingPdf(false);
    };

    const updateField = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#6a9a04]" />
        </div>
    );

    const isComplete = profile?.onboarding_status === 'contract_signed' || profile?.onboarding_status === 'active';

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mi Expediente</h1>
                <p className="text-slate-500 mt-1">Completa tu registro y firma tu contrato de colaboración con Greenland</p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-between bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-4 mb-8 overflow-x-auto">
                {STEPS.map((s, i) => (
                    <div key={s.num} className="flex items-center">
                        <button
                            onClick={() => {
                                // Only allow going back, not forward past completed steps
                                if (s.num <= step || (profile && s.num <= step)) setStep(s.num);
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer border-none ${step === s.num ? 'bg-[#6a9a04] text-white shadow-lg shadow-[#6a9a04]/30' :
                                s.num < step ? 'bg-[#6a9a04]/10 text-[#6a9a04]' :
                                    'bg-slate-100 text-slate-400'
                                }`}
                        >
                            {s.num < step ? <Check size={16} /> : <s.icon size={16} />}
                            <span className="hidden sm:inline">{s.label}</span>
                            <span className="sm:hidden">{s.num}</span>
                        </button>
                        {i < STEPS.length - 1 && <ChevronRight size={16} className="text-slate-300 mx-1 shrink-0" />}
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 md:p-8">

                {/* STEP 1: Person Type */}
                {step === 1 && (
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">¿Qué tipo de persona eres?</h2>
                        <p className="text-sm text-slate-500 mb-6">Selecciona el tipo de persona para tu registro fiscal y legal.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            {[
                                { val: 'fisica', icon: User, title: 'Persona Física', desc: 'Actividad empresarial a nombre propio' },
                                { val: 'moral', icon: Building2, title: 'Persona Moral', desc: 'Empresa o sociedad legalmente constituida' },
                            ].map(opt => (
                                <button key={opt.val}
                                    onClick={() => setPersonType(opt.val)}
                                    className={`p-6 rounded-2xl border-2 text-left transition-all cursor-pointer bg-white ${personType === opt.val ? 'border-[#6a9a04] bg-[#6a9a04]/5 shadow-lg shadow-[#6a9a04]/10' : 'border-slate-200 hover:border-[#6a9a04]/50'
                                        }`}>
                                    <opt.icon className={`w-8 h-8 mb-3 ${personType === opt.val ? 'text-[#6a9a04]' : 'text-slate-400'}`} />
                                    <h3 className="font-bold text-lg text-slate-900">{opt.title}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{opt.desc}</p>
                                </button>
                            ))}
                        </div>
                        <button onClick={handleSavePersonType} disabled={!personType || saving}
                            className="flex items-center gap-2 bg-[#6a9a04] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#6a9a04]/20 hover:bg-[#6a9a04]/90 transition-all border-none cursor-pointer disabled:opacity-50">
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />} Continuar
                        </button>
                    </div>
                )}

                {/* STEP 2: General Data */}
                {step === 2 && (
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Datos Generales</h2>
                        <p className="text-sm text-slate-500 mb-6">
                            {personType === 'fisica' ? 'Ingresa tus datos fiscales como Persona Física.' : 'Ingresa los datos de tu empresa.'}
                        </p>

                        <div className="space-y-6">
                            {/* Name / Legal Name */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {personType === 'fisica' ? (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 mb-1">Nombre Completo *</label>
                                            <input type="text" value={formData.full_name} onChange={e => updateField('full_name', e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 outline-none shadow-sm" placeholder="Nombre(s) y Apellidos" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 mb-1">CURP *</label>
                                            <input type="text" value={formData.curp} onChange={e => updateField('curp', e.target.value.toUpperCase())}
                                                maxLength={18} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 outline-none shadow-sm font-mono" placeholder="XXXX000000XXXXXXXX" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 mb-1">Razón Social *</label>
                                            <input type="text" value={formData.legal_name} onChange={e => updateField('legal_name', e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 outline-none shadow-sm" placeholder="Razón Social S.A. de C.V." />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 mb-1">Representante Legal *</label>
                                            <input type="text" value={formData.legal_rep_name} onChange={e => updateField('legal_rep_name', e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 outline-none shadow-sm" placeholder="Nombre del representante" />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* RFC + Tax Regime */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">RFC *</label>
                                    <input type="text" value={formData.rfc} onChange={e => updateField('rfc', e.target.value.toUpperCase())}
                                        maxLength={13} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 outline-none shadow-sm font-mono" placeholder={personType === 'fisica' ? 'XXXX000000XX0' : 'XXX000000XX0'} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Régimen Fiscal *</label>
                                    <select value={formData.tax_regime} onChange={e => updateField('tax_regime', e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 outline-none shadow-sm">
                                        <option value="">— Seleccionar —</option>
                                        {TAX_REGIMES.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Contact */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Correo Electrónico *</label>
                                    <input type="email" value={formData.email} onChange={e => updateField('email', e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 outline-none shadow-sm" placeholder="correo@ejemplo.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Teléfono *</label>
                                    <input type="tel" value={formData.phone} onChange={e => updateField('phone', e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 outline-none shadow-sm" placeholder="10 dígitos" />
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Shield size={14} className="text-[#6a9a04]" /> Domicilio Fiscal</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Calle *</label>
                                        <input type="text" value={formData.street} onChange={e => updateField('street', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 outline-none shadow-sm text-sm" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">No. Ext</label>
                                            <input type="text" value={formData.exterior_num} onChange={e => updateField('exterior_num', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 outline-none shadow-sm text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">No. Int</label>
                                            <input type="text" value={formData.interior_num} onChange={e => updateField('interior_num', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 outline-none shadow-sm text-sm" />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Colonia *</label>
                                        <input type="text" value={formData.colonia} onChange={e => updateField('colonia', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 outline-none shadow-sm text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">C.P. *</label>
                                        <input type="text" value={formData.zip_code} onChange={e => updateField('zip_code', e.target.value)}
                                            maxLength={5} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 outline-none shadow-sm text-sm font-mono" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Ciudad *</label>
                                        <input type="text" value={formData.city} onChange={e => updateField('city', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 outline-none shadow-sm text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Estado *</label>
                                        <input type="text" value={formData.state} onChange={e => updateField('state', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 outline-none shadow-sm text-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between mt-8">
                            <button onClick={() => setStep(1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-800 font-medium bg-transparent border-none cursor-pointer">
                                <ArrowLeft size={18} /> Atrás
                            </button>
                            <button onClick={handleSaveGeneralData} disabled={saving}
                                className="flex items-center gap-2 bg-[#6a9a04] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#6a9a04]/20 hover:bg-[#6a9a04]/90 transition-all border-none cursor-pointer disabled:opacity-50">
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />} Guardar y Continuar
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Documents */}
                {step === 3 && (
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Carga de Documentos</h2>
                        <p className="text-sm text-slate-500 mb-6">Sube los documentos requeridos en formato PDF o JPG (máx. 10MB cada uno).</p>

                        <div className="space-y-4">
                            {requiredDocs.map(rd => {
                                const doc = documents.find(d => d.document_type === rd.type);
                                return (
                                    <div key={rd.type} className={`p-4 rounded-xl border-2 ${doc ? 'border-[#6a9a04]/30 bg-[#6a9a04]/5' : 'border-dashed border-slate-300 bg-slate-50/50'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {doc ? <Check size={20} className="text-[#6a9a04]" /> : <Upload size={20} className="text-slate-400" />}
                                                <div>
                                                    <p className="font-bold text-sm text-slate-800">{rd.label}</p>
                                                    {doc && (
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            {doc.file_name} — {new Date(doc.uploaded_at).toLocaleDateString('es-MX')}
                                                            {doc.status === 'approved' && <span className="ml-2 text-[#6a9a04] font-bold">✓ Aprobado</span>}
                                                            {doc.status === 'rejected' && <span className="ml-2 text-red-500 font-bold">✗ Rechazado</span>}
                                                            {doc.status === 'pending' && <span className="ml-2 text-amber-500 font-bold">⏳ Pendiente</span>}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {doc && (
                                                    <button onClick={async () => { const url = await getSignedUrl(doc.file_url); window.open(url, '_blank'); }}
                                                        className="p-2 hover:bg-white rounded-lg transition-colors border-none bg-transparent cursor-pointer" title="Ver documento">
                                                        <Eye size={16} className="text-slate-500" />
                                                    </button>
                                                )}
                                                <label className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${uploading[rd.type] ? 'bg-slate-200 text-slate-500' : 'bg-[#6a9a04] text-white hover:bg-[#6a9a04]/90 shadow-sm'
                                                    }`}>
                                                    {uploading[rd.type] ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                                    {doc ? 'Reemplazar' : 'Subir'}
                                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                                                        onChange={e => { if (e.target.files[0]) handleUploadDoc(rd.type, e.target.files[0]); }}
                                                        disabled={uploading[rd.type]} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-between mt-8">
                            <button onClick={() => setStep(2)} className="flex items-center gap-2 text-slate-600 hover:text-slate-800 font-medium bg-transparent border-none cursor-pointer">
                                <ArrowLeft size={18} /> Atrás
                            </button>
                            <button onClick={handleFinishDocs} disabled={!allDocsUploaded}
                                className="flex items-center gap-2 bg-[#6a9a04] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#6a9a04]/20 hover:bg-[#6a9a04]/90 transition-all border-none cursor-pointer disabled:opacity-50">
                                <ArrowRight size={18} /> Continuar
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4: Declarations */}
                {step === 4 && (
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Consentimiento y Aceptación</h2>
                        <p className="text-sm text-slate-500 mb-6">Lee y acepta los siguientes puntos para continuar con la firma del contrato.</p>

                        <div className="space-y-4 mb-8">
                            {[
                                { key: 'info_true', text: 'Declaro bajo protesta de decir verdad que la información proporcionada es veraz y corresponde a mi identidad y situación fiscal actual.' },
                                { key: 'terms', text: 'Acepto los términos y condiciones comerciales de Greenland Products, incluyendo políticas de precios, pagos y devoluciones.' },
                                { key: 'contract', text: 'Acepto celebrar el contrato de colaboración comercial con Greenland Products bajo los términos que se me presentarán en el siguiente paso.' },
                            ].map(d => (
                                <label key={d.key} className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${declarations[d.key] ? 'border-[#6a9a04]/30 bg-[#6a9a04]/5' : 'border-slate-200 hover:border-slate-300'
                                    }`}>
                                    <input type="checkbox" checked={declarations[d.key]}
                                        onChange={e => setDeclarations(prev => ({ ...prev, [d.key]: e.target.checked }))}
                                        className="mt-1 w-5 h-5 accent-[#6a9a04] shrink-0" />
                                    <span className="text-sm text-slate-700 leading-relaxed">{d.text}</span>
                                </label>
                            ))}
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                            <p className="text-xs text-amber-800 flex items-center gap-2">
                                <AlertTriangle size={14} /> Al aceptar, se registrará tu dirección IP, fecha y hora como evidencia legal de tu consentimiento.
                            </p>
                        </div>

                        <div className="flex justify-between">
                            <button onClick={() => setStep(3)} className="flex items-center gap-2 text-slate-600 hover:text-slate-800 font-medium bg-transparent border-none cursor-pointer">
                                <ArrowLeft size={18} /> Atrás
                            </button>
                            <button onClick={handleAcceptDeclarations} disabled={saving || !declarations.info_true || !declarations.terms || !declarations.contract}
                                className="flex items-center gap-2 bg-[#6a9a04] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#6a9a04]/20 hover:bg-[#6a9a04]/90 transition-all border-none cursor-pointer disabled:opacity-50">
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckSquare size={18} />} Aceptar y Continuar
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 5: Contract + Signature */}
                {step === 5 && (
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">
                            {isComplete ? '✅ Expediente Completo' : 'Contrato y Firma Digital'}
                        </h2>
                        <p className="text-sm text-slate-500 mb-6">
                            {isComplete
                                ? 'Tu contrato ha sido firmado exitosamente. Tu expediente está completo.'
                                : 'Genera tu contrato prellenado, revísalo y fírmalo digitalmente.'}
                        </p>

                        {/* Generate contract */}
                        {!contract && (
                            <div className="text-center py-8">
                                <FileText size={48} className="text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500 mb-4">Genera tu contrato de colaboración con los datos que proporcionaste.</p>
                                <button onClick={handleGenerateContract} disabled={generatingPdf}
                                    className="flex items-center gap-2 bg-[#6a9a04] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#6a9a04]/20 hover:bg-[#6a9a04]/90 transition-all border-none cursor-pointer mx-auto disabled:opacity-50">
                                    {generatingPdf ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />} Generar Contrato
                                </button>
                            </div>
                        )}

                        {/* Contract generated but not signed */}
                        {contract && contract.status !== 'signed' && (
                            <div>
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <FileText size={24} className="text-blue-500" />
                                            <div>
                                                <p className="font-bold text-sm text-slate-800">Contrato generado</p>
                                                <p className="text-xs text-slate-500">Revísalo antes de firmar</p>
                                            </div>
                                        </div>
                                        <button onClick={async () => { const url = await getSignedUrl(contract.contract_pdf_url); if (url) window.open(url, '_blank'); }}
                                            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-600 transition-all border-none cursor-pointer">
                                            <Download size={16} /> Ver / Descargar
                                        </button>
                                    </div>
                                </div>

                                {/* Signature area */}
                                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6">
                                    <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                        <PenLine size={18} className="text-[#6a9a04]" /> Firma Digital
                                    </h3>
                                    <p className="text-sm text-slate-500 mb-4">Dibuja tu firma con el dedo, stylus o mouse en el recuadro.</p>

                                    <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden mb-4" style={{ touchAction: 'none' }}>
                                        <canvas ref={canvasRef}
                                            className="w-full cursor-crosshair"
                                            style={{ height: '180px', display: 'block' }}
                                            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                                            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
                                        />
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <button onClick={clearCanvas}
                                            className="flex items-center gap-1 text-slate-500 hover:text-red-500 text-sm font-medium bg-transparent border-none cursor-pointer">
                                            <X size={16} /> Limpiar firma
                                        </button>
                                        <button onClick={handleSignContract} disabled={!hasSigned || generatingPdf}
                                            className="flex items-center gap-2 bg-[#6a9a04] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#6a9a04]/20 hover:bg-[#6a9a04]/90 transition-all border-none cursor-pointer disabled:opacity-50">
                                            {generatingPdf ? <Loader2 size={18} className="animate-spin" /> : <PenLine size={18} />} Firmar Contrato
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Contract signed */}
                        {contract && contract.status === 'signed' && (
                            <div className="space-y-4">
                                <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Check size={24} className="text-green-600" />
                                        <h3 className="font-bold text-green-800">Contrato firmado exitosamente</h3>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <p className="text-xs text-slate-500 font-bold uppercase">Firmado</p>
                                            <p className="text-slate-700">{contract.signed_at ? new Date(contract.signed_at).toLocaleString('es-MX') : '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-bold uppercase">IP</p>
                                            <p className="text-slate-700 font-mono text-xs">{contract.signer_ip || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-bold uppercase">Hash SHA-256</p>
                                            <p className="text-slate-700 font-mono text-[10px] break-all">{contract.document_hash?.substring(0, 16)}...</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-bold uppercase">Estatus</p>
                                            <p className="text-green-600 font-bold">✅ Firmado</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={async () => { const url = await getSignedUrl(contract.contract_signed_pdf_url); if (url) window.open(url, '_blank'); }}
                                        className="flex items-center gap-2 bg-[#6a9a04] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#6a9a04]/90 transition-all border-none cursor-pointer">
                                        <Download size={16} /> Descargar Contrato Firmado
                                    </button>
                                </div>
                            </div>
                        )}

                        {!isComplete && contract && (
                            <div className="mt-6">
                                <button onClick={() => setStep(4)} className="flex items-center gap-2 text-slate-600 hover:text-slate-800 font-medium bg-transparent border-none cursor-pointer">
                                    <ArrowLeft size={18} /> Atrás
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

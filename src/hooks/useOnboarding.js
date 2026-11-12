'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { User, FileText, Upload, CheckSquare, PenLine } from 'lucide-react';

export const TAX_REGIMES = [
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

export const DOCS_FISICA = [
  { type: 'identificacion', label: 'Identificación oficial (INE o Pasaporte)', required: true },
  { type: 'comprobante_domicilio', label: 'Comprobante de domicilio (≤ 3 meses)', required: true },
  { type: 'constancia_fiscal', label: 'Constancia de Situación Fiscal (PDF SAT)', required: true },
];

export const DOCS_MORAL = [
  { type: 'acta_constitutiva', label: 'Acta Constitutiva', required: true },
  { type: 'poder_representante', label: 'Poder del Representante Legal', required: true },
  { type: 'identificacion_rep', label: 'Identificación del Representante Legal', required: true },
  { type: 'constancia_fiscal', label: 'Constancia de Situación Fiscal', required: true },
  { type: 'comprobante_domicilio', label: 'Comprobante de Domicilio Fiscal', required: true },
];

export const STEPS = [
  { num: 1, label: 'Tipo de Persona', icon: User },
  { num: 2, label: 'Datos Generales', icon: FileText },
  { num: 3, label: 'Documentos', icon: Upload },
  { num: 4, label: 'Consentimiento', icon: CheckSquare },
  { num: 5, label: 'Contrato y Firma', icon: PenLine },
];

export function useOnboarding() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [contract, setContract] = useState(null);
  const [uploading, setUploading] = useState({});
  const [powerInActa, setPowerInActa] = useState(false);

  // Form state
  const [personType, setPersonType] = useState('');
  const [formData, setFormData] = useState({
    rfc: '', curp: '', tax_regime: '', email: '', phone: '',
    full_name: '', legal_name: '', legal_rep_name: '',
    street: '', exterior_num: '', interior_num: '', colonia: '',
    zip_code: '', city: '', state: '',
  });
  const [declarations, setDeclarations] = useState({
    info_true: false, terms: false, contract: false, privacy: false, terms_use: false,
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
          privacy: dp.declaration_privacy_accepted || false,
          terms_use: dp.declaration_terms_use_accepted || false,
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
        if (docs) {
          setDocuments(docs);
          const acta = docs.find(d => d.document_type === 'acta_constitutiva');
          const poder = docs.find(d => d.document_type === 'poder_representante');
          if (acta && poder && (poder.file_url === acta.file_url || (poder.file_name && poder.file_name.includes('Incluido en Acta Constitutiva')))) {
            setPowerInActa(true);
          }
        }

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
      const { data } = await supabase.from('distributor_profiles').insert({
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
  const handleTogglePowerInActa = async (checked) => {
    setPowerInActa(checked);
    if (!profile) return;
    const acta = documents.find(d => d.document_type === 'acta_constitutiva');
    const existingPoder = documents.find(d => d.document_type === 'poder_representante');

    if (checked) {
      if (acta) {
        if (existingPoder) {
          await supabase.from('distributor_documents').delete().eq('id', existingPoder.id);
        }
        const ip = await getIp();
        const { data: doc } = await supabase.from('distributor_documents').insert({
          distributor_profile_id: profile.id,
          user_id: userId,
          document_type: 'poder_representante',
          file_name: `${acta.file_name} (Incluido en Acta Constitutiva)`,
          file_url: acta.file_url,
          file_size: acta.file_size,
          mime_type: acta.mime_type,
          upload_ip: ip,
        }).select().single();

        if (doc) {
          setDocuments(prev => [...prev.filter(d => d.document_type !== 'poder_representante'), doc]);
        }
      }
    } else {
      if (existingPoder && (existingPoder.file_name?.includes('Incluido en Acta Constitutiva') || existingPoder.file_url === acta?.file_url)) {
        await supabase.from('distributor_documents').delete().eq('id', existingPoder.id);
        setDocuments(prev => prev.filter(d => d.document_type !== 'poder_representante'));
      }
    }
  };

  const handleUploadDoc = async (docType, file) => {
    if (!file || !profile) return;

    const MAX_MB = 50;
    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`El archivo "${file.name}" pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB, superando el límite máximo de ${MAX_MB} MB.\n\nPor favor compresiónalo gratuitamente en https://www.ilovepdf.com/es/comprimir_pdf antes de subirlo.`);
      return;
    }

    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    setUploading(prev => ({
      ...prev,
      [docType]: file.size > 10 * 1024 * 1024 ? `Subiendo (${sizeInMb} MB)... por favor espera` : true
    }));

    const ext = file.name.split('.').pop();
    const path = `${userId}/${docType}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('onboarding-docs')
      .upload(path, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
      alert('Error al subir: ' + uploadError.message + '\n\nSi el archivo es muy pesado, te recomendamos comprimirlo previamente en iLovePDF.');
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

    let updatedDocs = [...documents.filter(d => d.document_type !== docType)];

    if (doc) {
      updatedDocs.push(doc);
      await auditLog('document_uploaded', { document_type: docType, file_name: file.name });
    }

    // If uploading acta_constitutiva and powerInActa is checked, auto-link poder_representante
    if (docType === 'acta_constitutiva' && powerInActa && doc) {
      const existingPoder = updatedDocs.find(d => d.document_type === 'poder_representante');
      if (existingPoder) {
        await supabase.from('distributor_documents').delete().eq('id', existingPoder.id);
        updatedDocs = updatedDocs.filter(d => d.document_type !== 'poder_representante');
      }
      const { data: poderDoc } = await supabase.from('distributor_documents').insert({
        distributor_profile_id: profile.id,
        user_id: userId,
        document_type: 'poder_representante',
        file_name: `${file.name} (Incluido en Acta Constitutiva)`,
        file_url: path,
        file_size: file.size,
        mime_type: file.type,
        upload_ip: ip,
      }).select().single();

      if (poderDoc) {
        updatedDocs.push(poderDoc);
      }
    }

    setDocuments(updatedDocs);
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
    if (!declarations.info_true || !declarations.terms || !declarations.contract || !declarations.privacy || !declarations.terms_use) {
      alert('Debes aceptar todas las declaraciones.'); return;
    }
    setSaving(true);
    const ip = await getIp();
    await supabase.from('distributor_profiles').update({
      declaration_info_true: true,
      declaration_terms_accepted: true,
      declaration_contract_accepted: true,
      declaration_privacy_accepted: true,
      declaration_terms_use_accepted: true,
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

    // Clauses
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

      const path = `${userId}/contrato_v1_${Date.now()}.pdf`;
      await supabase.storage.from('onboarding-docs').upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true });

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
      const sigDataUrl = canvasRef.current.toDataURL('image/png');

      const doc = await generateContractPdf();
      const pageCount = doc.internal.getNumberOfPages();
      doc.setPage(pageCount);

      const sigY = 240;
      doc.addImage(sigDataUrl, 'PNG', 120, sigY - 30, 55, 25);

      const pdfBlob = doc.output('blob');

      const arrayBuf = await pdfBlob.arrayBuffer();
      const hashBuf = await crypto.subtle.digest('SHA-256', arrayBuf);
      const hashArr = Array.from(new Uint8Array(hashBuf));
      const hashHex = hashArr.map(b => b.toString(16).padStart(2, '0')).join('');

      const path = `${userId}/contrato_firmado_${Date.now()}.pdf`;
      await supabase.storage.from('onboarding-docs').upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true });

      const sigBlob = await (await fetch(sigDataUrl)).blob();
      const sigPath = `${userId}/firma_${Date.now()}.png`;
      await supabase.storage.from('onboarding-docs').upload(sigPath, sigBlob, { contentType: 'image/png', upsert: true });

      const ip = await getIp();

      await supabase.from('distributor_contracts').update({
        contract_signed_pdf_url: path,
        signature_image_url: sigPath,
        signed_at: new Date().toISOString(),
        signer_ip: ip,
        document_hash: hashHex,
        status: 'signed',
      }).eq('id', contract.id);

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
  const isComplete = profile?.onboarding_status === 'contract_signed' || profile?.onboarding_status === 'active';

  return {
    loading,
    saving,
    step,
    setStep,
    profile,
    documents,
    contract,
    uploading,
    powerInActa,
    personType,
    setPersonType,
    formData,
    updateField,
    declarations,
    setDeclarations,
    canvasRef,
    hasSigned,
    generatingPdf,
    requiredDocs,
    allDocsUploaded,
    isComplete,
    getSignedUrl,
    handleSavePersonType,
    handleSaveGeneralData,
    handleTogglePowerInActa,
    handleUploadDoc,
    handleFinishDocs,
    handleAcceptDeclarations,
    handleGenerateContract,
    startDraw,
    draw,
    endDraw,
    clearCanvas,
    handleSignContract,
  };
}

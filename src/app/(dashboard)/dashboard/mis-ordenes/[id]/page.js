'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, FileText, Upload, Download, Check, X, Send, 
  MessageSquare, DollarSign, Truck, Package, Clock, 
  AlertTriangle, Eye, Loader2, File, CheckCircle 
} from 'lucide-react';
import { formatDateOnly } from '@/utils/formatters';

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', color: '#fbbf24', bg: 'rgba(234,179,8,0.15)' },
  aceptada: { label: 'Aceptada', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  en_proceso: { label: 'En Proceso', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  completada: { label: 'Completada', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  rechazada: { label: 'Rechazada', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
};

const DOC_CATEGORIES = [
  { id: 'factura_pdf', name: 'Factura PDF', accept: '.pdf', border: 'border-l-blue-500' },
  { id: 'factura_xml', name: 'Factura XML', accept: '.xml', border: 'border-l-blue-500' },
  { id: 'carta_porte', name: 'Carta Porte', accept: '.pdf', border: 'border-l-indigo-500' },
  { id: 'pedimento', name: 'Pedimento', accept: '.pdf', border: 'border-l-amber-500' },
  { id: 'cita_carga', name: 'Cita de Carga / Maniobras', accept: '.pdf,.jpg,.jpeg,.png', border: 'border-l-orange-500' }
];

export default function SupplierOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [order, setOrder] = useState(null);
  const [reception, setReception] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // 1. Fetch Order
      const { data: orderData } = await supabase
        .from('service_orders')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!orderData) {
        setLoading(false);
        return;
      }
      setOrder(orderData);

      // 2. Fetch linked reception if any
      if (orderData.reception_id) {
        const { data: recData } = await supabase
          .from('container_receptions')
          .select('*')
          .eq('id', orderData.reception_id)
          .single();
        if (recData) setReception(recData);
      }

      // 3. Fetch evidence
      const { data: evData } = await supabase
        .from('service_order_evidence')
        .select('*')
        .eq('service_order_id', id);
      if (evData) setEvidence(evData);

      // 4. Fetch invoice
      const { data: invData } = await supabase
        .from('service_order_invoices')
        .select('*')
        .eq('service_order_id', id)
        .single();
      if (invData) setInvoice(invData);

      // 5. Fetch comments
      const { data: comData } = await supabase
        .from('service_order_comments')
        .select('*')
        .eq('service_order_id', id)
        .order('created_at', { ascending: true });
      if (comData) setComments(comData);

      setLoading(false);
    }
    
    if (id) fetchData();
  }, [id, supabase]);

  const handleFileUpload = async (e, category) => {
    const file = e.target.files?.[0];
    if (!file || !order || !currentUser) return;

    try {
      setUploadingDoc(category);
      const timestamp = new Date().getTime();
      const fileName = `${category}_${timestamp}_${file.name}`;
      const storagePath = `${order.supplier_id}/${order.id}/${fileName}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('supplier-documents')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Insert into evidence
      const { data: newEv, error: evError } = await supabase
        .from('service_order_evidence')
        .insert({
          service_order_id: order.id,
          file_url: storagePath,
          file_name: file.name,
          file_type: file.type,
          uploaded_by: currentUser.id,
          document_category: category
        })
        .select()
        .single();

      if (evError) throw evError;
      setEvidence(prev => [...prev, newEv]);

      // If it's factura_pdf or xml, create/update invoice record
      if (category === 'factura_pdf' || category === 'factura_xml') {
        const updateField = category === 'factura_pdf' ? 'pdf_url' : 'xml_url';
        
        if (invoice) {
          // update existing
          const { data: updatedInv } = await supabase
            .from('service_order_invoices')
            .update({ [updateField]: storagePath })
            .eq('id', invoice.id)
            .select()
            .single();
          if (updatedInv) setInvoice(updatedInv);
        } else {
          // create new
          const { data: newInv } = await supabase
            .from('service_order_invoices')
            .insert({
              service_order_id: order.id,
              [updateField]: storagePath,
              invoiced_amount: order.agreed_amount,
              invoice_date: new Date().toISOString(),
              validation_status: 'pendiente',
              payment_status: 'pending'
            })
            .select()
            .single();
          if (newInv) setInvoice(newInv);
        }
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Hubo un error al subir el archivo.');
    } finally {
      setUploadingDoc(null);
    }
  };

  const downloadFile = async (path, name) => {
    try {
      const { data, error } = await supabase.storage
        .from('supplier-documents')
        .createSignedUrl(path, 60 * 60); // 1 hour

      if (error) throw error;
      
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error al descargar el archivo');
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !currentUser || !order) return;
    
    setSendingComment(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUser.id)
        .single();

      const userName = profile?.full_name || currentUser.email;

      const { data, error } = await supabase
        .from('service_order_comments')
        .insert({
          service_order_id: order.id,
          user_id: currentUser.id,
          user_name: userName,
          message: newComment.trim()
        })
        .select()
        .single();

      if (error) throw error;
      
      setComments(prev => [...prev, data]);
      setNewComment('');
    } catch (error) {
      console.error('Error sending comment:', error);
    } finally {
      setSendingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#6a9a04]" />
        <p className="font-medium">Cargando detalles de orden...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
        <p className="font-medium text-lg">Orden no encontrada.</p>
        <Link href="/dashboard/mis-ordenes" className="text-[#6a9a04] font-bold hover:underline">← Volver a mis órdenes</Link>
      </div>
    );
  }

  const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pendiente;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/mis-ordenes" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              OS #{order.order_number || order.id.slice(0,8)} — <span className="capitalize">{order.service_type}</span>
            </h1>
            <p className="text-sm text-slate-500">
              Creada el {new Date(order.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div>
          <span className="text-sm font-bold px-4 py-2 rounded-full capitalize" style={{ color: sc.color, background: sc.bg }}>
            {sc.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: INFO & COMMENTS */}
        <div className="lg:col-span-1 space-y-6">
          {/* INFO CARD */}
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Detalles del Servicio</h3>
            
            <div className="space-y-4">
              {order.description && (
                <div>
                  <div className="text-xs text-slate-400 mb-1">Descripción</div>
                  <div className="text-sm text-slate-700">{order.description}</div>
                </div>
              )}
              
              <div className="flex gap-3">
                <Clock className="text-slate-400 shrink-0" size={18} />
                <div>
                  <div className="text-xs text-slate-400">Fecha Programada</div>
                  <div className="text-sm font-medium text-slate-700">
                    {order.scheduled_date ? formatDateOnly(order.scheduled_date) : 'Por definir'}
                  </div>
                </div>
              </div>

              {order.location && (
                <div className="flex gap-3">
                  <Truck className="text-slate-400 shrink-0" size={18} />
                  <div>
                    <div className="text-xs text-slate-400">Ubicación / Ruta</div>
                    <div className="text-sm font-medium text-slate-700">{order.location}</div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <DollarSign className="text-slate-400 shrink-0" size={18} />
                <div>
                  <div className="text-xs text-slate-400">Monto Acordado</div>
                  <div className="text-sm font-black text-[#6a9a04]">
                    ${Number(order.agreed_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                  </div>
                </div>
              </div>

              {reception && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">Referencia Operativa</h4>
                  
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{reception.container_label || 'Sin contenedor'}</span>
                  </div>
                  
                  {reception.pedimento_number && (
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-slate-400" />
                      <span className="text-sm text-slate-600">Pedimento: {reception.pedimento_number}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* INVOICE STATUS CARD */}
          {invoice && (
            <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Estado de Facturación</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Monto Facturado</span>
                  <span className="text-sm font-bold text-slate-900">
                    ${Number(invoice.invoiced_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Validación</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md capitalize ${
                    invoice.validation_status === 'aprobada' ? 'bg-green-100 text-green-700' :
                    invoice.validation_status === 'rechazada' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {invoice.validation_status}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Pago</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md capitalize ${
                    invoice.payment_status === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {invoice.payment_status === 'paid' ? 'Pagada' : 'Pendiente'}
                  </span>
                </div>

                {invoice.validation_status === 'rechazada' && invoice.rejection_reason && (
                  <div className="mt-3 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 flex gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{invoice.rejection_reason}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* COMMENTS */}
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 flex flex-col h-[400px]">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageSquare size={16} /> Comentarios
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
              {comments.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No hay comentarios aún.</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="bg-slate-50 rounded-xl p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-700">{comment.user_name}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(comment.created_at).toLocaleString('es-MX', { hour: '2-digit', minute:'2-digit', day:'2-digit', month:'short' })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{comment.message}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Escribe un mensaje..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                className="flex-1 text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#6a9a04] transition-colors"
              />
              <button 
                onClick={handleSendComment}
                disabled={sendingComment || !newComment.trim()}
                className="bg-[#6a9a04] text-white p-2 rounded-xl hover:bg-[#5a8203] disabled:opacity-50 transition-colors flex items-center justify-center w-10 shrink-0"
              >
                {sendingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DOCUMENTS */}
        <div className="lg:col-span-2">
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
            <div className="mb-6">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileText className="text-[#6a9a04]" /> 
                Documentación Requerida
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Sube los documentos correspondientes para procesar tu pago y validar el servicio.
              </p>
            </div>

            <div className="space-y-4">
              {DOC_CATEGORIES.map(category => {
                const uploadedDoc = evidence.find(e => e.document_category === category.id);
                const isUploading = uploadingDoc === category.id;

                return (
                  <div key={category.id} className={`bg-white border border-slate-100 shadow-sm rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 ${category.border}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${uploadedDoc ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                        {uploadedDoc ? <CheckCircle size={20} /> : <File size={20} />}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{category.name}</h4>
                        {uploadedDoc ? (
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{uploadedDoc.file_name}</div>
                        ) : (
                          <div className="text-xs text-slate-400 mt-0.5">Pendiente de subir</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:ml-auto">
                      {uploadedDoc ? (
                        <>
                          <span className="hidden sm:inline-block text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-md">Subido</span>
                          <button
                            onClick={() => downloadFile(uploadedDoc.file_url, uploadedDoc.file_name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-lg transition-colors"
                          >
                            <Eye size={14} /> Ver
                          </button>
                          
                          {/* Enable re-uploading just in case */}
                          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg cursor-pointer transition-colors">
                            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            <span className="hidden sm:inline">Actualizar</span>
                            <input
                              type="file"
                              accept={category.accept}
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, category.id)}
                              disabled={isUploading}
                            />
                          </label>
                        </>
                      ) : (
                        <label className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-[#6a9a04] hover:bg-[#5a8203] text-white text-sm font-bold rounded-xl cursor-pointer transition-colors shadow-sm">
                          {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                          Subir Archivo
                          <input
                            type="file"
                            accept={category.accept}
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, category.id)}
                            disabled={isUploading}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}

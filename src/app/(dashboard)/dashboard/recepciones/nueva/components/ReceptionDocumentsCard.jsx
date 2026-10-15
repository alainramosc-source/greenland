'use client';
import { Paperclip, Upload, FileText, Eye, Trash2 } from 'lucide-react';

export default function ReceptionDocumentsCard({
  documents,
  uploadingDoc,
  handleUploadDoc,
  handleDeleteDoc,
  handleViewDoc,
  isCompleted,
  isAuthorized,
}) {
  const typeLabels = {
    po: 'Orden de Compra',
    invoice: 'Invoice / Factura',
    bl: 'Bill of Lading (BL)',
    debit_note: 'Debit Note (Forwarder)',
    pedimento: 'Pedimento',
    packing_list: 'Packing List',
    certificate: 'Certificado de Origen / Calidad',
    other: 'Documento Adicional',
  };

  return (
    <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 flex-wrap gap-2">
        <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
          <Paperclip size={18} className="text-[#6a9a04]" /> Documentos y Expediente de la Operación
        </h3>
        <span className="text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
          Expediente digitalizado (BL, Pedimento, Factura, Fotos)
        </span>
      </div>

      {/* Upload area */}
      <div className="mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            id="doc-type-select"
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm"
            defaultValue="other"
          >
            <option value="pedimento">Pedimento</option>
            <option value="bl">Bill of Lading (BL)</option>
            <option value="invoice">Invoice / Factura</option>
            <option value="packing_list">Packing List</option>
            <option value="po">Orden de Compra</option>
            <option value="debit_note">Debit Note (Forwarder)</option>
            <option value="certificate">Certificado</option>
            <option value="other">Otro documento / Foto</option>
          </select>

          <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:border-[#6a9a04] hover:text-[#6a9a04] transition-colors cursor-pointer shadow-sm">
            <Upload size={16} />
            {uploadingDoc ? 'Subiendo archivo...' : 'Adjuntar Archivo'}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.doc,.docx"
              disabled={uploadingDoc}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const docType = document.getElementById('doc-type-select')?.value || 'other';
                handleUploadDoc(file, docType);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      {/* Document list */}
      {documents.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Paperclip size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm m-0">No hay documentos adjuntos aún en esta recepción</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileText size={15} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 m-0">{doc.file_name}</p>
                  <p className="text-[10px] text-slate-400 m-0 font-medium">
                    {typeLabels[doc.file_type] || doc.file_type} •{' '}
                    {new Date(doc.created_at).toLocaleDateString('es-MX')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleViewDoc(doc.storage_path)}
                  className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-colors bg-transparent border-none cursor-pointer"
                  title="Ver / Descargar"
                >
                  <Eye size={15} />
                </button>
                {(!isCompleted || isAuthorized) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteDoc(doc.id, doc.storage_path)}
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer"
                    title="Eliminar documento"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

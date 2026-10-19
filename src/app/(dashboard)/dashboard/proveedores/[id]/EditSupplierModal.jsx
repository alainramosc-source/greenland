'use client';
import { useState } from 'react';
import { X, Loader2, Pencil } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { SERVICE_TYPES } from '../serviceTypes';

const inputCls =
  'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm disabled:bg-slate-50 disabled:text-slate-400';
const labelCls = 'block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5';

export default function EditSupplierModal({ supplier, onClose, onSaved }) {
  const supabase = createClient();
  const hasAccount = !!supplier.user_id;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: supplier.company_name || '',
    contact_name: supplier.contact_name || '',
    email: supplier.email || '',
    phone: supplier.phone || '',
    rfc: supplier.rfc || '',
    address: supplier.address || '',
    service_types: supplier.service_types || [],
    notes: supplier.notes || '',
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const toggleService = (value) =>
    setForm((f) => ({
      ...f,
      service_types: f.service_types.includes(value)
        ? f.service_types.filter((t) => t !== value)
        : [...f.service_types, value],
    }));

  const handleSave = async () => {
    const name = form.company_name.trim();
    if (!name) {
      alert('El nombre de empresa es obligatorio.');
      return;
    }
    setSaving(true);
    const updates = {
      company_name: name,
      name,
      short_name: name,
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      rfc: form.rfc.trim().toUpperCase() || null,
      address: form.address.trim() || null,
      service_types: form.service_types,
      notes: form.notes.trim() || null,
    };
    // Con cuenta creada, el email es el usuario de acceso: no se cambia aquí
    if (!hasAccount) updates.email = form.email.trim() || null;

    const { data, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', supplier.id)
      .select()
      .single();
    setSaving(false);
    if (error) {
      alert('Error al guardar: ' + error.message);
      return;
    }
    onSaved(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white/95 backdrop-blur-xl w-full max-w-[600px] rounded-2xl shadow-2xl border border-white overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
            <Pencil size={18} className="text-[#6a9a04]" /> Editar Proveedor
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre de Empresa *</label>
              <input type="text" value={form.company_name} onChange={set('company_name')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Contacto</label>
              <input type="text" value={form.contact_name} onChange={set('contact_name')} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={form.email} onChange={set('email')} disabled={hasAccount} className={inputCls} />
              {hasAccount && (
                <p className="text-[11px] text-slate-400 mt-1 mb-0">Ya tiene cuenta de portal; este email es su usuario.</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input type="tel" value={form.phone} onChange={set('phone')} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>RFC</label>
              <input type="text" value={form.rfc} onChange={set('rfc')} className={`${inputCls} font-mono uppercase`} />
            </div>
            <div>
              <label className={labelCls}>Domicilio</label>
              <input type="text" value={form.address} onChange={set('address')} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Tipos de Servicio</label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPES.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => toggleService(st.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    form.service_types.includes(st.value)
                      ? 'bg-[#6a9a04] text-white border-[#6a9a04] shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#6a9a04]/50'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Notas</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} className={`${inputCls} resize-none`} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-xl text-white font-bold bg-[#6a9a04] hover:bg-[#5a8503] shadow-lg shadow-[#6a9a04]/20 cursor-pointer transition-all border-none disabled:opacity-50">
              {saving ? <Loader2 size={18} className="animate-spin" /> : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Truck, Plus, Search, Loader2, X, Building, Mail, Phone, MapPin,
  FileText, CheckCircle, XCircle, Copy, ExternalLink
} from 'lucide-react';

const SERVICE_TYPES = [
  { value: 'flete', label: 'Flete' },
  { value: 'maniobra', label: 'Maniobra' },
  { value: 'despacho', label: 'Despacho Aduanal' },
  { value: 'bodega', label: 'Renta de Bodega' },
  { value: 'almacenaje', label: 'Almacenaje' },
  { value: 'seguro', label: 'Seguro de Carga' },
  { value: 'otro', label: 'Otro' },
];

export default function SuppliersPage() {
  const supabase = createClient();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [form, setForm] = useState({
    company_name: '', contact_name: '', email: '', phone: '', rfc: '',
    address: '', service_types: [], notes: ''
  });

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .or('type.eq.service,type.is.null')
      .order('created_at', { ascending: false });
    if (data) setSuppliers(data);
    setLoading(false);
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleCreate = async () => {
    if (!form.company_name.trim() || !form.email.trim()) {
      alert('Nombre de empresa y email son obligatorios.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/suppliers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert('Error: ' + (data.error || 'Error desconocido'));
      } else {
        setSuccessInfo({
          message: data.message,
          portalUrl: data.portalUrl,
          email: form.email,
          companyName: form.company_name
        });
        setForm({ company_name: '', contact_name: '', email: '', phone: '', rfc: '', address: '', service_types: [], notes: '' });
        await fetchSuppliers();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setCreating(false);
  };

  const toggleServiceType = (type) => {
    setForm(prev => ({
      ...prev,
      service_types: prev.service_types.includes(type)
        ? prev.service_types.filter(t => t !== type)
        : [...prev.service_types, type]
    }));
  };

  const filtered = suppliers.filter(s =>
    !search || s.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#6a9a04]" />
        <p className="font-medium">Cargando proveedores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Proveedores</h1>
          <p className="text-slate-500 font-medium mt-1">Gestiona proveedores de servicios nacionales</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setSuccessInfo(null); }}
          className="flex items-center gap-2 px-5 py-3 bg-[#6a9a04] hover:bg-[#5a8503] text-white rounded-xl font-bold shadow-lg shadow-[#6a9a04]/20 transition-all cursor-pointer border-none"
        >
          <Plus size={18} /> Nuevo Proveedor
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, contacto o email..."
          className="w-full pl-12 pr-4 py-3 bg-white/80 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm"
        />
      </div>

      {/* Suppliers Table */}
      <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Empresa</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Servicios</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                    {search ? 'No se encontraron proveedores' : 'Aún no hay proveedores registrados'}
                  </td>
                </tr>
              ) : filtered.map(supplier => (
                <tr key={supplier.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/proveedores/${supplier.id}`} className="font-bold text-slate-900 hover:text-[#6a9a04] transition-colors">
                      {supplier.company_name}
                    </Link>
                    {supplier.rfc && <div className="text-xs text-slate-400 mt-0.5">RFC: {supplier.rfc}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-700">{supplier.contact_name || '—'}</div>
                    {supplier.phone && <div className="text-xs text-slate-400">{supplier.phone}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{supplier.email}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(supplier.service_types || []).map(st => (
                        <span key={st} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6a9a04]/10 text-[#6a9a04] uppercase tracking-wider">
                          {st}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {supplier.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                        <CheckCircle size={12} /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
                        <XCircle size={12} /> Inactivo
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Supplier Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center px-4">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-[600px] rounded-2xl shadow-2xl border border-white overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                {successInfo ? (
                  <><CheckCircle size={20} className="text-green-500" /> Proveedor Creado</>
                ) : (
                  <><Truck size={20} className="text-[#6a9a04]" /> Nuevo Proveedor</>
                )}
              </h3>
              <button onClick={() => { setShowModal(false); setSuccessInfo(null); }} className="p-1 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {successInfo ? (
              <div className="p-6 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-green-700 mb-1">{successInfo.message}</p>
                  <p className="text-xs text-green-600">Se enviará un email a <strong>{successInfo.email}</strong> para que establezca su contraseña.</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Link del Portal (para compartir)</label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={successInfo.portalUrl}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(successInfo.portalUrl)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border-none"
                      title="Copiar link"
                    >
                      <Copy size={16} className="text-slate-600" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => { setShowModal(false); setSuccessInfo(null); }} className="px-5 py-2.5 rounded-xl text-white font-bold bg-[#6a9a04] hover:bg-[#5a8503] shadow-lg shadow-[#6a9a04]/20 cursor-pointer transition-all border-none">
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nombre de Empresa *</label>
                    <div className="relative">
                      <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={form.company_name}
                        onChange={(e) => setForm(f => ({ ...f, company_name: e.target.value }))}
                        placeholder="Transportes García S.A."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Contacto</label>
                    <input
                      type="text"
                      value={form.contact_name}
                      onChange={(e) => setForm(f => ({ ...f, contact_name: e.target.value }))}
                      placeholder="Juan Pérez"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email *</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="contacto@transportes.com"
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Teléfono</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="844 123 4567"
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">RFC</label>
                    <input
                      type="text"
                      value={form.rfc}
                      onChange={(e) => setForm(f => ({ ...f, rfc: e.target.value.toUpperCase() }))}
                      placeholder="TGA123456XY0"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Domicilio</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                        placeholder="Calle, Ciudad, Estado"
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Tipos de Servicio</label>
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_TYPES.map(st => (
                      <button
                        key={st.value}
                        type="button"
                        onClick={() => toggleServiceType(st.value)}
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
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Notas</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Notas internas sobre este proveedor..."
                    rows={2}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/30 shadow-sm resize-none"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-blue-700">
                    📧 Al crear el proveedor, se enviará un email automático a <strong>{form.email || '...'}</strong> con un enlace para que establezca su contraseña y acceda al portal.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm">
                    Cancelar
                  </button>
                  <button onClick={handleCreate} disabled={creating} className="px-5 py-2.5 rounded-xl text-white font-bold bg-[#6a9a04] hover:bg-[#5a8503] shadow-lg shadow-[#6a9a04]/20 cursor-pointer transition-all border-none disabled:opacity-50">
                    {creating ? <Loader2 size={18} className="animate-spin" /> : 'Crear Proveedor'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

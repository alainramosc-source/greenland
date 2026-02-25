'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { MapPin, Plus, Pencil, Trash2, X, Star, Loader2, Home } from 'lucide-react';

export default function DireccionesPage() {
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [form, setForm] = useState({ label: '', street: '', neighborhood: '', city: '', state: '', zip_code: '', is_default: false });

    const supabase = createClient();

    const getDistributorId = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        let uid = user.id;
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role === 'admin' && typeof window !== 'undefined' && sessionStorage.getItem('test_view_role') === 'distributor') {
            const simId = sessionStorage.getItem('test_view_distributor_id');
            if (simId) uid = simId;
        }
        return uid;
    };

    const fetchAddresses = async () => {
        const uid = await getDistributorId();
        if (!uid) { setLoading(false); return; }
        const { data } = await supabase
            .from('distributor_addresses')
            .select('*')
            .eq('distributor_id', uid)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false });
        if (data) setAddresses(data);
        setLoading(false);
    };

    useEffect(() => { fetchAddresses(); }, []);

    const resetForm = () => {
        setForm({ label: '', street: '', neighborhood: '', city: '', state: '', zip_code: '', is_default: false });
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (addr) => {
        setForm({ label: addr.label, street: addr.street, neighborhood: addr.neighborhood || '', city: addr.city, state: addr.state, zip_code: addr.zip_code || '', is_default: addr.is_default });
        setEditingId(addr.id);
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.label.trim() || !form.street.trim() || !form.city.trim() || !form.state.trim()) {
            alert('Por favor completa los campos obligatorios (Nombre, Calle, Ciudad, Estado).');
            return;
        }
        setSaving(true);
        const uid = await getDistributorId();

        // If marking as default, unset other defaults first
        if (form.is_default) {
            await supabase.from('distributor_addresses').update({ is_default: false }).eq('distributor_id', uid);
        }

        if (editingId) {
            const { error } = await supabase.from('distributor_addresses').update({
                label: form.label.trim(), street: form.street.trim(), neighborhood: form.neighborhood.trim(),
                city: form.city.trim(), state: form.state.trim(), zip_code: form.zip_code.trim(), is_default: form.is_default
            }).eq('id', editingId);
            if (error) alert('Error: ' + error.message);
        } else {
            const { error } = await supabase.from('distributor_addresses').insert({
                distributor_id: uid, label: form.label.trim(), street: form.street.trim(),
                neighborhood: form.neighborhood.trim(), city: form.city.trim(), state: form.state.trim(),
                zip_code: form.zip_code.trim(), is_default: form.is_default
            });
            if (error) alert('Error: ' + error.message);
        }

        setSaving(false);
        resetForm();
        await fetchAddresses();
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar esta dirección?')) return;
        setDeleting(id);
        const { error } = await supabase.from('distributor_addresses').delete().eq('id', id);
        if (error) alert('Error: ' + error.message);
        setDeleting(null);
        await fetchAddresses();
    };

    const handleSetDefault = async (id) => {
        const uid = await getDistributorId();
        await supabase.from('distributor_addresses').update({ is_default: false }).eq('distributor_id', uid);
        await supabase.from('distributor_addresses').update({ is_default: true }).eq('id', id);
        await fetchAddresses();
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-[#6a9a04]" />
            <p className="font-medium">Cargando direcciones...</p>
        </div>
    );

    return (
        <div className="relative z-10 max-w-3xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900 m-0">Mis Direcciones</h1>
                <p className="text-slate-500 mt-1 font-medium m-0">Administra tus direcciones de envío para pedidos.</p>
            </header>

            {/* Add button */}
            {!showForm && (
                <button
                    onClick={() => setShowForm(true)}
                    className="mb-6 flex items-center gap-2 bg-[#6a9a04] hover:bg-[#6a9a04]/90 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg shadow-[#6a9a04]/20 transition-all border-none cursor-pointer"
                >
                    <Plus size={18} /> Agregar Dirección
                </button>
            )}

            {/* Form */}
            {showForm && (
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                            <MapPin size={18} className="text-[#6a9a04]" />
                            {editingId ? 'Editar Dirección' : 'Nueva Dirección'}
                        </h3>
                        <button onClick={resetForm} className="p-1 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer">
                            <X size={18} className="text-slate-500" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-600 mb-1">Nombre / Etiqueta *</label>
                            <input type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                                placeholder="Ej: Bodega Principal, Sucursal Norte"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-600 mb-1">Calle y Número *</label>
                            <input type="text" value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))}
                                placeholder="Av. Constitución #456"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-600 mb-1">Colonia</label>
                            <input type="text" value={form.neighborhood} onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))}
                                placeholder="Col. Centro"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Ciudad *</label>
                            <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                                placeholder="Saltillo"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Estado *</label>
                            <input type="text" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                                placeholder="Coahuila"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Código Postal</label>
                            <input type="text" value={form.zip_code} onChange={e => setForm(f => ({ ...f, zip_code: e.target.value }))}
                                placeholder="25000"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-[#6a9a04]/20 shadow-sm" />
                        </div>
                        <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))}
                                    className="w-4 h-4 rounded border-slate-300 text-[#6a9a04] focus:ring-[#6a9a04]/20 cursor-pointer" />
                                <span className="text-sm font-medium text-slate-700">Dirección predeterminada</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                        <button onClick={resetForm}
                            className="px-5 py-2.5 rounded-xl text-slate-700 font-semibold bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all shadow-sm mt-4"
                        >Cancelar</button>
                        <button onClick={handleSave} disabled={saving}
                            className="px-5 py-2.5 rounded-xl text-white font-bold bg-[#6a9a04] hover:bg-[#6a9a04]/90 shadow-lg shadow-[#6a9a04]/20 cursor-pointer transition-all border-none disabled:opacity-50 mt-4"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : (editingId ? 'Guardar Cambios' : 'Agregar')}
                        </button>
                    </div>
                </div>
            )}

            {/* Addresses List */}
            {addresses.length === 0 ? (
                <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-12 text-center">
                    <Home size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium text-lg m-0">No tienes direcciones registradas</p>
                    <p className="text-slate-400 text-sm mt-1 m-0">Agrega una dirección para agilizar tus próximos pedidos.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {addresses.map(addr => (
                        <div key={addr.id} className={`bg-white/60 backdrop-blur-md border shadow-sm rounded-2xl p-5 transition-all hover:shadow-md ${addr.is_default ? 'border-[#6a9a04]/30 ring-1 ring-[#6a9a04]/10' : 'border-white/50'}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h4 className="font-bold text-slate-900 m-0">{addr.label}</h4>
                                        {addr.is_default && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-[#6a9a04] bg-[#6a9a04]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                <Star size={10} /> Predeterminada
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-600 m-0">{addr.street}{addr.neighborhood ? `, ${addr.neighborhood}` : ''}</p>
                                    <p className="text-sm text-slate-500 m-0 mt-0.5">
                                        {addr.city}, {addr.state} {addr.zip_code && `C.P. ${addr.zip_code}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {!addr.is_default && (
                                        <button onClick={() => handleSetDefault(addr.id)} title="Marcar como predeterminada"
                                            className="p-2 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-500 transition-colors bg-transparent border-none cursor-pointer">
                                            <Star size={16} />
                                        </button>
                                    )}
                                    <button onClick={() => handleEdit(addr)} title="Editar"
                                        className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-colors bg-transparent border-none cursor-pointer">
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(addr.id)} disabled={deleting === addr.id} title="Eliminar"
                                        className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer disabled:opacity-50">
                                        {deleting === addr.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

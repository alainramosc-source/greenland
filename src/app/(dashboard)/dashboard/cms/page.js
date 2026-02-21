'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Save, Image as ImageIcon, CheckCircle, RefreshCw } from 'lucide-react';

export default function CMSPage() {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const supabase = createClient();

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cms_content')
      .select('*')
      .order('sort_order', { ascending: true }); // Assuming sort_order, fallback to id/key

    if (error) {
      console.error('Error fetching content:', error);
    } else {
      // Sort manually if needed or rely on DB
      // Let's sort by a logical order for display: Hero -> Divisions -> Essentials -> Values -> Coverage
      const logicalOrder = ['hero-main', 'hero-bg', 'division-spaces', 'division-deco', 'essentials-main', 'values-main', 'coverage-main'];
      const sorted = data.sort((a, b) => {
        return logicalOrder.indexOf(a.section_key) - logicalOrder.indexOf(b.section_key);
      });
      setContent(sorted);
    }
    setLoading(false);
  };

  const handleUpdate = async (id, field, value) => {
    // Optimistic update for UI state
    setContent(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSave = async (item) => {
    setSaving(prev => ({ ...prev, [item.id]: true }));

    const { error } = await supabase
      .from('cms_content')
      .update({
        title: item.title,
        body: item.body,
        media_url: item.media_url,
        is_published: item.is_published
      })
      .eq('id', item.id);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      // Show success briefly?
    }

    setSaving(prev => ({ ...prev, [item.id]: false }));
  };

  if (loading) return <div className="loading">Cargando CMS...</div>;

  return (
    <div className="relative">
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-wrap justify-between items-center gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 m-0">Gestión de Contenido (CMS)</h1>
            <p className="text-slate-500 mt-1 font-medium m-0">Edita los textos e imágenes de la página principal.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {content.map(item => (
            <div key={item.id} className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-6 rounded-2xl flex flex-col gap-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-200/50">
                <span className="bg-[#ec5b13]/10 text-[#ec5b13] px-3 py-1 rounded-lg font-mono text-xs font-bold">
                  {item.section_key}
                </span>
                <button
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer border-none ${saving[item.id] ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-600 hover:bg-[#ec5b13] hover:text-white'}`}
                  onClick={() => handleSave(item)}
                  disabled={saving[item.id]}
                >
                  {saving[item.id] ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                </button>
              </div>

              <div className="flex flex-col gap-4 flex-1">
                {/* Title Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Título</label>
                  <input
                    type="text"
                    value={item.title || ''}
                    onChange={(e) => handleUpdate(item.id, 'title', e.target.value)}
                    placeholder="Sin título"
                    className="w-full px-4 py-2 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ec5b13]/20 text-sm text-slate-800 outline-none transition-all shadow-sm"
                  />
                </div>

                {/* Body Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Texto / Descripción</label>
                  <textarea
                    value={item.body || ''}
                    onChange={(e) => handleUpdate(item.id, 'body', e.target.value)}
                    placeholder="Sin descripción"
                    className="w-full px-4 py-2 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ec5b13]/20 text-sm text-slate-800 outline-none transition-all shadow-sm resize-y"
                    rows={4}
                  />
                </div>

                {/* Media URL Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">URL de Imagen/Media</label>
                  <div className="relative">
                    <ImageIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={item.media_url || ''}
                      onChange={(e) => handleUpdate(item.id, 'media_url', e.target.value)}
                      placeholder="https://..."
                      className="w-full pl-9 pr-4 py-2 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ec5b13]/20 text-sm text-slate-800 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Image Preview */}
                {item.media_url && (
                  <div className="mt-2 h-32 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200/50">
                    <img src={item.media_url} alt="Preview" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

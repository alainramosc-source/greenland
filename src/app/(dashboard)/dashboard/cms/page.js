'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Save, Image as ImageIcon, CheckCircle, RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

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
          <div className="bg-white/60 backdrop-blur-md border border-white/50 p-6 rounded-3xl shadow-lg mt-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6 font-display flex items-center justify-between">
              <span>Sync Técnico Especial</span>
              <button
                onClick={async () => {
                  const { createClient } = require('@/utils/supabase/client');
                  const supabase = createClient();
                  const productsData = [
                    { sku: 'GL01', name: 'Mesa Plegable 1.80', description: 'TAMAÑO: L180*W74*H74CM\nMATERIAL: HDPE + ACERO\nMARCO DE ACERO: DIA 25*1.0 MM\nEMPAQUE: BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN\nTAMAÑO CAJA: 90*75*8 CMS\nPESO: 12.5 KGS\nCANT POR TARIMA: 35 PIEZAS' },
                    { sku: 'GL02', name: 'Mesa Plegable 1.22', description: 'ALTURA AJUSTABLE: 3 NIVELES\nTAMAÑO: L122*W61*H(48/61/74)CM\nMATERIAL: HDPE + ACERO\nMARCO DE ACERO: DIA 25*1.0 MM\nEMPAQUE: BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN\nTAMAÑO CAJA: 62*62*8 CMS\nPESO: 8.5 KGS\nCANT POR TARIMA: 60 PIEZAS' },
                    { sku: 'GL03', name: 'Silla Plegable', description: 'TAMAÑO: L51*W45*H85.5 CMS\nMATERIAL: HDPE + ACERO\nMARCO DE ACERO: DIA 25*1.0 MM\nEMPAQUE: BOLSA DE PE POR PIEZA, 4 PIEZAS POR CAJA\nTAMAÑO CAJA: 116*34*48 CMS\nPESO: 4.5 KGS\nCANT POR TARIMA: 80 PIEZAS' },
                    { sku: 'GL04', name: 'Mesa Plegable 1.80 Black', description: 'TAMAÑO: L180*W74*H74CM\nMATERIAL: HDPE + ACERO\nMARCO DE ACERO: DIA 25*1.0 MM\nEMPAQUE: BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN\nTAMAÑO CAJA: 90*75*8 CMS\nPESO NETO: 11 KGS\nCANT POR TARIMA: 35 PIEZAS' },
                    { sku: 'GL05', name: 'Mesa Plegable 86 × 86 cm', description: 'TAMAÑO: L86*W86*H74CM\nMATERIAL: HDPE + ACERO\nMARCO DE ACERO: DIA 25*1.0 MM\nEMPAQUE: BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN\nTAMAÑO CAJA: 87*46*10 CMS\nPESO: 10 KGS\nCANT POR TARIMA: 50 PIEZAS' },
                    { sku: 'GL06', name: 'Mesa Plegable 2.44', description: 'TAMAÑO: L244*W75*H74CM\nMATERIAL: HDPE + ACERO\nMARCO DE ACERO: DIA 28*1.0 MM\nEMPAQUE: BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN\nTAMAÑO CAJA: 122*76*10 CMS\nPESO NETO: 18.5 KGS\nCANT POR TARIMA: 26 PIEZAS' },
                    { sku: 'GL07', name: 'Toldo Blanco 3×3', description: 'TAMAÑO: 3 X 3 MTS\nMATERIAL: ACERO CON RECUBRIMIENTO BLANCO\nTELA: POLIÉSTER 800D CON RECUBRIMIENTO PVC (IMPERMEABLE)\nTUBO EXTERIOR DEL PIE: 30 X 30 X 0.7 MM\nTUBO INTERIOR DEL PIE: 25 X 25 X 0.7 MM\nTUBO TRANSVERSAL: 13 X 23 X 0.7 MM\nCONECTORES: PLÁSTICO ABS DE ALTA RESISTENCIA \nADICIONALES: BOTÓN DE SEGURIDAD ANTI-PELLIZCOS, BASE DE PIE SILENCIOSA, INCLUYE MANUAL DE INSTRUCCIONES\nEMPAQUE: TECHO + ESTRUCTURA EN BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN\nTAMAÑO CAJA: 156*22*22 CMS\nPESO: 20.5 KGS\nCANT POR TARIMA: 35 PIEZAS' },
                    { sku: 'GL08', name: 'Toldo Negro 3×3', description: 'TAMAÑO: 3 X 3 MTS\nMATERIAL: ACERO CON RECUBRIMIENTO NEGRO\nTELA: POLIÉSTER 420D CON RECUBRIMIENTO PVC (IMPERMEABLE)\nTUBO EXTERIOR DEL PIE: 30 X 30 X 0.6 MM\nTUBO INTERIOR DEL PIE: 25 X 25 X 0.6 MM\nTUBO TRANSVERSAL: 13 X 23 X 0.6 MM\nADICIONALES: INCLUYE MANUAL DE INSTRUCCIONES\nEMPAQUE: TECHO + ESTRUCTURA EN CAJA DE CARTÓN\nTAMAÑO CAJA: 148*21*20 CMS\nPESO: 18 KGS\nCANT POR TARIMA: 40 PIEZAS' },
                    { sku: 'GL09', name: 'Mesa Plegable 1.80 × 70', description: 'TAMAÑO: L180*W70*H74CM\nMATERIAL: HDPE + ACERO\nMARCO DE ACERO: DIA 22*1.0 MM\nEMPAQUE: BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN\nTAMAÑO CAJA: 90*72*8 CMS\nPESO NETO: 11 KGS\nCANT POR TARIMA: 40 PIEZAS' },
                    { sku: 'GL14', name: 'Silla Plegable Black', description: 'TAMAÑO: L51*W45*H85.5 CMS\nMATERIAL: HDPE + ACERO\nMARCO DE ACERO: DIA 25*1.0 MM\nEMPAQUE: BOLSA DE PE POR PIEZA, 4 PIEZAS POR CAJA\nTAMAÑO CAJA: 116*34*48 CMS\nPESO: 4.5 KGS\nCANT POR TARIMA: 80 PIEZAS' },
                    { sku: 'GL15', name: 'Mesa Plegable 1.80 Premium', description: 'TAMAÑO: L180*W74*H74CM\nMATERIAL: HDPE + ACERO\nMARCO DE ACERO: DIA 25*1.0 MM\nEMPAQUE: BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN\nTAMAÑO CAJA: 90*75*10 CMS\nPESO NETO: 14 KGS\nCANT POR TARIMA: 32 PIEZAS' },
                    { sku: 'GL16', name: 'Mesa Plegable 1.80 × 74 Tipo Ratán', description: 'TAMAÑO: L180*W74*H74CM\nMATERIAL: HDPE + ACERO\nMARCO DE ACERO: DIA 25*1.0 MM\nEMPAQUE: BOLSA DE PE POR PIEZA Y CAJA DE CARTÓN\nTAMAÑO CAJA: 90*75*8 CMS\nPESO: 11 KGS\nCANT POR TARIMA: 35 PIEZAS' },
                    { sku: 'GL17', name: 'Silla Plegable Tipo Ratán', description: 'TAMAÑO: L51*W45*H85.5 CMS\nMATERIAL: HDPE + ACERO\nMARCO DE ACERO: DIA 25*1.0 MM\nEMPAQUE: BOLSA DE PE POR PIEZA, 4 PIEZAS POR CAJA\nTAMAÑO CAJA: 116*34*48 CMS\nPESO: 4.5 KGS\nCANT POR TARIMA: 80 PIEZAS' },
                    { sku: 'GL18', name: 'Mesa Plegable Redonda 1.54', description: 'TAMAÑO: D154*H74CMS\nMATERIAL: HDPE + ACERO\nMARCO DE ACERO: DIA 28*1.0 MM\nEMPAQUE: BOLSA DE PE POR PIEZA, 1 PIEZAS POR CAJA\nTAMAÑO CAJA: 156*79*10 CMS\nPESO: 21.5 KGS\nCANT POR TARIMA: 20 PIEZAS' },
                    { sku: 'GL19', name: 'Mesa Plegable Personal 76', description: 'TAMAÑO: L76*W50*(H53.5 – 71.5) CMS\nMATERIAL: HDPE + ACERO\nMARCO DE ACERO: DIA 19*1.0 MM\nEMPAQUE: BOLSA DE PE POR PIEZA, 1 PIEZA POR CAJA\nTAMAÑO CAJA: 93*51*6 CMS\nPESO: 4.5 KGS\nCANT POR TARIMA: 90 PIEZAS' }
                  ];

                  for (let d of productsData) {
                    await supabase.from('products').update({ description: d.description }).eq('sku', d.sku);
                    await supabase.from('products').update({ description: d.description }).eq('sku', d.sku.replace('GL', 'GL-'));
                  }
                  alert('¡INYECCIÓN TÉCNICA EXITOSA! Revisa el catálogo ahora.');
                }}
                className="btn-primary text-xs py-2 px-4 whitespace-nowrap bg-black text-white rounded-xl"
              >
                Inyectar Fichas Técnicas
              </button>
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}

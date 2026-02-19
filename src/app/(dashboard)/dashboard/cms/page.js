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
        <div className="cms-container">
            <div className="page-header">
                <h1>Gestión de Contenido (CMS)</h1>
                <p>Edita los textos e imágenes de la página principal.</p>
            </div>

            <div className="cms-grid">
                {content.map(item => (
                    <div key={item.id} className="cms-card glass-panel">
                        <div className="card-header">
                            <span className="section-badge">{item.section_key}</span>
                            <button
                                className={`btn-icon ${saving[item.id] ? 'saving' : ''}`}
                                onClick={() => handleSave(item)}
                                disabled={saving[item.id]}
                            >
                                {saving[item.id] ? <RefreshCw className="spin" size={20} /> : <Save size={20} />}
                            </button>
                        </div>

                        <div className="card-body">
                            {/* Title Field */}
                            <div className="form-group">
                                <label>Título</label>
                                <input
                                    type="text"
                                    value={item.title || ''}
                                    onChange={(e) => handleUpdate(item.id, 'title', e.target.value)}
                                    placeholder="Sin título"
                                    className="input-glass"
                                />
                            </div>

                            {/* Body Field */}
                            <div className="form-group">
                                <label>Texto / Descripción</label>
                                <textarea
                                    value={item.body || ''}
                                    onChange={(e) => handleUpdate(item.id, 'body', e.target.value)}
                                    placeholder="Sin descripción"
                                    className="input-glass textarea"
                                    rows={4}
                                />
                            </div>

                            {/* Media URL Field */}
                            <div className="form-group">
                                <label>URL de Imagen/Media</label>
                                <div className="media-input-wrapper">
                                    <ImageIcon size={18} className="input-icon" />
                                    <input
                                        type="text"
                                        value={item.media_url || ''}
                                        onChange={(e) => handleUpdate(item.id, 'media_url', e.target.value)}
                                        placeholder="https://..."
                                        className="input-glass pl-icon"
                                    />
                                </div>
                            </div>

                            {/* Image Preview */}
                            {item.media_url && (
                                <div className="media-preview">
                                    <img src={item.media_url} alt="Preview" onError={(e) => e.target.style.display = 'none'} />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
        .cms-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-size: 2rem;
          color: white;
          margin-bottom: 0.5rem;
        }
        
        .page-header p {
          color: var(--color-text-muted);
        }

        .cms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .glass-panel {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .section-badge {
          background: rgba(74, 222, 32, 0.1);
          color: var(--color-primary);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 0.75rem;
        }

        .btn-icon {
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-icon:hover {
          background: var(--color-primary);
          color: black;
        }
        .btn-icon.saving {
          background: rgba(255,255,255,0.05);
          cursor: wait;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.85rem;
          color: var(--color-text-muted);
        }

        .input-glass {
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          font-family: inherit;
        }
        .input-glass:focus {
          border-color: var(--color-primary);
          outline: none;
        }

        .textarea {
          resize: vertical;
        }

        .media-input-wrapper {
          position: relative;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-muted);
        }
        .pl-icon {
          padding-left: 2.5rem;
          width: 100%;
        }

        .media-preview {
          height: 150px;
          background: rgba(0,0,0,0.3);
          border-radius: var(--radius-sm);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .media-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
}

'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { Package, History, X } from 'lucide-react';

export default function InventariosPage() {
    const [products, setProducts] = useState([]);
    const [inventory, setInventory] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(null); // For adjustment modal
    const [adjustmentAmount, setAdjustmentAmount] = useState('');
    const [adjustmentReason, setAdjustmentReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const supabase = createClient();

    // Fetch initial data
    const fetchData = async () => {
        setLoading(true);

        // 1. Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 2. Fetch all products
        const { data: productsData } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('name');

        // 3. Fetch inventory logs for this user to calculate current stock
        const { data: logsData } = await supabase
            .from('inventory_logs')
            .select('product_id, quantity_change')
            .eq('user_id', user.id);

        // 4. Calculate stock per product
        const stockMap = {};
        if (logsData) {
            logsData.forEach(log => {
                stockMap[log.product_id] = (stockMap[log.product_id] || 0) + log.quantity_change;
            });
        }

        setProducts(productsData || []);
        setInventory(stockMap);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdjustStock = async (e) => {
        e.preventDefault();
        if (!selectedProduct || !adjustmentAmount) return;

        setSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();

        const qty = parseInt(adjustmentAmount);

        const { error } = await supabase
            .from('inventory_logs')
            .insert({
                user_id: user.id,
                product_id: selectedProduct.id,
                quantity_change: qty,
                reason: adjustmentReason || 'Manual adjustment'
            });

        if (error) {
            alert('Error adjusting stock: ' + error.message);
        } else {
            // Refresh data
            await fetchData();
            setSelectedProduct(null);
            setAdjustmentAmount('');
            setAdjustmentReason('');
        }
        setSubmitting(false);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Cargando inventario...</p>
            </div>
        );
    }

    return (
        <div className="inventory-container">
            <div className="page-header">
                <h1>Mi Inventario</h1>
                <p>Gestiona el stock de tus productos disponibles.</p>
            </div>

            <div className="glass-panel">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>SKU</th>
                            <th>Stock Actual</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(product => {
                            const currentStock = inventory[product.id] || 0;
                            return (
                                <tr key={product.id}>
                                    <td>
                                        <div className="product-info">
                                            <div className="product-icon">
                                                <Package size={20} />
                                            </div>
                                            <span>{product.name}</span>
                                        </div>
                                    </td>
                                    <td>{product.sku}</td>
                                    <td>
                                        <span className={`stock-badge ${currentStock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                                            {currentStock} unidades
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="btn-icon"
                                            onClick={() => setSelectedProduct(product)}
                                            title="Ajustar Stock"
                                        >
                                            <History size={18} /> Ajustar
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Adjustment Modal */}
            {selectedProduct && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Ajustar Stock: {selectedProduct.name}</h3>
                            <button onClick={() => setSelectedProduct(null)} className="close-btn"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleAdjustStock}>
                            <div className="form-group">
                                <label>Cantidad a AJUSTAR (+ comprar, - vender)</label>
                                <div className="input-group">
                                    <input
                                        type="number"
                                        value={adjustmentAmount}
                                        onChange={(e) => setAdjustmentAmount(e.target.value)}
                                        placeholder="Ej. 10 o -5"
                                        autoFocus
                                        required
                                    />
                                </div>
                                <small>Usa números positivos para agregar stock, negativos para restar.</small>
                            </div>

                            <div className="form-group">
                                <label>Motivo</label>
                                <input
                                    type="text"
                                    value={adjustmentReason}
                                    onChange={(e) => setAdjustmentReason(e.target.value)}
                                    placeholder="Ej. Venta local, Compra, Merma..."
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setSelectedProduct(null)} className="btn btn-ghost">Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Guardando...' : 'Guardar Movimiento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
        .inventory-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          color: var(--color-text-muted);
          gap: 1rem;
        }
        
        .spinner {
          border: 3px solid rgba(255,255,255,0.1);
          border-left-color: var(--color-primary);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .page-header {
          margin-bottom: 2rem;
        }
        .page-header h1 { color: white; margin: 0 0 0.5rem 0; font-size: 2rem; }
        .page-header p { color: var(--color-text-muted); margin: 0; }

        .glass-panel {
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
        }

        .inventory-table {
          width: 100%;
          border-collapse: collapse;
          color: white;
        }

        .inventory-table th {
          text-align: left;
          padding: 1rem;
          color: var(--color-text-muted);
          font-weight: 500;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .inventory-table td {
          padding: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          vertical-align: middle;
        }

        .product-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .product-icon {
          color: var(--color-primary);
          opacity: 0.8;
        }

        .stock-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 99px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .stock-badge.in-stock { background: rgba(34, 197, 94, 0.1); color: #4ade80; }
        .stock-badge.out-of-stock { background: rgba(255, 255, 255, 0.05); color: #9ca3af; }

        .btn-icon {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          transition: all 0.2s;
        }
        .btn-icon:hover {
          background: rgba(255,255,255,0.1);
          border-color: white;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
        }

        .modal-content {
          width: 100%;
          max-width: 450px;
          background: #1e1e24;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          color: white;
        }
        .modal-header h3 { margin: 0; font-size: 1.25rem; font-weight: 600; }
        
        .close-btn {
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 4px;
        }
        .close-btn:hover { color: white; }

        .form-group {
          margin-bottom: 1.5rem;
        }
        .form-group label {
          display: block;
          color: var(--color-text-muted);
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }
        .form-group input {
          width: 100%;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 1rem;
        }
        .form-group small {
          display: block;
          margin-top: 0.4rem;
          color: var(--color-text-muted);
          font-size: 0.8rem;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
        }
        
        .btn { padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; border: none; font-weight: 500; }
        .btn-primary { background: var(--color-primary); color: #000; }
        .btn-ghost { background: transparent; color: white; }
        .btn-ghost:hover { background: rgba(255,255,255,0.1); }
      `}</style>
        </div>
    );
}

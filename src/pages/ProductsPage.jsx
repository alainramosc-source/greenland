import BaseLayout from '../components/layout/BaseLayout';
import { ArrowRight, ChevronRight, Filter } from 'lucide-react';
import { useState } from 'react';

const ProductsPage = () => {
    const [selectedCategory, setSelectedCategory] = useState("all");

    const categories = [
        { id: "all", label: "Ver Todo" },
        { id: "tables", label: "Mesas Plegables" },
        { id: "chairs", label: "Sillas Plegables" },
        { id: "awnings", label: "Toldos Plegables" },
        { id: "benches", label: "Bancas Plegables" },
        { id: "boxes", label: "Cajas y Cobertizos" },
        { id: "picnic", label: "Mesas de Picnic" },
        { id: "others", label: "Otros Productos" },
    ];

    /* Placeholder data until API/DB is ready */
    const products = [
        { id: 1, name: "Mesa Plegable Rectangular 1.80m", category: "tables", image: "https://via.placeholder.com/300x200?text=Mesa+1.80m" },
        { id: 2, name: "Silla Plegable de Acero", category: "chairs", image: "https://via.placeholder.com/300x200?text=Silla+Acero" },
        { id: 3, name: "Toldo Plegable 3x3m", category: "awnings", image: "https://via.placeholder.com/300x200?text=Toldo+3x3" },
        { id: 4, name: "Banca Plegable Tipo Maletín", category: "benches", image: "https://via.placeholder.com/300x200?text=Banca+Plegable" },
        { id: 5, name: "Cobertizo de Jardín 4x6", category: "boxes", image: "https://via.placeholder.com/300x200?text=Cobertizo" },
        { id: 6, name: "Mesa Picnic Madera", category: "picnic", image: "https://via.placeholder.com/300x200?text=Mesa+Picnic" },
    ];

    const filteredProducts = selectedCategory === "all"
        ? products
        : products.filter(p => p.category === selectedCategory);

    return (
        <BaseLayout>
            <div className="products-page">
                {/* Hero */}
                <div className="products-header">
                    <div className="container">
                        <h1>Nuestro Catálogo</h1>
                        <p className="lead">Mobiliario funcional para cada necesidad.</p>
                    </div>
                </div>

                <div className="container main-content">

                    {/* Filters Sidebar */}
                    <aside className="filters-sidebar">
                        <div className="filter-group">
                            <h3><Filter size={18} /> Categorías</h3>
                            <ul>
                                {categories.map(cat => (
                                    <li key={cat.id}>
                                        <button
                                            className={`filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                                            onClick={() => setSelectedCategory(cat.id)}
                                        >
                                            {cat.label} <ChevronRight size={14} className="chevron" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </aside>

                    {/* Product Grid */}
                    <main className="product-grid-section">
                        <div className="products-grid">
                            {filteredProducts.map(product => (
                                <div key={product.id} className="product-card">
                                    <div className="product-image">
                                        <img src={product.image} alt={product.name} />
                                    </div>
                                    <div className="product-info">
                                        <span className="category-tag">{categories.find(c => c.id === product.category)?.label}</span>
                                        <h3>{product.name}</h3>
                                        <button className="view-details-btn">
                                            Ver Detalles <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredProducts.length === 0 && (
                            <div className="no-products">
                                <p>No se encontraron productos en esta categoría.</p>
                            </div>
                        )}
                    </main>

                </div>
            </div>

            <style>{`
        .products-page {
          background-color: #f8f9fa;
          min-height: 100vh;
        }

        .products-header {
          background-color: var(--color-white);
          border-bottom: 1px solid #e5e5e5;
          padding: 3rem 0;
          margin-bottom: 2rem;
          text-align: center;
        }

        .products-header h1 {
          color: var(--color-primary);
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        .main-content {
          display: flex;
          gap: 2rem;
          padding-bottom: 4rem;
        }

        @media (max-width: 768px) {
          .main-content {
            flex-direction: column;
          }
        }

        /* Sidebar Filters */
        .filters-sidebar {
          width: 250px;
          flex-shrink: 0;
        }

        .filter-group {
          background-color: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .filter-group h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          font-size: 1.1rem;
          color: var(--color-black);
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 0.5rem;
        }

        .filter-group ul {
          list-style: none;
        }

        .filter-btn {
          width: 100%;
          text-align: left;
          padding: 0.75rem 0.5rem;
          border: none;
          background: none;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--color-grey);
          transition: all 0.2s;
          border-radius: 4px;
        }

        .filter-btn:hover {
          background-color: #f0f4e8;
          color: var(--color-primary);
        }

        .filter-btn.active {
          color: var(--color-primary);
          font-weight: 600;
          background-color: #e8f0d6;
        }

        .chevron {
          display: none;
        }

        .filter-btn.active .chevron {
          display: block;
        }

        /* Product Grid */
        .product-grid-section {
          flex: 1;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 2rem;
        }

        .product-card {
          background-color: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          transition: transform 0.2s, box-shadow 0.2s;
          border: 1px solid #eee;
        }

        .product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }

        .product-image {
          height: 200px;
          background-color: #f0f0f0;
          overflow: hidden;
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }

        .product-card:hover .product-image img {
          transform: scale(1.05);
        }

        .product-info {
          padding: 1.5rem;
        }

        .category-tag {
          font-size: 0.75rem;
          color: var(--color-grey);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 0.5rem;
          display: block;
        }

        .product-card h3 {
          font-size: 1.1rem;
          margin-bottom: 1rem;
          color: var(--color-black);
          height: 2.4em; /* Limit to 2 lines approx */
          overflow: hidden;
        }

        .view-details-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-primary);
          font-weight: 600;
          font-size: 0.9rem;
          padding: 0;
        }

        .view-details-btn:hover {
          text-decoration: underline;
        }
      `}</style>
        </BaseLayout>
    );
};

export default ProductsPage;

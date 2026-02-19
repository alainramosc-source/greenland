'use client';
import { Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
    const [stats, setStats] = useState({
        activeOrders: 0,
        totalSpent: 0,
        productsCount: 0
    });

    useEffect(() => {
        // Fetch stats here
    }, []);

    const StatCard = ({ title, value, icon: Icon, color }) => (
        <div className="stat-card glass-panel">
            <div className="stat-icon" style={{ backgroundColor: `${color}20`, color: color }}>
                <Icon size={24} />
            </div>
            <div className="stat-content">
                <h3>{title}</h3>
                <p className="stat-value">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="dashboard-container">
            <h1 className="page-title">Tablero General</h1>

            <div className="stats-grid">
                <StatCard
                    title="Pedidos Activos"
                    value="3"
                    icon={ShoppingCart}
                    color="#4ade80"
                />
                <StatCard
                    title="Total Comprado"
                    value="$12,450"
                    icon={TrendingUp}
                    color="#facc15"
                />
                <StatCard
                    title="Productos Disponibles"
                    value="145"
                    icon={Package}
                    color="#60a5fa"
                />
            </div>

            <div className="recent-orders glass-panel">
                <h2>Pedidos Recientes</h2>
                <div className="empty-state">
                    No hay pedidos recientes para mostrar.
                </div>
            </div>

            <style jsx>{`
        .dashboard-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-title {
          font-size: 1.75rem;
          color: white;
          margin-bottom: 2rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          transition: transform 0.2s;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-content h3 {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin-bottom: 0.25rem;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
        }

        .recent-orders {
          padding: 1.5rem;
        }

        .recent-orders h2 {
          font-size: 1.2rem;
          color: white;
          margin-bottom: 1rem;
        }

        .empty-state {
          padding: 3rem;
          text-align: center;
          color: var(--color-text-muted);
          background: rgba(255, 255, 255, 0.02);
          border-radius: var(--radius-md);
          border: 1px dashed rgba(255, 255, 255, 0.1);
        }
      `}</style>
        </div>
    );
}

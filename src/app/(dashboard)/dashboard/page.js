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
    <div className="relative">
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-wrap justify-between items-center gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 m-0">Tablero General</h1>
            <p className="text-slate-500 mt-1 font-medium m-0">Bienvenido a tu panel de control, resumen de tu actividad.</p>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-6 rounded-2xl flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#ec5b13]/10 flex items-center justify-center text-[#ec5b13]">
              <ShoppingCart size={28} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500 m-0">Pedidos Activos</p>
              <h3 className="text-3xl font-black text-slate-900 m-0">3</h3>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-6 rounded-2xl flex items-center gap-4 border-l-4 border-l-[#6a9a04]">
            <div className="w-14 h-14 rounded-xl bg-[#6a9a04]/10 flex items-center justify-center text-[#6a9a04]">
              <TrendingUp size={28} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500 m-0">Total Comprado</p>
              <h3 className="text-3xl font-black text-slate-900 m-0">$12,450</h3>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md transition-shadow p-6 rounded-2xl flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
              <Package size={28} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500 m-0">Productos Disponibles</p>
              <h3 className="text-3xl font-black text-slate-900 m-0">145</h3>
            </div>
          </div>
        </div>

        {/* Recent Orders Component */}
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 m-0">Pedidos Recientes</h2>
          </div>
          <div className="p-12 text-center text-slate-500">
            <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
              <ShoppingCart size={32} />
            </div>
            <p className="font-medium text-lg text-slate-600 m-0">No hay pedidos recientes para mostrar.</p>
            <p className="text-sm mt-1">Tus nuevos pedidos aparecerán aquí.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

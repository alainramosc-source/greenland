'use client';
import { Container, Package, Layers, DollarSign } from 'lucide-react';

export default function ReceptionsStats({ stats }) {
  const cards = [
    {
      label: 'Total Recepciones',
      value: stats.totalCount || 0,
      subtext: `${stats.completedCount || 0} completadas`,
      icon: Container,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Borradores en Espera',
      value: stats.draftsCount || 0,
      subtext: stats.draftsCount === 1 ? '1 recepción pendiente' : `${stats.draftsCount || 0} pendientes de confirmar`,
      icon: Package,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Piezas Recibidas',
      value: (stats.totalUnitsReceived || 0).toLocaleString('es-MX'),
      subtext: 'Ingresadas en inventario',
      icon: Layers,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Cargos PRO Generados',
      value: `$${(stats.totalChargesGenerated || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      subtext: 'Facturación a distribuidores PRO',
      icon: DollarSign,
      color: 'text-[#6a9a04]',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-sm hover:shadow-md rounded-2xl p-5 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">{card.label}</span>
              <div className={`w-9 h-9 rounded-xl ${card.bg} ${card.color} flex items-center justify-center shrink-0`}>
                <Icon size={18} />
              </div>
            </div>
            <p className={`text-xl sm:text-2xl font-black ${card.color === 'text-[#6a9a04]' ? 'text-[#6a9a04]' : 'text-slate-900'} m-0 tracking-tight`}>
              {card.value}
            </p>
            <p className="text-[11px] text-slate-400 font-medium m-0 mt-1">
              {card.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
}

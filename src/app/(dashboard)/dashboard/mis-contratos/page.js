'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { FolderOpen, Loader2, CheckCircle } from 'lucide-react';

export default function SupplierContractsPage() {
  const supabase = createClient();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('service_contracts')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setContracts(data);
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#6a9a04]" />
        <p className="font-medium">Cargando contratos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mis Contratos</h1>
        <p className="text-slate-500 font-medium mt-1">Contratos de servicios recurrentes</p>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-12 text-center">
          <FolderOpen size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-600 mb-2">Sin contratos activos</h3>
          <p className="text-sm text-slate-400">Cuando Greenland establezca un contrato contigo, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {contracts.map(contract => (
            <div key={contract.id} className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Contrato #{contract.contract_number} — <span className="capitalize">{contract.service_type}</span></div>
                  <div className="text-sm text-slate-500 mt-1">
                    {contract.description || 'Sin descripción'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Inicio: {new Date(contract.start_date).toLocaleDateString('es-MX')}
                    {contract.end_date && <> · Fin: {new Date(contract.end_date).toLocaleDateString('es-MX')}</>}
                    {' · '}<span className="capitalize">{contract.periodicity}</span>
                  </div>
                </div>
                <div className="text-right">
                  {contract.is_active ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                      <CheckCircle size={14} /> Activo
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">Inactivo</span>
                  )}
                  <div className="text-lg font-black text-slate-800 mt-2">
                    ${Number(contract.agreed_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    <span className="text-xs font-medium text-slate-400 ml-1">/{contract.periodicity === 'mensual' ? 'mes' : contract.periodicity}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

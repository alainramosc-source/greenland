'use client';
import React from 'react';
import { Users, Shield, DollarSign, UserPlus, Download } from 'lucide-react';

export default function UsersHeader({
  activeTab,
  setActiveTab,
  distributorsCount,
  adminsCount,
  onOpenNewCollab,
  onExportCsv,
  usersToExport
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 m-0">
          Gestión de Cartera y Equipo
        </h1>
        <p className="text-slate-500 mt-1 font-medium text-sm m-0">
          Administra clientes distribuidores, equipo interno de colaboradores y cartera de Cuentas por Cobrar.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Navigation Tabs */}
        <div className="flex gap-1 bg-white/70 backdrop-blur-md rounded-2xl p-1.5 border border-white/60 shadow-sm">
          <button
            onClick={() => setActiveTab('distribuidores')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer ${
              activeTab === 'distribuidores'
                ? 'bg-[#6a9a04] text-white shadow-md shadow-[#6a9a04]/20'
                : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            <Users size={15} />
            <span>Distribuidores</span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
              activeTab === 'distribuidores' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {distributorsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('administradores')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer ${
              activeTab === 'administradores'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            <Shield size={15} />
            <span>Equipo Admin</span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
              activeTab === 'administradores' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
            }`}>
              {adminsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cxc')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer ${
              activeTab === 'cxc'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            <DollarSign size={15} />
            <span>Cuentas por Cobrar</span>
          </button>
        </div>

        {/* Global Action Buttons */}
        <button
          onClick={onOpenNewCollab}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6a9a04] hover:bg-[#5b8503] text-white text-xs font-bold border-none cursor-pointer shadow-md shadow-[#6a9a04]/20 transition-all"
        >
          <UserPlus size={16} />
          <span>Crear Colaborador</span>
        </button>

        <button
          onClick={() => onExportCsv(usersToExport)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer shadow-sm transition-all"
          title="Exportar listado a CSV"
        >
          <Download size={15} />
          <span className="hidden sm:inline">CSV</span>
        </button>
      </div>
    </div>
  );
}

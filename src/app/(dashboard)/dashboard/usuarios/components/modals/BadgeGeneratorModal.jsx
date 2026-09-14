'use client';
import React from 'react';
import { X, Download, Printer, Edit2, Save, Loader2, ShieldCheck } from 'lucide-react';

export default function BadgeGeneratorModal({
  badgeUser,
  setBadgeUser,
  badgeSettings,
  setBadgeSettings,
  showEditBadgeTexts,
  setShowEditBadgeTexts,
  downloadingFront,
  downloadingBack,
  downloadBadgeImage
}) {
  if (!badgeUser) return null;

  const handleSaveSettings = () => {
    try {
      localStorage.setItem('greenland_badge_settings', JSON.stringify(badgeSettings));
    } catch (e) {}
    setShowEditBadgeTexts(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 rounded-3xl max-w-5xl w-full p-6 shadow-2xl border border-slate-800 space-y-6 animate-scaleUp my-8 text-white">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider">
                Exclusivo Administradores
              </span>
            </div>
            <h3 className="text-xl font-black text-white m-0 mt-1 flex items-center gap-2">
              Generador de Gafete / Credencial PVC
            </h3>
            <p className="text-xs text-slate-400 m-0">
              Generación de credencial de identificación oficial para: <strong className="text-white">{badgeUser.full_name || badgeUser.email}</strong>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditBadgeTexts(!showEditBadgeTexts)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            >
              <Edit2 size={14} />
              <span>{showEditBadgeTexts ? 'Ocultar Textos' : 'Editar Textos Reverso'}</span>
            </button>

            <button
              onClick={() => downloadBadgeImage('badge-front-print', `gafete_frente_${badgeUser.full_name || 'admin'}.png`, 'front')}
              disabled={downloadingFront}
              className="px-4 py-2 bg-[#6a9a04] hover:bg-[#588003] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-[#6a9a04]/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {downloadingFront ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              <span>Descargar Frente PNG</span>
            </button>

            <button
              onClick={() => downloadBadgeImage('badge-back-print', `gafete_reverso_${badgeUser.full_name || 'admin'}.png`, 'back')}
              disabled={downloadingBack}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {downloadingBack ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              <span>Descargar Reverso PNG</span>
            </button>

            <button
              onClick={() => setBadgeUser(null)}
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors ml-2"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Text Settings Drawer */}
        {showEditBadgeTexts && (
          <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 space-y-3 animate-fadeIn text-xs">
            <h4 className="font-bold text-white text-sm m-0">Personalizar Textos para Reverso de Credencial</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Misión</label>
                <textarea
                  rows={2}
                  value={badgeSettings.mision}
                  onChange={(e) => setBadgeSettings({ ...badgeSettings, mision: e.target.value })}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-[#6a9a04]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Visión</label>
                <textarea
                  rows={2}
                  value={badgeSettings.vision}
                  onChange={(e) => setBadgeSettings({ ...badgeSettings, vision: e.target.value })}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-[#6a9a04]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Valores</label>
                <textarea
                  rows={2}
                  value={badgeSettings.valores}
                  onChange={(e) => setBadgeSettings({ ...badgeSettings, valores: e.target.value })}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-[#6a9a04]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Contacto de Emergencias</label>
                <input
                  type="text"
                  value={badgeSettings.emergencias}
                  onChange={(e) => setBadgeSettings({ ...badgeSettings, emergencias: e.target.value })}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-[#6a9a04]"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                className="px-4 py-1.5 bg-[#6a9a04] hover:bg-[#588003] text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
              >
                <Save size={13} />
                Guardar Textos
              </button>
            </div>
          </div>
        )}

        {/* Visual Badge Display (Side by Side) */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 py-4">
          {/* FRONT SIDE */}
          <div className="flex flex-col items-center gap-2.5">
            <span className="text-xs font-black uppercase tracking-widest text-[#6a9a04] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#6a9a04] animate-pulse"></span> Frente (Fotografía y Datos)
            </span>

            <div
              id="badge-front-print"
              className="w-[310px] h-[480px] bg-gradient-to-b from-slate-950 via-slate-900 to-black rounded-[26px] border-[3px] border-slate-700/80 shadow-[0_0_35px_rgba(0,0,0,0.5)] p-5 flex flex-col justify-between relative overflow-hidden text-center select-none font-sans text-white"
            >
              {/* Metallic Shimmer Background Line */}
              <div className="absolute -top-24 -left-24 w-72 h-72 bg-gradient-to-br from-[#6a9a04]/20 to-emerald-500/0 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-gradient-to-tl from-purple-600/20 to-indigo-500/0 rounded-full blur-2xl pointer-events-none"></div>

              {/* Lanyard Slot / Hole */}
              <div className="w-10 h-3.5 bg-slate-900 border-2 border-slate-600 rounded-full mx-auto shadow-inner flex items-center justify-center relative z-10">
                <div className="w-6 h-1.5 bg-slate-950 rounded-full"></div>
              </div>

              {/* Official Seal Watermark Badge */}
              <div className="absolute top-4 right-4 z-10">
                <div className="w-9 h-9 rounded-full bg-slate-900/80 border border-[#6a9a04]/50 flex items-center justify-center text-[7px] font-black text-[#6a9a04] leading-none text-center shadow-lg">
                  GREENLAND<br/>OFFICIAL<br/>SEAL
                </div>
              </div>

              {/* Header Brand */}
              <div className="mt-1 relative z-10">
                <h4 className="text-base font-black tracking-wider text-white m-0 drop-shadow-md">GREENLAND</h4>
                <p className="text-[9px] font-black tracking-[0.25em] text-[#6a9a04] uppercase m-0">PRODUCTS S.A. DE C.V.</p>
              </div>

              {/* Photo Avatar Frame */}
              <div className="relative mx-auto my-1 z-10">
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-tr from-[#6a9a04] via-emerald-400 to-teal-300 p-[3.5px] shadow-[0_0_20px_rgba(106,154,4,0.35)]">
                  <div className="w-full h-full rounded-[13px] bg-slate-950 overflow-hidden flex items-center justify-center relative">
                    <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center text-5xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-[#6a9a04] to-emerald-300">
                      {(badgeUser.full_name || badgeUser.email || 'G').charAt(0).toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Name & Role */}
              <div className="mt-0.5 relative z-10">
                <h3 className="text-xl font-black text-white m-0 tracking-tight leading-snug drop-shadow-md">
                  {badgeUser.full_name || 'Nombre Colaborador'}
                </h3>
                <p className="text-xs font-bold text-slate-300 m-0 mt-0.5">
                  {badgeUser.job_title || (badgeUser.sub_role === 'super_admin' || badgeUser.sub_role === 'admin' ? 'Director Operativo' : 'Colaborador Oficial')}
                </p>

                {/* Access Tier Capsule */}
                <div className="inline-flex items-center gap-1 bg-slate-900/90 border border-[#6a9a04]/40 px-3 py-0.5 rounded-full mt-2 shadow-inner">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">ACCESS TIER:</span>
                  <span className="text-[9px] font-black text-[#6a9a04] uppercase tracking-wider">
                    {badgeUser.sub_role?.toUpperCase() || 'ADMIN'}
                  </span>
                </div>
              </div>

              {/* Scannable Barcode */}
              <div className="bg-white rounded-xl p-2 text-slate-950 border border-slate-300 shadow-xl mt-2 relative z-10">
                <div className="flex items-center justify-center gap-[2px] h-8 overflow-hidden">
                  {[3,1,2,4,1,3,2,1,4,2,1,3,1,4,2,3,1,2,4,1,3,2,4,1,2,3,1].map((w, i) => (
                    <div key={i} className="h-full bg-slate-950" style={{ width: `${w * 1.6}px` }}></div>
                  ))}
                </div>
                <p className="text-[10px] font-mono font-black text-slate-950 m-0 mt-1 tracking-[0.2em] uppercase">
                  {badgeUser.employee_barcode || `EMP-${badgeUser.id.slice(0, 6).toUpperCase()}`}
                </p>
              </div>

            </div>
          </div>

          {/* BACK SIDE */}
          <div className="flex flex-col items-center gap-2.5">
            <span className="text-xs font-black uppercase tracking-widest text-[#6a9a04] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#6a9a04] animate-pulse"></span> Reverso (Misión, Visión y Contacto)
            </span>

            <div
              id="badge-back-print"
              className="w-[310px] h-[480px] bg-gradient-to-b from-slate-950 via-slate-900 to-black rounded-[26px] border-[3px] border-slate-700/80 shadow-[0_0_35px_rgba(0,0,0,0.5)] p-5 flex flex-col justify-between relative overflow-hidden text-center select-none font-sans text-white"
            >
              {/* Laser Grid Pattern Overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(#6a9a04_1px,transparent_1px)] [background-size:14px_14px] opacity-15 pointer-events-none"></div>

              {/* Lanyard Hole */}
              <div className="w-10 h-3.5 bg-slate-900 border-2 border-slate-600 rounded-full mx-auto shadow-inner flex items-center justify-center relative z-10">
                <div className="w-6 h-1.5 bg-slate-950 rounded-full"></div>
              </div>

              {/* Brand Tag */}
              <div className="relative z-10 border-b border-slate-800 pb-1">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#6a9a04] m-0">
                  GREENLAND PRODUCTS — BACK SIDE
                </p>
              </div>

              {/* Mision, Vision, Valores Blocks */}
              <div className="space-y-2 mt-1 text-left relative z-10">
                <div className="bg-slate-900/80 backdrop-blur-sm p-2.5 rounded-xl border border-slate-800 shadow-sm">
                  <p className="text-[10px] font-black text-[#6a9a04] uppercase tracking-wider m-0 mb-0.5 flex items-center gap-1">
                    <span>🎯</span> MISIÓN
                  </p>
                  <p className="text-[9px] text-slate-300 m-0 leading-tight whitespace-pre-line">{badgeSettings.mision}</p>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-sm p-2.5 rounded-xl border border-slate-800 shadow-sm">
                  <p className="text-[10px] font-black text-[#6a9a04] uppercase tracking-wider m-0 mb-0.5 flex items-center gap-1">
                    <span>🚀</span> VISIÓN
                  </p>
                  <p className="text-[9px] text-slate-300 m-0 leading-tight whitespace-pre-line">{badgeSettings.vision}</p>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-sm p-2 rounded-xl border border-slate-800 shadow-sm">
                  <p className="text-[10px] font-black text-[#6a9a04] uppercase tracking-wider m-0 mb-0.5 flex items-center gap-1">
                    <span>⭐</span> VALORES
                  </p>
                  <p className="text-[8.5px] text-slate-300 m-0 leading-tight font-medium whitespace-pre-line">
                    {badgeSettings.valores}
                  </p>
                </div>
              </div>

              {/* Emergency Contact & QR */}
              <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl text-center relative z-10 flex items-center justify-between px-3">
                <div className="text-left">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider m-0">CONTACTO DE EMERGENCIA</p>
                  <p className="text-[9.5px] font-black text-white m-0">{badgeSettings.emergencias}</p>
                </div>
                <div className="w-10 h-10 bg-white rounded-lg p-0.5 flex items-center justify-center shadow-md">
                  <div className="w-full h-full bg-slate-950 rounded border border-slate-800 flex items-center justify-center text-[7px] font-black text-[#6a9a04]">
                    QR
                  </div>
                </div>
              </div>

              {/* Return Legend */}
              <div className="text-[7.5px] text-slate-400 text-center leading-tight border-t border-slate-800/80 pt-1.5 relative z-10">
                SI ENCUENTRA ESTA TARJETA, FAVOR DE DEVOLVER A:<br/>
                <strong>GREENLAND PRODUCTS SA DE CV</strong> | Blvd. Vito Alessio Robles #3550, Saltillo, Coah., CP 25100.
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

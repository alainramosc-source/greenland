'use client';

import { Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PendingApprovalPage() {
    return (
        <div className="min-h-screen bg-[#f8f6f6] flex items-center justify-center relative overflow-hidden">
            {/* Background Blurs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#ec5b13]/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#6a9a04]/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-lg bg-white/80 backdrop-blur-xl border border-white flex flex-col items-center justify-center text-center shadow-2xl rounded-3xl p-10 relative z-10 m-4">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
                    <Clock className="w-10 h-10 text-amber-500" />
                </div>

                <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-4">
                    Cuenta en revisión
                </h1>

                <p className="text-slate-600 font-medium leading-relaxed mb-8">
                    Gracias por registrarte en el portal de distribuidores autorizados de GREENLAND Products. Tu cuenta se encuentra actualmente en espera de aprobación por parte de un administrador. Una vez aprobada, podrás acceder a la plataforma.
                </p>

                <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-white bg-[#ec5b13] px-6 py-3 rounded-xl hover:bg-[#ec5b13]/90 transition-all shadow-md">
                    <ArrowLeft className="w-4 h-4" />
                    Volver al inicio
                </Link>
            </div>
        </div>
    );
}

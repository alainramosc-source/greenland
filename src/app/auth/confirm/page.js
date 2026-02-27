'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

function ConfirmContent() {
    const supabase = createClient();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('verifying');

    useEffect(() => {
        const handleConfirmation = async () => {
            const token_hash = searchParams.get('token_hash');
            const type = searchParams.get('type');

            if (token_hash && type) {
                const { error } = await supabase.auth.verifyOtp({
                    token_hash,
                    type: type === 'signup' ? 'signup' : type === 'email' ? 'email' : 'signup',
                });
                if (error) {
                    console.error('Verification error:', error.message);
                    setStatus('error');
                } else {
                    setStatus('success');
                    setTimeout(() => router.push('/dashboard'), 3000);
                }
            } else {
                setStatus('success');
                setTimeout(() => router.push('/dashboard'), 3000);
            }
        };
        handleConfirmation();
    }, []);

    return (
        <>
            {status === 'verifying' && (
                <>
                    <Loader2 size={48} className="animate-spin text-[#6a9a04] mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-slate-900">Verificando tu correo...</h1>
                    <p className="text-sm text-slate-500 mt-2">Un momento por favor</p>
                </>
            )}

            {status === 'success' && (
                <>
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                        <CheckCircle size={40} className="text-green-600" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900">¡Correo Confirmado!</h1>
                    <p className="text-slate-500 mt-3 text-sm leading-relaxed">
                        Tu cuenta ha sido verificada exitosamente.<br />
                        Serás redirigido al portal en unos segundos...
                    </p>
                    <Link href="/dashboard"
                        className="inline-block mt-6 px-6 py-3 bg-[#6a9a04] text-white font-bold rounded-xl text-sm hover:bg-[#6a9a04]/90 transition-all shadow-lg shadow-[#6a9a04]/20 no-underline">
                        Ir al Portal →
                    </Link>
                </>
            )}

            {status === 'error' && (
                <>
                    <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
                        <AlertTriangle size={40} className="text-amber-600" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900">Error de Verificación</h1>
                    <p className="text-slate-500 mt-3 text-sm leading-relaxed">
                        El enlace de confirmación puede haber expirado o ya fue utilizado.<br />
                        Si ya confirmaste tu correo, intenta iniciar sesión.
                    </p>
                    <Link href="/login"
                        className="inline-block mt-6 px-6 py-3 bg-[#6a9a04] text-white font-bold rounded-xl text-sm hover:bg-[#6a9a04]/90 transition-all shadow-lg shadow-[#6a9a04]/20 no-underline">
                        Iniciar Sesión
                    </Link>
                </>
            )}
        </>
    );
}

export default function AuthConfirmPage() {
    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f8fdf0 0%, #eef7d5 50%, #f0f9e8 100%)' }}>
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 max-w-md w-full mx-4 text-center border border-white/50">
                <img src="/logo-new.jpg" alt="GreenLand" className="h-16 mx-auto mb-6 object-contain" style={{ mixBlendMode: 'multiply' }} />
                <Suspense fallback={<Loader2 size={48} className="animate-spin text-[#6a9a04] mx-auto" />}>
                    <ConfirmContent />
                </Suspense>
            </div>
        </div>
    );
}

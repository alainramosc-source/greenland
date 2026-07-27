'use client';
import { createClient } from '@/utils/supabase/client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function UpdatePasswordPage() {
    const supabase = createClient();
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('form'); // 'form', 'success', 'error'
    const [error, setError] = useState(null);
    const [sessionReady, setSessionReady] = useState(false);

    useEffect(() => {
        // Listen for the PASSWORD_RECOVERY event from Supabase
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                setSessionReady(true);
            }
        });

        // Also check if there's already an active session (callback already exchanged the code)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setSessionReady(true);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);

        const { error: updateError } = await supabase.auth.updateUser({
            password: password,
        });

        if (updateError) {
            setError(updateError.message);
            setStatus('error');
        } else {
            setStatus('success');
            setTimeout(() => router.push('/dashboard'), 3000);
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f8fdf0 0%, #eef7d5 50%, #f0f9e8 100%)' }}>
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 max-w-md w-full mx-4 text-center border border-white/50">
                <img src="/logo-new.jpg" alt="GreenLand" className="h-16 mx-auto mb-6 object-contain" style={{ mixBlendMode: 'multiply' }} />

                {status === 'form' && (
                    <>
                        <div className="w-16 h-16 bg-[#6a9a04]/10 text-[#6a9a04] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock size={32} />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 mb-2">Nueva Contraseña</h1>
                        <p className="text-slate-500 text-sm mb-6">
                            Ingresa tu nueva contraseña para tu cuenta de GreenLand.
                        </p>

                        {!sessionReady ? (
                            <div className="flex flex-col items-center gap-3 py-4">
                                <Loader2 size={32} className="animate-spin text-[#6a9a04]" />
                                <p className="text-sm text-slate-500">Verificando sesión...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleUpdatePassword} className="space-y-4 text-left">
                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nueva Contraseña</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            minLength={6}
                                            className="w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 outline-none transition-all shadow-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer p-0"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Confirmar Contraseña</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            minLength={6}
                                            className="w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 outline-none transition-all shadow-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer p-0"
                                        >
                                            {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 bg-[#6a9a04] hover:bg-[#5a8503] text-white rounded-xl font-bold shadow-lg shadow-[#6a9a04]/20 transition-all cursor-pointer border-none disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Actualizando...
                                        </>
                                    ) : (
                                        'ACTUALIZAR CONTRASEÑA'
                                    )}
                                </button>
                            </form>
                        )}
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                            <CheckCircle size={40} className="text-green-600" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900">¡Contraseña Actualizada!</h1>
                        <p className="text-slate-500 mt-3 text-sm leading-relaxed">
                            Tu contraseña ha sido actualizada exitosamente.<br />
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
                        <h1 className="text-2xl font-black text-slate-900">Error al Actualizar</h1>
                        <p className="text-slate-500 mt-3 text-sm leading-relaxed">
                            {error || 'Hubo un problema al actualizar tu contraseña.'}<br />
                            Intenta solicitar un nuevo enlace de recuperación.
                        </p>
                        <Link href="/login"
                            className="inline-block mt-6 px-6 py-3 bg-[#6a9a04] text-white font-bold rounded-xl text-sm hover:bg-[#6a9a04]/90 transition-all shadow-lg shadow-[#6a9a04]/20 no-underline">
                            Volver al Login
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}

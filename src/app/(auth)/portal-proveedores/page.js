'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Eye, EyeOff, Lock, Mail, ArrowRight, KeyRound, Truck } from 'lucide-react';
import Link from 'next/link';

export default function SupplierLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [viewState, setViewState] = useState('login'); // 'login' | 'recover'

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (viewState === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        // Verify they are a supplier
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile?.role !== 'supplier') {
          await supabase.auth.signOut();
          setError('Esta cuenta no tiene acceso al portal de proveedores. Si eres distribuidor, accede desde el portal de distribuidores.');
          setLoading(false);
          return;
        }

        router.push('/dashboard');
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Se ha enviado un enlace de recuperación a tu correo electrónico.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f6f6] flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#1e3a5f]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#6a9a04]/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl bg-white/60 backdrop-blur-xl border border-white flex shadow-2xl overflow-hidden rounded-3xl m-4 relative z-10">

        {/* Left Side */}
        <div className="hidden md:flex w-1/2 relative p-12 flex-col justify-between border-r border-slate-200/30" style={{ background: 'linear-gradient(135deg, rgba(30,58,95,0.08) 0%, rgba(106,154,4,0.06) 100%)' }}>
          <div>
            <Link href="/" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-[#6a9a04] transition-colors mb-10">
              ← Volver al inicio
            </Link>

            <div className="mb-8">
              <img
                src="/logo-new.jpg"
                alt="GreenLand Products"
                className="h-28 w-auto object-contain"
                style={{ mixBlendMode: 'multiply' }}
              />
            </div>

            <h2 className="text-lg font-bold text-slate-700 tracking-wide uppercase mb-3">
              Portal de Proveedores
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed max-w-sm">
              Acceso exclusivo para proveedores de servicios de GreenLand Products. Desde aquí podrás consultar tus órdenes de servicio, actualizar estatus, subir evidencias y gestionar tu facturación.
            </p>
          </div>

          <div className="flex gap-8 pt-8 border-t border-slate-200/50 mt-12">
            <div className="flex items-center gap-3 text-slate-600">
              <Truck size={24} className="text-[#6a9a04]" />
              <span className="text-sm font-bold">Órdenes · Evidencias · Facturación</span>
            </div>
          </div>
        </div>

        {/* Right Side (Login Form) */}
        <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white/80">
          <div className="md:hidden mb-6 flex justify-center">
            <img
              src="/logo-new.jpg"
              alt="GreenLand Products"
              className="h-20 w-auto object-contain"
              style={{ mixBlendMode: 'multiply' }}
            />
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
              {viewState === 'recover' ? 'Recuperar Contraseña' : 'Iniciar Sesión'}
            </h2>
            <p className="text-[#747474] font-medium">
              {viewState === 'recover' ? 'Ingresa tu correo para recibir un enlace de acceso' : 'Accede al Portal de Proveedores Greenland'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-[#6a9a04]/10 border border-[#6a9a04]/20 text-[#6a9a04] px-4 py-3 rounded-xl mb-6 text-sm font-medium">
              {message}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  placeholder="ejemplo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            {viewState !== 'recover' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Contraseña</label>
                  <button type="button" onClick={() => { setViewState('recover'); setError(null); setMessage(null); }} className="text-xs font-bold text-[#6a9a04] hover:underline cursor-pointer bg-transparent border-none">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 bg-[#6a9a04] hover:bg-[#5a8503] text-white rounded-xl font-bold shadow-lg shadow-[#6a9a04]/20 transition-all cursor-pointer border-none disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : (viewState === 'recover' ? 'ENVIAR ENLACE' : 'INGRESAR')}
              {!loading && viewState !== 'recover' && <ArrowRight className="w-5 h-5" />}
              {!loading && viewState === 'recover' && <KeyRound className="w-5 h-5" />}
            </button>
          </form>

          {viewState === 'recover' && (
            <div className="mt-8 text-center text-sm text-[#747474] font-medium">
              ¿Ya la recordaste?
              <button
                onClick={() => { setViewState('login'); setError(null); setMessage(null); }}
                className="ml-2 text-[#6a9a04] font-bold hover:underline bg-transparent border-none cursor-pointer"
              >
                Inicia Sesión
              </button>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
            ¿No tienes acceso? Contacta a tu ejecutivo en Greenland Products.
          </div>
        </div>
      </div>
    </div>
  );
}

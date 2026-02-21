'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Eye, EyeOff, Lock, Mail, ArrowRight, MapPin, Phone, User, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [viewState, setViewState] = useState('login'); // 'login', 'register', 'recover'

  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (viewState === 'register') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            city: city,
            phone: phone,
          },
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } else if (viewState === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } else if (viewState === 'recover') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/dashboard` // Redirigiremos de vuelta a dashboard u otra URL validada
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Se ha enviado un enlace de recuperación a tu correo electrónico.');
      }
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen bg-[#f8f6f6] flex items-center justify-center relative overflow-hidden">
      {/* Background Blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#ec5b13]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#6a9a04]/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl bg-white/60 backdrop-blur-xl border border-white flex shadow-2xl overflow-hidden rounded-3xl m-4 relative z-10 w-full">

        {/* Left Side (Branding Info) */}
        <div className="hidden md:flex w-1/2 bg-[#6a9a04]/5 relative p-12 flex-col justify-between border-r border-[#6a9a04]/10">
          <div>
            <Link href="/" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-[#ec5b13] transition-colors mb-12">
              ← Volver al inicio
            </Link>
            <div className="w-16 h-16 bg-white/80 backdrop-blur-sm border border-white text-[#ec5b13] flex items-center justify-center text-3xl font-black rounded-2xl shadow-sm mb-8">
              G
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight mb-2">
              GREENLAND<br />
              <span className="text-lg font-bold tracking-widest text-[#ec5b13] uppercase">Products</span>
            </h1>
            <p className="text-slate-600 font-medium leading-relaxed mt-4 max-w-sm">
              Portal exclusivo para distribuidores autorizados. Gestiona pedidos, inventarios y seguimiento en tiempo real con nuestra nueva plataforma.
            </p>
          </div>

          <div className="flex gap-8 pt-8 border-t border-slate-200/50 mt-12">
            <div>
              <strong className="block text-2xl font-black text-slate-900">500+</strong>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clientes B2B</span>
            </div>
            <div>
              <strong className="block text-2xl font-black text-slate-900">50K+</strong>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unidades</span>
            </div>
          </div>
        </div>

        {/* Right Side (Auth Form) */}
        <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white/80">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
              {viewState === 'register' ? 'Crear Cuenta' : viewState === 'recover' ? 'Recuperar Contraseña' : 'Iniciar Sesión'}
            </h2>
            <p className="text-slate-500 font-medium">
              {viewState === 'register' ? 'Regístrate para comenzar' : viewState === 'recover' ? 'Ingresa tu correo para recibir un enlace de acceso' : 'Accede a tu portal de distribuidor'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
              {message}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {viewState === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Juan Pérez"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ec5b13]/30 focus:border-[#ec5b13] text-slate-800 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Ciudad</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Monterrey"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ec5b13]/30 focus:border-[#ec5b13] text-slate-800 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Celular</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="tel"
                        placeholder="81 1234 5678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ec5b13]/30 focus:border-[#ec5b13] text-slate-800 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

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
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ec5b13]/30 focus:border-[#ec5b13] text-slate-800 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            {viewState !== 'recover' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Contraseña</label>
                  {viewState === 'login' && (
                    <button type="button" onClick={() => { setViewState('recover'); setError(null); setMessage(null); }} className="text-xs font-bold text-[#ec5b13] hover:underline cursor-pointer bg-transparent border-none">
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ec5b13]/30 focus:border-[#ec5b13] text-slate-800 outline-none transition-all shadow-sm"
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
              className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 bg-[#ec5b13] hover:bg-[#ec5b13]/90 text-white rounded-xl font-bold shadow-lg shadow-[#ec5b13]/20 transition-all cursor-pointer border-none disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : (viewState === 'register' ? 'REGISTRARSE' : viewState === 'recover' ? 'ENVIAR ENLACE' : 'INGRESAR')}
              {!loading && viewState !== 'recover' && <ArrowRight className="w-5 h-5" />}
              {!loading && viewState === 'recover' && <KeyRound className="w-5 h-5" />}
            </button>
          </form>

          {viewState !== 'recover' && (
            <>
              <div className="flex items-center my-6 text-slate-400">
                <div className="flex-1 border-b border-slate-200"></div>
                <span className="px-3 text-xs font-bold uppercase tracking-wider">O inicia con</span>
                <div className="flex-1 border-b border-slate-200"></div>
              </div>

              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold shadow-sm transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </button>
            </>
          )}

          <div className="mt-8 text-center text-sm text-slate-500 font-medium">
            {viewState === 'register' ? '¿Ya tienes cuenta?' : viewState === 'recover' ? '¿Ya la recordaste?' : '¿No tienes cuenta?'}
            <button
              onClick={() => {
                setViewState(viewState === 'login' ? 'register' : 'login');
                setError(null);
                setMessage(null);
              }}
              className="ml-2 text-[#ec5b13] font-bold hover:underline bg-transparent border-none cursor-pointer"
            >
              {viewState === 'register' ? 'Inicia Sesión' : viewState === 'recover' ? 'Inicia Sesión' : 'Solicita acceso'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

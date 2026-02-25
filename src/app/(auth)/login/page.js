'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Eye, EyeOff, Lock, Mail, ArrowRight, MapPin, Phone, User, KeyRound, Building, Home } from 'lucide-react';
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
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
            company_name: companyName,
            address: address,
          },
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setLoading(false);
        setShowSuccessModal(true);
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
        redirectTo: `${window.location.origin}/dashboard`
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
      {/* Background Blurs - Brand Colors */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#6a9a04]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#dee24b]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[50%] left-[50%] w-[30%] h-[30%] bg-[#6a9a04]/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-5xl bg-white/60 backdrop-blur-xl border border-white flex shadow-2xl overflow-hidden rounded-3xl m-4 relative z-10 w-full">

        {/* Left Side (Branding Info) */}
        <div className="hidden md:flex w-1/2 relative p-12 flex-col justify-between border-r border-[#6a9a04]/15" style={{ background: 'linear-gradient(135deg, rgba(106,154,4,0.08) 0%, rgba(222,226,75,0.06) 100%)' }}>
          <div>
            <Link href="/" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-[#6a9a04] transition-colors mb-10">
              ← Volver al inicio
            </Link>

            {/* Real Greenland Logo */}
            <div className="mb-8">
              <img
                src="/logo-new.jpg"
                alt="GreenLand Products"
                className="h-28 w-auto object-contain"
                style={{ mixBlendMode: 'multiply' }}
              />
            </div>

            <h2 className="text-lg font-bold text-[#6a9a04] tracking-wide uppercase mb-3">
              Portal de Distribuidores
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed max-w-sm">
              Acceso exclusivo para distribuidores autorizados. Gestiona pedidos, inventarios y seguimiento en tiempo real con nuestra plataforma.
            </p>
          </div>

          <div className="flex gap-8 pt-8 border-t border-[#6a9a04]/15 mt-12">
            <div>
              <strong className="block text-2xl font-black text-slate-900">500+</strong>
              <span className="text-xs font-bold text-[#747474] uppercase tracking-wider">Clientes B2B</span>
            </div>
            <div>
              <strong className="block text-2xl font-black text-slate-900">50K+</strong>
              <span className="text-xs font-bold text-[#747474] uppercase tracking-wider">Unidades</span>
            </div>
          </div>
        </div>

        {/* Right Side (Auth Form) */}
        <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white/80">
          {/* Mobile Logo */}
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
              {viewState === 'register' ? 'Crear Cuenta' : viewState === 'recover' ? 'Recuperar Contraseña' : 'Iniciar Sesión'}
            </h2>
            <p className="text-[#747474] font-medium">
              {viewState === 'register' ? 'Regístrate como distribuidor Greenland' : viewState === 'recover' ? 'Ingresa tu correo para recibir un enlace de acceso' : 'Accede al Portal Oficial de Distribuidores Greenland'}
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
            {viewState === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-4">
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
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nombre de la Empresa</label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Mi Empresa S.A."
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 outline-none transition-all shadow-sm"
                      />
                    </div>
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
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 outline-none transition-all shadow-sm"
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
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Domicilio</label>
                  <div className="relative">
                    <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Calle Falsa 123"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 outline-none transition-all shadow-sm"
                    />
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
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6a9a04]/30 focus:border-[#6a9a04] text-slate-800 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            {viewState !== 'recover' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Contraseña</label>
                  {viewState === 'login' && (
                    <button type="button" onClick={() => { setViewState('recover'); setError(null); setMessage(null); }} className="text-xs font-bold text-[#6a9a04] hover:underline cursor-pointer bg-transparent border-none">
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
              {loading ? 'Procesando...' : (viewState === 'register' ? 'REGISTRARSE' : viewState === 'recover' ? 'ENVIAR ENLACE' : 'INGRESAR')}
              {!loading && viewState !== 'recover' && <ArrowRight className="w-5 h-5" />}
              {!loading && viewState === 'recover' && <KeyRound className="w-5 h-5" />}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-[#747474] font-medium">
            {viewState === 'register' ? '¿Ya tienes cuenta?' : viewState === 'recover' ? '¿Ya la recordaste?' : '¿No tienes cuenta?'}
            <button
              onClick={() => {
                setViewState(viewState === 'login' ? 'register' : 'login');
                setError(null);
                setMessage(null);
              }}
              className="ml-2 text-[#6a9a04] font-bold hover:underline bg-transparent border-none cursor-pointer"
            >
              {viewState === 'register' ? 'Inicia Sesión' : viewState === 'recover' ? 'Inicia Sesión' : 'Solicita acceso'}
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center px-4">
          <div className="bg-white/90 backdrop-blur-xl border border-white max-w-[400px] w-full rounded-2xl shadow-2xl overflow-hidden text-center p-8">
            <div className="w-16 h-16 bg-[#6a9a04]/10 text-[#6a9a04] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">
              ¡Registro Exitoso!
            </h3>
            <p className="text-[#747474] font-medium mb-8">
              Tu solicitud ha sido recibida por Greenland. Se encuentra en revisión por nuestro equipo, una vez aprobada podrás acceder a la plataforma.
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setViewState('login');
                }}
                className="px-6 py-3 rounded-xl text-white font-bold bg-[#6a9a04] hover:bg-[#5a8503] shadow-lg shadow-[#6a9a04]/20 cursor-pointer transition-all border-none w-full"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

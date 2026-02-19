'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Eye, EyeOff, Lock, Mail, ArrowRight, MapPin, Phone, User } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isRegistering) {
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
    } else {
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
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <Link href="/" className="back-link">← Volver al inicio</Link>
          <div className="brand-content">
            <span className="logo-mark">G</span>
            <h1>GREENLAND<br /><span>PRODUCTS</span></h1>
            <p>Portal exclusivo para distribuidores autorizados. Gestiona pedidos, inventarios y seguimiento en tiempo real.</p>
          </div>
          <div className="brand-stats">
            <div><strong>500+</strong><span>Clientes B2B</span></div>
            <div><strong>50K+</strong><span>Unidades</span></div>
            <div><strong>8</strong><span>Centros</span></div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="login-header">
            <h2>{isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>
            <p>{isRegistering ? 'Regístrate para comenzar' : 'Accede a tu portal de distribuidor'}</p>
          </div>

          {error && (
            <div className="error-alert">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="login-form">
            {isRegistering && (
              <>
                <div className="form-group">
                  <label>Nombre Completo</label>
                  <div className="input-wrapper">
                    <User className="input-icon" size={18} />
                    <input
                      type="text"
                      placeholder="Juan Pérez"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Ciudad</label>
                  <div className="input-wrapper">
                    <MapPin className="input-icon" size={18} />
                    <input
                      type="text"
                      placeholder="Monterrey, NL"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Teléfono Celular</label>
                  <div className="input-wrapper">
                    <Phone className="input-icon" size={18} />
                    <input
                      type="tel"
                      placeholder="81 1234 5678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}
            <div className="form-group">
              <label>Correo Electrónico</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={18} />
                <input
                  type="email"
                  placeholder="ejemplo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Contraseña</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Procesando...' : (isRegistering ? 'REGISTRARSE' : 'INGRESAR')}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="divider">
            <span>O continúa con</span>
          </div>

          <button onClick={handleGoogleLogin} className="btn-google">
            <svg className="google-icon" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google
          </button>

          <p className="auth-footer">
            {isRegistering ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="switch-btn"
            >
              {isRegistering ? 'Inicia Sesión' : 'Solicita acceso'}
            </button>
          </p>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        /* Left panel */
        .login-left {
          background: var(--color-primary, #064E3B);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          position: relative;
          overflow: hidden;
        }

        .login-left::before {
          content: '';
          position: absolute;
          top: -30%;
          right: -30%;
          width: 80%;
          height: 160%;
          background: radial-gradient(ellipse, rgba(74, 222, 128, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .login-brand {
          position: relative;
          z-index: 2;
          max-width: 400px;
        }

        .back-link {
          display: inline-block;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 3rem;
          transition: color 0.2s;
        }
        .back-link:hover {
          color: rgba(255, 255, 255, 0.9);
        }

        .brand-content .logo-mark {
          width: 56px;
          height: 56px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #FFFFFF;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.75rem;
          margin-bottom: 2rem;
        }

        .brand-content h1 {
          font-size: 2.5rem;
          font-weight: 900;
          color: #FFFFFF;
          letter-spacing: 0.04em;
          line-height: 1.1;
          margin-bottom: 1.5rem;
        }
        .brand-content h1 span {
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.2em;
          color: rgba(255,255,255,0.4);
        }

        .brand-content p {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.7;
        }

        .brand-stats {
          display: flex;
          gap: 2rem;
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .brand-stats div {
          display: flex;
          flex-direction: column;
        }
        .brand-stats strong {
          font-size: 1.5rem;
          font-weight: 800;
          color: #FFFFFF;
        }
        .brand-stats span {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 500;
        }

        /* Right panel */
        .login-right {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          background: var(--color-bg, #FFFFFF);
        }

        .login-card {
          width: 100%;
          max-width: 400px;
        }

        .login-header {
          margin-bottom: 2rem;
        }

        .login-header h2 {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--color-text, #111);
          margin-bottom: 0.5rem;
        }

        .login-header p {
          color: var(--color-text-secondary, #555);
          font-size: 0.95rem;
        }

        .error-alert {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #DC2626;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: var(--color-text, #111);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .input-wrapper {
          position: relative;
        }

        .input-wrapper :global(.input-icon) {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-muted, #999);
        }

        .input-wrapper input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 3rem;
          background: var(--color-bg-soft, #F5F5F5);
          border: 1px solid var(--color-border, #E5E5E5);
          border-radius: 12px;
          color: var(--color-text, #111);
          font-size: 0.95rem;
          transition: all 0.2s;
          font-family: inherit;
        }

        .input-wrapper input::placeholder {
          color: var(--color-text-muted, #999);
        }

        .input-wrapper input:focus {
          border-color: var(--color-primary, #064E3B);
          outline: none;
          box-shadow: 0 0 0 3px rgba(6, 78, 59, 0.08);
        }

        .toggle-password {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-muted, #999);
          padding: 0;
        }
        .toggle-password:hover {
          color: var(--color-text, #111);
        }

        .btn-submit {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem;
          background: var(--color-primary, #064E3B);
          color: #FFFFFF;
          border: none;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: all 0.3s;
          font-family: inherit;
          margin-top: 0.5rem;
        }
        .btn-submit:hover:not(:disabled) {
          background: var(--color-primary-light, #0D7A5F);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(6, 78, 59, 0.2);
        }
        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 1.75rem 0;
          color: var(--color-text-muted, #999);
          font-size: 0.8rem;
        }
        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--color-border, #E5E5E5);
        }
        .divider span {
          padding: 0 1rem;
        }

        .btn-google {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.875rem;
          background: var(--color-bg, #FFFFFF);
          color: var(--color-text, #111);
          border: 1px solid var(--color-border, #E5E5E5);
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .btn-google:hover {
          background: var(--color-bg-soft, #F5F5F5);
          border-color: var(--color-text-muted, #999);
        }

        .google-icon {
          width: 18px;
          height: 18px;
        }

        .auth-footer {
          margin-top: 2rem;
          text-align: center;
          font-size: 0.9rem;
          color: var(--color-text-secondary, #555);
        }

        .switch-btn {
          background: none;
          border: none;
          color: var(--color-primary, #064E3B);
          font-weight: 700;
          cursor: pointer;
          padding-left: 0.5rem;
          font-family: inherit;
          font-size: 0.9rem;
        }
        .switch-btn:hover {
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .login-page {
            grid-template-columns: 1fr;
          }
          .login-left {
            display: none;
          }
          .login-right {
            padding: 2rem 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

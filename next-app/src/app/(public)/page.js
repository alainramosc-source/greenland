
import { ArrowRight, Box, Layout, ShieldCheck, Truck, Users, ChevronRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import './home.css';

export const revalidate = 0;

export default async function HomePage() {
  const supabase = await createClient();
  const { data: contentRows } = await supabase
    .from('cms_content')
    .select('section_key, title, body, media_url')
    .eq('is_published', true);

  const getContent = (key) => {
    const row = contentRows?.find(r => r.section_key === key);
    return row || {};
  };

  const heroMain = getContent('hero-main');
  const heroBg = getContent('hero-bg');
  const spaces = getContent('division-spaces');
  const deco = getContent('division-deco');
  const essentials = getContent('essentials-main');
  const values = getContent('values-main');
  const coverage = getContent('coverage-main');

  return (
    <div className="home-page">
      {/* ===== HERO SECTION ===== */}
      <section className="hero">
        <div className="container hero-container">
          <div className="hero-content">
            <span className="hero-tag">DISTRIBUCIÓN NACIONAL</span>
            <h1>
              {heroMain.title || (
                <>
                  Mobiliario<br />
                  <span className="accent">Funcional</span> de<br />
                  Clase Mundial
                </>
              )}
            </h1>
            <p>{heroMain.body || 'Soluciones de referencia en mobiliario para eventos, hotelería y uso comercial. Diseño, durabilidad y logística integral.'}</p>
            <div className="hero-actions">
              <Link href="/productos" className="btn btn-primary">
                Ver Catálogo <ArrowRight size={18} />
              </Link>
              <Link href="/distribuidores" className="btn btn-outline">
                Ser Distribuidor
              </Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-value">500+</span>
                <span className="hero-stat-label">Clientes B2B</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">50K+</span>
                <span className="hero-stat-label">Stock</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">24h</span>
                <span className="hero-stat-label">Envíos</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div
              className="hero-image-card"
              style={{
                backgroundImage: `url('${heroBg.media_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_EoL7QEGxHvyceQujGyCtx07pkDm2Ja8mzD1hFDGXfcEpIB1IZ7tDBLtSHdjesnDbLYPubBkpg1TkCELr5ZmEehcjBVvzh4cqBEvDMIJI-rnznbMOWTY8kezYjrcj8DSraarAPQ5xNNnqiEdULiE_D0vvASMxXeOwORgBVGX9eXPO6_O4uJvssgekbmnjzZ0gu00OSNTG_jpekwKlOnDo_xuVRqYfhDYTL4pqUYJozmklPFezhls3cHgMW6ulN6PH_q6Ay_H9jjw'}')`
              }}
            ></div>
            <div className="hero-decoration"></div>
          </div>
        </div>
      </section>

      {/* ===== TRUSTED BY ===== */}
      <section className="trusted-section">
        <div className="container">
          <div className="trusted-content">
            <span className="trusted-label">Confianza de +500 negocios</span>
            <div className="trusted-logos">
              <span className="trusted-logo">HILTON</span>
              <span className="trusted-logo">MARRIOTT</span>
              <span className="trusted-logo">CEMEX</span>
              <span className="trusted-logo">OXXO</span>
              <span className="trusted-logo">LIVERPOOL</span>
              <span className="trusted-logo">WALMART</span>
              <span className="trusted-logo">CINÉPOLIS</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== DIVISIONS ===== */}
      <section className="divisions-section">
        <div className="container">
          <div className="divisions-header">
            <h2>Nuestras<br />Divisiones</h2>
          </div>
          <div className="divisions-grid">
            <Link href="/productos?cat=spaces" className="division-card">
              <div
                className="division-image-overlay"
                style={{
                  backgroundImage: `url('${spaces.media_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLz8v4_oFPBMMiqCnrU76QJwnn2PSkxsMf4ylCQzZWd7Cv8ModRb2NMS0IWyOB9z4gpX8_j6GalqUY1J2LXpHsKRjTdwm9UTzkzvGkaX287ySLZHg2fNjGEzRh-ZFdyCT__kUasJORbAsWrKuzDSOONhO1NtwhOKPyKAJJu6MuascVyD4muSzR9OU_8TN-AmlTpuxkFuSVp9cer-n8f7Fdx68oLjrnc-RmS_B51vaRdi4CFxf90wsheDvJmVsvok_gcnbqo_BMp5I'}')`
                }}
              ></div>
              <div className="division-content">
                <h2>{spaces.title || 'Greenland Spaces'}</h2>
                <p>{spaces.body || 'Equipamiento robusto para eventos masivos, oficinas corporativas y espacios comerciales de alto tráfico.'}</p>
                <span className="link-arrow">
                  Explorar Spaces <ArrowRight size={16} />
                </span>
              </div>
            </Link>
            <Link href="/productos?cat=deco" className="division-card">
              <div
                className="division-image-overlay"
                style={{
                  backgroundImage: `url('${deco.media_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAPmn4yrX5vdF1CiFCxBnM8LCkujODoYraLU-YiTAjd8wrVwDFLEec0YoE1JROMS2KSGLg1mr02oZavrXBty020USeV5WHTuhenJm-Wr6ZuDjzpv6zTalWl6RW7jEy43EAMYL6xsG5gjPVYKltu4Qq19POIVzlYZCb60pHkqWuQN3ww5-Q5hDdV4FPv_yN8Wl56cv9Dle019xIqSb2CuTLjAmcFMXf3gMEFkMIfIKPIaD-HnMCFBQ1XQDYrQS_9ocxPEpP_38P90W8'}')`
                }}
              ></div>
              <div className="division-content">
                <h2>{deco.title || 'Greenland Deco'}</h2>
                <p>{deco.body || 'Piezas de diseño exclusivo que combinan estética moderna con funcionalidad para el hogar contemporáneo.'}</p>
                <span className="link-arrow">
                  Explorar Deco <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== PRODUCT CATEGORIES ===== */}
      <section className="essentials-section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">CATÁLOGO</span>
            <h2>{essentials.title || 'Categorías Destacadas'}</h2>
            <p>{essentials.body || 'Nuestro catálogo más solicitado por profesionales.'}</p>
          </div>

          <div className="products-grid">
            <Link href="/productos?cat=mesas" className="product-category-card">
              <div className="category-image-wrapper">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAO2iX306BVU0Y1mwqhVM0TDenOx15Qj_GEB5Z_UkkK0qx7T74fzVgKKURtX_lPZ1xV3Q0C6hG-FJSzsHrrZXqw0MTf3OM0r6-jeT6-mfrVLEtOi_s6TzB5kddIHwiPrUEi7KIrZZnjCHcu9xgsfl0m79XVtFsO3iGMFY5I4vcz_0g0NTy6tLeSdIdiQeEedQ1kCngK1_j8hdd2xA4_8eFjS-trLNHCHALbixcQ0ZNIaHIBMazWC2DL0T_Lae1VlaxLloEs9h-AkjU" alt="Mesas Plegables" />
              </div>
              <h3>Mesas Plegables</h3>
              <p>Rectangulares y redondas, HDPE alta densidad.</p>
              <span className="virtual-btn">Ver Modelos →</span>
            </Link>
            <Link href="/productos?cat=sillas" className="product-category-card">
              <div className="category-image-wrapper">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAN9X-tB_ZYE7BZLXDlH77Px4LMyF4Ce1dCmHrUEceD-y_vl0qBs1fomoyc0MoWqjBwNRCuESGm8f0eHa-8aoI5zUQMlA9rxaLiEDmkOMO8SASsUB5X18Hwhy_FtACPwvJGn7YseuvZDTgGU-Ec03O3PbBu94yjjYpsB1Cz5tnMCCJ7B2ypbyNBhhxA0dmP2gL5wwXEZ_1ASfBCun0VnbmWGKVt7ci7n8q6RlindORYVlWX9PsXC0H4e3nQcDvoDhvPFkcx3WAbIeg" alt="Sillas de Evento" />
              </div>
              <h3>Sillas de Evento</h3>
              <p>Tiffany, Avant y Plegables profesionales.</p>
              <span className="virtual-btn">Ver Modelos →</span>
            </Link>
            <Link href="/productos?cat=toldos" className="product-category-card">
              <div className="category-image-wrapper">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBmplUHMWlumvsOOFf--Rqq5AAAhik84OFOR6vyYbUAHwPOMyiv0MGdPTaLeSNnjqXzWKV2rOdDoNEuvpna2OijmmdfZ-FkvV0wSzpqpnhdhBq8jabToitDDB1Dpg-9dkWDGAaThBuCdUBmW5RHIIiU6CwQHogg5X1eZxnvVj4thB3xLtmmTZLyLfhQDxh_TI2LQtfrckFqtUNQ466mAsPUbmg2xJMUt88j7QnCVLxyPxIpSAqOSOKVvnHGXTR0PVNYbaxMKBx6ZpQ" alt="Toldos Profesionales" />
              </div>
              <h3>Toldos Profesionales</h3>
              <p>Carpa y plegables 3x3 de fácil montaje.</p>
              <span className="virtual-btn">Ver Modelos →</span>
            </Link>
            <Link href="/productos?cat=bancas" className="product-category-card">
              <div className="category-image-wrapper">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgXBrFf0z3HQw6MUecviGaPLekdosOBBckY-00hNa3GKBGJ9zEoXSn3JCfkhG8bDd0zLHtAro0d3kK-fGosyyUsgXRKy8CKhYNhWhwHglMoWwfDw5wnytoy5UkIf6ZAScMaT91clg81g_9LEZYey5gAOy98eBFBdOHxm_tyNPmt5wJByfXW0JE7K-NsK5wPcoldNYp6pUPOWYZswwAMyd8vvUueiTykHcqW_pfn4XzpI39_qhroVaEwUMuZvy20fc-pOsOVgi_8to" alt="Bancas & Mobiliario" />
              </div>
              <h3>Bancas & Mobiliario</h3>
              <p>Parques, jardines y complementos versátiles.</p>
              <span className="virtual-btn">Ver Modelos →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== WHY GREENLAND ===== */}
      <section className="values-section">
        <div className="container values-container">
          <div className="values-text">
            <span className="section-label">POR QUÉ GREENLAND</span>
            <h2>{values.title || 'Estándar Industrial.\nSin Complicaciones.'}</h2>
            <ul className="values-list">
              <li>
                <strong>Calidad de Exportación</strong> — Polietileno de alta densidad (HDPE) y acero con
                recubrimiento en polvo para máxima durabilidad.
              </li>
              <li>
                <strong>Stock Permanente</strong> — Más de 50,000 unidades listas para envío inmediato
                desde nuestros centros de distribución.
              </li>
              <li>
                <strong>Logística Integrada</strong> — Envíos rastreados a cualquier código postal de la
                República Mexicana en 24-72 horas.
              </li>
              <li>
                <strong>Soporte B2B Dedicado</strong> — Ejecutivos especializados y atención personalizada
                para distribuidores y mayoristas.
              </li>
            </ul>
            <Link href="/nosotros" className="btn btn-glass">
              Conoce más sobre nosotros <ArrowRight size={16} />
            </Link>
          </div>
          <div className="values-image">
            <div
              className="img-placeholder"
              style={{
                backgroundImage: `url('${values.media_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCmFVNtzbEMtc8JFc58Qn4MD-sQPX8M-jr2h36vBwe75MX_HHS7r0QtBpOOoKUttUqR7syaVmxndAaar6J4qQGaPrL6T1wvjQzZKlfZkd19IU_CHuSQblZNjQp3F2x8HqRLL2aMGQisNCTuN-Nl_D70OEW1uscNJvATBi0URC4AMGPxIqaCQrZTNZrs7mx2B6W-hkxIyidm_ODgCBY8EYRnAdoawUTfuIkYmJiLTFG47LnOLwQqFUiR6CDGGG8qYt-KOjprhzxU23g'}')`
              }}
            ></div>
          </div>
        </div>
      </section>

      {/* ===== COVERAGE ===== */}
      <section className="coverage-section">
        <div className="container">
          <div className="coverage-content">
            <div className="coverage-info">
              <Truck size={40} className="coverage-icon" />
              <h2>{coverage.title || 'Cobertura Total'}</h2>
              <p>{coverage.body || 'Nuestra red logística conecta estratégicamente el norte, centro y sur del país.'}</p>
            </div>
            <div className="coverage-map-wrapper">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwkgcldJkjfmmaOP9aBPrsgunw4R1EoM0PvGVQjj_uUEK5wHP78cjrTBcvy1OhtOEA2Tp_8pMpzq19R8qu0438FqCeSKUi-WLbv9dUv2138jf3G6euTb6fjfb4s6pntdcGvc0cm0neKjW4MP_EsMkhuJWbEFWgG1-Edw0iY7yREU5kUa31XG0d2erwZOmzEuvbWBpmqIAU7KTGqzCJy2REMZ4Jkif62yL2PVga1g0UAnayGVbqPFBVAEXH5hHv3zVwwP9gZUATDU0"
                alt="Mapa de Cobertura Nacional"
                className="coverage-map-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>¿Listo para transformar<br />tu negocio?</h2>
            <p>Solicita el catálogo completo o únete a nuestra red de distribuidores autorizados.</p>
            <div className="cta-actions">
              <Link href="/productos" className="btn btn-white">
                Solicitar Catálogo <ArrowRight size={18} />
              </Link>
              <Link href="/distribuidores" className="btn btn-outline-white">
                Ser Distribuidor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer rendered by layout */}
    </div>
  );
}

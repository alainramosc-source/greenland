
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
                backgroundImage: `url('${heroBg.media_url || '/mesa%20black.jpg'}')`
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


      {/* ===== PRODUCT CATEGORIES ===== */}
      <section className="essentials-section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">CATÁLOGO</span>
            <h2>{essentials.title || 'Categorías Destacadas'}</h2>
            <p>{essentials.body || 'Nuestro catálogo más solicitado por profesionales.'}</p>
          </div>

          <div className="products-grid">
            <Link href="/categorias/mesas-plegables" className="product-category-card">
              <div className="category-image-wrapper">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAO2iX306BVU0Y1mwqhVM0TDenOx15Qj_GEB5Z_UkkK0qx7T74fzVgKKURtX_lPZ1xV3Q0C6hG-FJSzsHrrZXqw0MTf3OM0r6-jeT6-mfrVLEtOi_s6TzB5kddIHwiPrUEi7KIrZZnjCHcu9xgsfl0m79XVtFsO3iGMFY5I4vcz_0g0NTy6tLeSdIdiQeEedQ1kCngK1_j8hdd2xA4_8eFjS-trLNHCHALbixcQ0ZNIaHIBMazWC2DL0T_Lae1VlaxLloEs9h-AkjU" alt="Mesas Plegables" />
              </div>
              <h3>Mesas Plegables</h3>
              <p>Soluciones versátiles en múltiples tamaños y formatos.</p>
              <span className="virtual-btn">Ver Modelos →</span>
            </Link>
            <Link href="/categorias/sillas-plegables" className="product-category-card">
              <div className="category-image-wrapper">
                <img src="/sillas-category.png" alt="Sillas Plegables" />
              </div>
              <h3>Sillas Plegables</h3>
              <p>Resistentes, funcionales y listas para cualquier ocasión.</p>
              <span className="virtual-btn">Ver Modelos →</span>
            </Link>
            <Link href="/categorias/toldos-plegables" className="product-category-card">
              <div className="category-image-wrapper">
                <img src="/toldos-category.jpg" alt="Toldos Profesionales" />
              </div>
              <h3>Toldos Plegables</h3>
              <p>Sombra práctica y estructura confiable para uso frecuente.</p>
              <span className="virtual-btn">Ver Modelos →</span>
            </Link>
            <Link href="/categorias/bancas-y-mobiliario" className="product-category-card">
              <div className="category-image-wrapper">
                <img src="/bancas-category.jpg" alt="Bancas & Mobiliario" />
              </div>
              <h3>Bancas y Mobiliario</h3>
              <p>Mobiliario funcional para exteriores y áreas comunes.</p>
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
              <h2>Logística Estratégica</h2>
              <p>Greenland opera desde múltiples puntos estratégicos, desde donde surte a distribuidores y clientes en todo México con máxima velocidad, disponibilidad y confiabilidad logística.</p>
            </div>
            <div className="coverage-map-wrapper">
              <div className="coverage-map-container">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwkgcldJkjfmmaOP9aBPrsgunw4R1EoM0PvGVQjj_uUEK5wHP78cjrTBcvy1OhtOEA2Tp_8pMpzq19R8qu0438FqCeSKUi-WLbv9dUv2138jf3G6euTb6fjfb4s6pntdcGvc0cm0neKjW4MP_EsMkhuJWbEFWgG1-Edw0iY7yREU5kUa31XG0d2erwZOmzEuvbWBpmqIAU7KTGqzCJy2REMZ4Jkif62yL2PVga1g0UAnayGVbqPFBVAEXH5hHv3zVwwP9gZUATDU0"
                  alt="Mapa de Cobertura Nacional"
                  className="coverage-map-image"
                />

                {/* Puntos estratégicos */}
                <div className="map-pin saltillo" title="Saltillo"></div>
                <div className="map-pin monterrey" title="Monterrey"></div>
                <div className="map-pin altamira" title="Altamira"></div>
                <div className="map-pin mazatlan" title="Mazatlán"></div>
                <div className="map-pin queretaro" title="Querétaro"></div>
                <div className="map-pin morelia" title="Morelia"></div>
                <div className="map-pin tlalnepantla" title="Tlalnepantla"></div>
                <div className="map-pin merida" title="Mérida"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== DIVISIONS (Original Design, Footer Location) ===== */}
      <section className="divisions-section">
        <div className="container">
          <div className="divisions-header">
            <h2>Nuestras<br />Divisiones</h2>
          </div>
          <div className="divisions-grid">
            <Link href="/spaces" className="division-card">
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
            <Link href="/deco" className="division-card">
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

'use client';
import { useState } from 'react';
import { Copy, Check, Building2, ShieldCheck, CreditCard, Mail, Phone, MapPin, FileText } from 'lucide-react';
import './datos-bancarios.css';

const bankData = [
  { label: 'BANCO', value: 'BANORTE', icon: Building2, full: true },
  { label: 'BENEFICIARIO', value: 'GREENLAND PRODUCTS SA DE CV', icon: FileText, full: true },
  { label: 'CUENTA BANCARIA', value: '1302256025', icon: CreditCard },
  { label: 'CLABE INTERBANCARIA', value: '072078013022560258', icon: CreditCard },
  { label: 'RFC', value: 'GPR230911971', icon: FileText },
  { label: 'ENVIAR COMPROBANTE A', value: 'ventas@greenland-products.com.mx', icon: Mail },
];

export default function DatosBancariosPage() {
  const [copied, setCopied] = useState(null);

  const handleCopy = (value, idx) => {
    navigator.clipboard.writeText(value);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bank-page">
      {/* Hero */}
      <section className="bank-hero">
        <div className="container">
          <div className="bank-hero-content">
            <div className="bank-hero-badge">
              <ShieldCheck size={14} />
              INFORMACIÓN OFICIAL VERIFICADA
            </div>
            <h1>Datos <span className="accent">Bancarios</span></h1>
            <p>Información oficial para realizar transferencias y depósitos a Greenland Products S.A. de C.V.</p>
          </div>
        </div>
      </section>

      {/* Main Card */}
      <section className="bank-section">
        <div className="container">
          <div className="bank-card">
            {/* Card Header */}
            <div className="bank-card-header">
              <div className="bank-card-header-left">
                <div className="bank-icon-circle">
                  <Building2 size={24} />
                </div>
                <div>
                  <h2>Greenland Products S.A. de C.V.</h2>
                  <p>Datos para transferencia electrónica</p>
                </div>
              </div>
              <div className="bank-verified-badge">
                <ShieldCheck size={16} />
                VERIFICADO
              </div>
            </div>

            {/* Data Grid */}
            <div className="bank-data-grid">
              {bankData.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className={`bank-data-item ${item.full ? 'full-width' : ''}`}
                    onClick={() => handleCopy(item.value, idx)}
                  >
                    <div className="bank-data-label">
                      <Icon size={13} />
                      {item.label}
                    </div>
                    <div className="bank-data-value">
                      <span>{item.value}</span>
                      <button className="bank-copy-btn" title="Copiar">
                        {copied === idx
                          ? <Check size={14} className="copied" />
                          : <Copy size={14} />
                        }
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Notice */}
            <div className="bank-notice">
              <div className="bank-notice-icon">💡</div>
              <div>
                <strong>Importante:</strong> Al realizar tu transferencia, incluye tu nombre o razón social como concepto
                para facilitar la identificación de tu pago.
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bank-contact">
            <h3>¿Necesitas ayuda con tu pago?</h3>
            <p>Nuestro equipo está disponible para asistirte con cualquier duda sobre facturación o pagos.</p>
            <div className="bank-contact-grid">
              <a href="tel:+528441058692" className="bank-contact-card">
                <Phone size={20} />
                <div>
                  <span className="bank-contact-label">Teléfono</span>
                  <span className="bank-contact-value">(844) 105 8692</span>
                </div>
              </a>
              <a href="mailto:ventas@greenland-products.com.mx" className="bank-contact-card">
                <Mail size={20} />
                <div>
                  <span className="bank-contact-label">Email</span>
                  <span className="bank-contact-value">ventas@greenland-products.com.mx</span>
                </div>
              </a>
              <div className="bank-contact-card">
                <MapPin size={20} />
                <div>
                  <span className="bank-contact-label">Dirección</span>
                  <span className="bank-contact-value">Blvd. Vito Alessio Robles N° 3550 Int #9, Saltillo, Coah.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

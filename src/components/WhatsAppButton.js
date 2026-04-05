'use client';
import { useState, useEffect } from 'react';

const WHATSAPP_NUMBER = '528441595472';
const DEFAULT_MESSAGE = 'Hola, me interesa obtener información sobre sus productos';

export default function WhatsAppButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Show button after a short delay for smooth entrance
    const timer = setTimeout(() => setIsVisible(true), 1500);
    // Show tooltip after 5 seconds to draw attention
    const tooltipTimer = setTimeout(() => setShowTooltip(true), 5000);
    const hideTooltip = setTimeout(() => setShowTooltip(false), 12000);
    return () => {
      clearTimeout(timer);
      clearTimeout(tooltipTimer);
      clearTimeout(hideTooltip);
    };
  }, []);

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;

  return (
    <>
      <style jsx>{`
        .whatsapp-float {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 12px;
          opacity: 0;
          transform: scale(0.5) translateY(20px);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .whatsapp-float.visible {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
        .whatsapp-tooltip {
          background: white;
          color: #1a1a1a;
          padding: 10px 16px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          white-space: nowrap;
          opacity: 0;
          transform: translateX(10px);
          transition: all 0.3s ease;
          pointer-events: none;
        }
        .whatsapp-tooltip.show {
          opacity: 1;
          transform: translateX(0);
        }
        .whatsapp-btn {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #25D366;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(37, 211, 102, 0.4);
          transition: all 0.3s ease;
          position: relative;
          text-decoration: none;
        }
        .whatsapp-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 28px rgba(37, 211, 102, 0.5);
        }
        .whatsapp-btn:active {
          transform: scale(0.95);
        }
        .whatsapp-btn svg {
          width: 32px;
          height: 32px;
          fill: white;
        }
        .whatsapp-pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: rgba(37, 211, 102, 0.3);
          animation: pulse 2s ease-out infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @media (max-width: 768px) {
          .whatsapp-float {
            bottom: 16px;
            right: 16px;
          }
          .whatsapp-btn {
            width: 54px;
            height: 54px;
          }
          .whatsapp-btn svg {
            width: 28px;
            height: 28px;
          }
          .whatsapp-tooltip {
            display: none;
          }
        }
      `}</style>
      <div className={`whatsapp-float ${isVisible ? 'visible' : ''}`}>
        <div className={`whatsapp-tooltip ${showTooltip ? 'show' : ''}`}>
          💬 ¿Necesitas ayuda?
        </div>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-btn"
          aria-label="Contactar por WhatsApp"
          id="whatsapp-float-btn"
        >
          <span className="whatsapp-pulse" />
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16.004c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.118-1.958a15.917 15.917 0 008.832 2.668C24.826 31.998 32 24.822 32 16.004 32 7.176 24.826 0 16.004 0zm9.53 22.606c-.396 1.118-2.326 2.138-3.21 2.236-.884.1-1.706.398-5.744-1.196-4.868-1.924-7.96-6.892-8.2-7.212-.24-.32-1.96-2.608-1.96-4.974 0-2.366 1.24-3.528 1.68-4.01.44-.48.96-.6 1.28-.6.32 0 .64.002.92.016.294.014.69-.112 1.08.824.394 .95 1.34 3.276 1.46 3.516.12.24.2.52.04.84-.16.318-.24.518-.48.798-.24.28-.504.626-.72.84-.24.24-.49.498-.21.978.28.48 1.248 2.058 2.678 3.334 1.838 1.638 3.388 2.146 3.868 2.386.48.24.76.2 1.04-.12.28-.32 1.2-1.398 1.52-1.878.32-.48.64-.398 1.08-.24.44.16 2.786 1.314 3.266 1.554.48.24.8.36.92.558.12.2.12 1.138-.276 2.256z"/>
          </svg>
        </a>
      </div>
    </>
  );
}

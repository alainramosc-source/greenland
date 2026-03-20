'use client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CoberturaLayout({ children }) {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: '#f8f6f6',
      backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')",
    }}>
      {/* Mini sidebar — just a back arrow */}
      <div style={{
        width: 48,
        minWidth: 48,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: 8,
        borderRight: '1px solid rgba(148, 163, 184, 0.15)',
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Logo */}
        <Link
          href="/dashboard"
          title="Volver al Dashboard"
          style={{
            width: 34, height: 34,
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #6a9a04, #8bc34a)',
            color: '#fff', fontWeight: 900, fontSize: 13,
            textDecoration: 'none',
            marginBottom: 4,
            transition: 'transform 0.2s',
          }}
          className="hover:scale-110"
        >
          G
        </Link>

        {/* Back to dashboard */}
        <Link
          href="/dashboard"
          title="← Dashboard"
          className="hover:bg-slate-100 transition-colors"
          style={{
            width: 34, height: 34, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#64748b', textDecoration: 'none',
          }}
        >
          <ArrowLeft size={18} />
        </Link>
      </div>

      {/* Main content area — fullscreen */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}

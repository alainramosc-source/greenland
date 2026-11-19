'use client';
import { useEffect, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { disableInboxPush, pushApplicationKey } from '@/lib/inbox-push-browser';

async function saveSubscription(subscription) {
  const response = await fetch('/api/inbox/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription.toJSON()) });
  if (!response.ok) throw new Error('No se pudieron guardar los avisos. Intenta de nuevo.');
}

export default function InboxPushControl() {
  const [status, setStatus] = useState('checking');
  const [config, setConfig] = useState(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        if (!cancelled) setStatus('unsupported');
        return;
      }
      try {
        const response = await fetch('/api/inbox/push', { cache: 'no-store' });
        if (!response.ok) throw new Error('No se pudo comprobar el estado de los avisos.');
        const settings = await response.json();
        if (cancelled) return;
        setConfig(settings);
        if (!settings.configured) { setStatus('unavailable'); return; }
        const registration = await navigator.serviceWorker.getRegistration('/dashboard/inbox');
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription && Notification.permission === 'granted') {
          await saveSubscription(subscription);
          if (!cancelled) setStatus('on');
        } else if (!cancelled) setStatus(Notification.permission === 'denied' ? 'blocked' : 'off');
      } catch (error) {
        if (!cancelled) { setMessage(error.message); setStatus('off'); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function toggle() {
    setMessage('');
    if (status === 'blocked') {
      setMessage('Permite las notificaciones de este sitio en los ajustes de tu navegador y vuelve a abrir el Inbox.');
      return;
    }
    const wasOn = status === 'on';
    setStatus('busy');
    try {
      if (wasOn) {
        await disableInboxPush();
        setStatus('off');
        setMessage('Avisos desactivados en este dispositivo.');
        return;
      }
      if (!config?.publicKey) throw new Error('Recarga el Inbox para comprobar la disponibilidad de los avisos.');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setStatus(permission === 'denied' ? 'blocked' : 'off'); return; }
      const registration = await navigator.serviceWorker.register('/inbox-push-sw.js', { scope: '/dashboard/inbox', updateViaCache: 'none' });
      if (!registration.active) {
        await new Promise((resolve, reject) => {
          const worker = registration.installing || registration.waiting;
          if (registration.active || worker?.state === 'activated') { resolve(); return; }
          if (!worker) { reject(new Error('No se pudo activar el servicio de avisos.')); return; }
          const timer = setTimeout(() => reject(new Error('La activación tardó demasiado. Intenta de nuevo.')), 15000);
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') { clearTimeout(timer); resolve(); }
            if (worker.state === 'redundant') { clearTimeout(timer); reject(new Error('No se pudo activar el servicio de avisos.')); }
          });
        });
      }
      const subscription = await registration.pushManager.getSubscription()
        || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: pushApplicationKey(config.publicKey) });
      await saveSubscription(subscription);
      setStatus('on');
      setMessage('Avisos activos en este dispositivo.');
    } catch (error) {
      setStatus(wasOn ? 'on' : 'off');
      setMessage(error.message || 'No se pudieron activar los avisos.');
    }
  }

  const labels = { on: 'Avisos activos', off: 'Activar avisos', busy: 'Configurando…', checking: 'Comprobando avisos…', blocked: 'Avisos bloqueados', unavailable: 'Avisos aún no disponibles', unsupported: 'Navegador sin avisos push' };
  const Icon = status === 'on' ? BellRing : Bell;
  return <div className="shrink-0 flex flex-wrap items-center gap-2 bg-slate-900 px-3 py-2 border-b border-slate-800 text-xs">
    <button type="button" onClick={toggle} disabled={['busy','checking','unavailable','unsupported'].includes(status)}
      title={status === 'on' ? 'Desactivar avisos en este dispositivo' : 'Avisar con cada mensaje entrante'}
      className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-1.5 text-slate-100 disabled:opacity-50 cursor-pointer">
      <Icon className="h-4 w-4" />{labels[status]}
    </button>
    <span role="status" aria-live="polite" className={`text-slate-300 ${message ? '' : 'hidden sm:inline'}`}>{message || 'Avisos de cada mensaje nuevo del cliente.'}</span>
  </div>;
}

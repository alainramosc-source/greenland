export async function disableInboxPush() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/dashboard/inbox');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  try {
    await fetch('/api/inbox/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
  } finally {
    // Browser-side revocation still works if the session/server is unavailable.
    await subscription.unsubscribe();
    for (const notification of await registration.getNotifications()) notification.close();
  }
}

export function pushApplicationKey(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

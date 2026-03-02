import { Resend } from 'resend';
import { NextResponse } from 'next/server';

let _resend;
function getResend() {
  if (!_resend) _resend = new Resend((process.env.RESEND_API_KEY || '').trim());
  return _resend;
}
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').trim().split(',').filter(Boolean).map(e => e.trim());
const FROM_EMAIL = 'Greenland Pedidos <pedidos@greenland-products.com.mx>';

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  in_fulfillment: 'En Surtido',
  shipped: 'Enviado',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
  rejected: 'Rechazado',
};

function buildOrderEmailHtml({ title, subtitle, orderNumber, status, items, total, ctaUrl, ctaText, footerNote }) {
  const statusColor = {
    pending: '#fbbf24', confirmed: '#3b82f6', in_fulfillment: '#8b5cf6',
    shipped: '#10b981', closed: '#6b7280', cancelled: '#ef4444', rejected: '#f97316',
  }[status] || '#6b7280';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#6a9a04,#8bc34a);padding:28px 24px;text-align:center;">
        <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">🌿 Greenland</h1>
        <p style="color:rgba(255,255,255,0.85);font-size:12px;margin:6px 0 0;letter-spacing:1px;text-transform:uppercase;">Sistema de Pedidos</p>
      </div>

      <!-- Content -->
      <div style="padding:28px 24px;">
        <h2 style="color:#1e293b;font-size:18px;margin:0 0 6px;font-weight:700;">${title}</h2>
        <p style="color:#64748b;font-size:14px;margin:0 0 20px;">${subtitle}</p>

        <!-- Status Badge -->
        <div style="margin-bottom:20px;">
          <span style="display:inline-block;background:${statusColor}20;color:${statusColor};font-size:12px;font-weight:700;padding:6px 14px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">
            ${STATUS_LABELS[status] || status}
          </span>
        </div>

        <!-- Order Info -->
        <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:20px;border:1px solid #e2e8f0;">
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">Pedido</p>
          <p style="margin:0;font-size:18px;color:#1e293b;font-weight:800;">#${orderNumber}</p>
          ${total ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">Total</p>
            <p style="margin:0;font-size:20px;color:#6a9a04;font-weight:800;">$${Number(total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          </div>` : ''}
        </div>

        ${items && items.length > 0 ? `
        <div style="margin-bottom:20px;">
          <p style="font-size:12px;color:#94a3b8;text-transform:uppercase;font-weight:700;margin:0 0 8px;letter-spacing:0.5px;">Productos</p>
          ${items.slice(0, 5).map(item => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;">
              <span style="font-size:13px;color:#475569;">${item.products?.name || 'Producto'} × ${item.quantity}</span>
              <span style="font-size:13px;color:#1e293b;font-weight:600;">$${Number(item.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          `).join('')}
          ${items.length > 5 ? `<p style="font-size:12px;color:#94a3b8;margin:8px 0 0;">... y ${items.length - 5} productos más</p>` : ''}
        </div>` : ''}

        ${ctaUrl ? `
        <div style="text-align:center;margin:24px 0;">
          <a href="${ctaUrl}" style="display:inline-block;background:#6a9a04;color:#fff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:12px;text-decoration:none;">
            ${ctaText || 'Ver Pedido'}
          </a>
        </div>` : ''}

        ${footerNote ? `<p style="font-size:13px;color:#94a3b8;margin:16px 0 0;line-height:1.5;font-style:italic;">${footerNote}</p>` : ''}
      </div>

      <!-- Footer -->
      <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">Greenland Products — greenland-products.com.mx</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, orderNumber, orderId, status, distributorName, distributorEmail, items, total } = body;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://greenland-app.vercel.app';
    const orderUrl = `${appUrl}/dashboard/pedidos/${orderId}`;

    let emails = [];

    if (type === 'new_order') {
      // Distributor created a new order → notify admins
      emails.push({
        from: FROM_EMAIL,
        to: ADMIN_EMAILS,
        subject: `📦 Nuevo Pedido #${orderNumber} — ${distributorName}`,
        html: buildOrderEmailHtml({
          title: `Nuevo Pedido de ${distributorName}`,
          subtitle: 'Un distribuidor ha enviado un pedido sugerido. Revisa las cantidades y confirma.',
          orderNumber,
          status: 'pending',
          items,
          total,
          ctaUrl: orderUrl,
          ctaText: 'Revisar Pedido',
        }),
      });
    } else if (type === 'status_change') {
      // Admin changed order status → notify distributor
      const statusMessages = {
        confirmed: 'Tu pedido ha sido confirmado y el inventario fue reservado.',
        in_fulfillment: 'Tu pedido está siendo surtido en nuestro almacén.',
        shipped: '¡Tu pedido ha sido enviado! Pronto lo recibirás.',
        closed: 'Tu pedido ha sido cerrado operativamente. ¡Gracias por tu compra!',
        cancelled: 'Tu pedido ha sido cancelado. Si tienes dudas, contacta a tu ejecutivo.',
        rejected: 'Tu pedido fue rechazado. Contacta a tu ejecutivo para más información.',
      };

      if (distributorEmail) {
        emails.push({
          from: FROM_EMAIL,
          to: [distributorEmail],
          subject: `🔔 Pedido #${orderNumber} — ${STATUS_LABELS[status] || status}`,
          html: buildOrderEmailHtml({
            title: `Pedido #${orderNumber} — ${STATUS_LABELS[status] || status}`,
            subtitle: statusMessages[status] || `El estado de tu pedido cambió a: ${STATUS_LABELS[status] || status}`,
            orderNumber,
            status,
            total,
            ctaUrl: orderUrl,
            ctaText: 'Ver Detalles del Pedido',
            footerNote: status === 'shipped' ? 'Te contactaremos con los detalles de envío.' : null,
          }),
        });
      }
    }

    // Send all emails
    const results = [];
    for (const email of emails) {
      const { data, error } = await getResend().emails.send(email);
      if (error) {
        console.error('Resend error:', error);
        results.push({ error: error.message });
      } else {
        results.push({ id: data?.id });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

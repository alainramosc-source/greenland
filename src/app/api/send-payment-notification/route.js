import { Resend } from 'resend';
import { NextResponse } from 'next/server';

let _resend;
function getResend() {
    if (!_resend) _resend = new Resend((process.env.RESEND_API_KEY || '').trim());
    return _resend;
}
const FROM_EMAIL = 'Greenland Pagos <pedidos@greenland-products.com.mx>';

function buildPaymentEmailHtml({ title, subtitle, amount, paymentDate, paymentMethod, reference, status, rejectionReason, ctaUrl }) {
    const statusConfig = {
        approved: { label: 'APROBADO', color: '#22c55e', emoji: '✅' },
        rejected: { label: 'RECHAZADO', color: '#ef4444', emoji: '❌' },
    };
    const st = statusConfig[status] || statusConfig.approved;

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
        <p style="color:rgba(255,255,255,0.85);font-size:12px;margin:6px 0 0;letter-spacing:1px;text-transform:uppercase;">Notificación de Pago</p>
      </div>

      <!-- Content -->
      <div style="padding:28px 24px;">
        <h2 style="color:#1e293b;font-size:18px;margin:0 0 6px;font-weight:700;">${title}</h2>
        <p style="color:#64748b;font-size:14px;margin:0 0 20px;">${subtitle}</p>

        <!-- Status Badge -->
        <div style="margin-bottom:20px;">
          <span style="display:inline-block;background:${st.color}20;color:${st.color};font-size:12px;font-weight:700;padding:6px 14px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">
            ${st.emoji} ${st.label}
          </span>
        </div>

        <!-- Payment Details -->
        <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:20px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:600;">Monto:</td>
              <td style="padding:8px 0;color:#1e293b;font-size:15px;font-weight:700;text-align:right;">$${amount}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:600;border-top:1px solid #e2e8f0;">Fecha del pago:</td>
              <td style="padding:8px 0;color:#1e293b;font-size:13px;text-align:right;border-top:1px solid #e2e8f0;">${paymentDate}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:600;border-top:1px solid #e2e8f0;">Método:</td>
              <td style="padding:8px 0;color:#1e293b;font-size:13px;text-align:right;border-top:1px solid #e2e8f0;">${paymentMethod}</td>
            </tr>
            ${reference ? `
            <tr>
              <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:600;border-top:1px solid #e2e8f0;">Referencia:</td>
              <td style="padding:8px 0;color:#1e293b;font-size:13px;text-align:right;border-top:1px solid #e2e8f0;">${reference}</td>
            </tr>` : ''}
          </table>
        </div>

        ${status === 'rejected' && rejectionReason ? `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px;margin-bottom:20px;">
          <p style="color:#dc2626;font-size:13px;font-weight:700;margin:0 0 4px;">Motivo del rechazo:</p>
          <p style="color:#7f1d1d;font-size:13px;margin:0;">${rejectionReason}</p>
        </div>` : ''}

        <!-- CTA -->
        <div style="text-align:center;margin-top:24px;">
          <a href="${ctaUrl}" style="display:inline-block;background:#6a9a04;color:#fff;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
            Ver Mis Pagos
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
        <p style="color:#94a3b8;font-size:11px;margin:0;">GreenLand Products S.A. de C.V. — Portal de Distribuidores</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { distributorEmail, distributorName, amount, paymentDate, paymentMethod, reference, status, rejectionReason } = body;

        if (!distributorEmail || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const resend = getResend();
        const formattedAmount = Number(amount).toLocaleString('es-MX', { minimumFractionDigits: 2 });
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://greenland-app.vercel.app';
        const ctaUrl = `${baseUrl}/dashboard/mis-pagos`;

        const isApproved = status === 'approved';
        const title = isApproved
            ? `${distributorName}, tu pago ha sido aprobado`
            : `${distributorName}, tu pago ha sido rechazado`;
        const subtitle = isApproved
            ? `Tu pago por $${formattedAmount} ha sido verificado y aplicado exitosamente.`
            : `Tu pago por $${formattedAmount} no pudo ser aprobado.`;
        const subject = isApproved
            ? `✅ Pago aprobado — $${formattedAmount}`
            : `❌ Pago rechazado — $${formattedAmount}`;

        const html = buildPaymentEmailHtml({
            title,
            subtitle,
            amount: formattedAmount,
            paymentDate: paymentDate || '—',
            paymentMethod: paymentMethod || '—',
            reference: reference || '',
            status,
            rejectionReason: rejectionReason || '',
            ctaUrl,
        });

        await resend.emails.send({
            from: FROM_EMAIL,
            to: [distributorEmail],
            subject,
            html,
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Payment notification error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

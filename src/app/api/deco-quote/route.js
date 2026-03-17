import { Resend } from 'resend';
import { NextResponse } from 'next/server';

let _resend;
function getResend() {
    if (!_resend) _resend = new Resend((process.env.RESEND_API_KEY || '').trim());
    return _resend;
}

const QUOTE_EMAIL = 'alain.ramos@greenland-products.com.mx';
const FROM_EMAIL = 'Greenland Deco <pedidos@greenland-products.com.mx>';

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, company, email, phone, product, quantity, location, message } = body;

        if (!name || !email || !phone || !product) {
            return NextResponse.json({ success: false, error: 'Campos requeridos faltantes' }, { status: 400 });
        }

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#5c4033,#8B6F47);padding:28px 24px;text-align:center;">
        <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">🎨 Greenland Deco</h1>
        <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:6px 0 0;letter-spacing:1px;text-transform:uppercase;">Solicitud de Cotización</p>
      </div>

      <!-- Content -->
      <div style="padding:28px 24px;">
        <h2 style="color:#1e293b;font-size:18px;margin:0 0 20px;font-weight:700;">Nueva solicitud de cotización</h2>

        <div style="background:#faf8f5;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #e8e0d6;">
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">Producto de Interés</p>
          <p style="margin:0;font-size:18px;color:#c98c56;font-weight:800;">${product}</p>
          ${quantity ? `<p style="margin:8px 0 0;font-size:14px;color:#475569;">Cantidad: <strong>${quantity}</strong></p>` : ''}
        </div>

        <div style="margin-bottom:16px;">
          <p style="font-size:12px;color:#94a3b8;text-transform:uppercase;font-weight:700;margin:0 0 8px;letter-spacing:0.5px;">Datos del Cliente</p>
          <div style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:13px;color:#64748b;">Nombre:</span>
            <span style="font-size:13px;color:#1e293b;font-weight:600;margin-left:8px;">${name}</span>
          </div>
          ${company ? `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:13px;color:#64748b;">Empresa:</span>
            <span style="font-size:13px;color:#1e293b;font-weight:600;margin-left:8px;">${company}</span>
          </div>` : ''}
          <div style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:13px;color:#64748b;">Email:</span>
            <span style="font-size:13px;color:#1e293b;font-weight:600;margin-left:8px;">${email}</span>
          </div>
          <div style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:13px;color:#64748b;">Teléfono:</span>
            <span style="font-size:13px;color:#1e293b;font-weight:600;margin-left:8px;">${phone}</span>
          </div>
          ${location ? `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:13px;color:#64748b;">Ubicación / Destino:</span>
            <span style="font-size:13px;color:#1e293b;font-weight:600;margin-left:8px;">${location}</span>
          </div>` : ''}
        </div>

        ${message ? `
        <div style="margin-bottom:16px;">
          <p style="font-size:12px;color:#94a3b8;text-transform:uppercase;font-weight:700;margin:0 0 8px;letter-spacing:0.5px;">Mensaje / Detalles</p>
          <div style="background:#faf8f5;border-radius:8px;padding:12px;border:1px solid #e8e0d6;">
            <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;white-space:pre-wrap;">${message}</p>
          </div>
        </div>` : ''}

        <div style="text-align:center;margin:24px 0;">
          <a href="mailto:${email}" style="display:inline-block;background:#c98c56;color:#fff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:12px;text-decoration:none;">
            Responder al Cliente
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#faf8f5;padding:16px 24px;text-align:center;border-top:1px solid #e8e0d6;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">Greenland Deco — greenland-products.com.mx</p>
      </div>
    </div>
  </div>
</body>
</html>`;

        const { data, error } = await getResend().emails.send({
            from: FROM_EMAIL,
            to: [QUOTE_EMAIL],
            replyTo: email,
            subject: `🎨 Cotización Deco: ${product} — ${name}`,
            html,
        });

        if (error) {
            console.error('Resend error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: data?.id });
    } catch (error) {
        console.error('Deco Quote API error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

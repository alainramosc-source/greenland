import { Resend } from 'resend';
import { NextResponse } from 'next/server';

let _resend;
function getResend() {
    if (!_resend) _resend = new Resend((process.env.RESEND_API_KEY || '').trim());
    return _resend;
}

const ADMIN_EMAIL = 'alain.ramos@greenland-products.com.mx';
const FROM_EMAIL = 'Greenland Distribuidores <pedidos@greenland-products.com.mx>';

export async function POST(request) {
    try {
        const body = await request.json();
        const { company, email, phone, city } = body;

        if (!company || !email || !phone || !city) {
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
      <div style="background:linear-gradient(135deg,#6a9a04,#8bc34a);padding:28px 24px;text-align:center;">
        <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">🌿 Greenland</h1>
        <p style="color:rgba(255,255,255,0.85);font-size:12px;margin:6px 0 0;letter-spacing:1px;text-transform:uppercase;">Solicitud de Distribución</p>
      </div>

      <!-- Content -->
      <div style="padding:28px 24px;">
        <h2 style="color:#1e293b;font-size:18px;margin:0 0 6px;font-weight:700;">Nueva solicitud de distribución</h2>
        <p style="color:#64748b;font-size:14px;margin:0 0 20px;">Un interesado quiere ser distribuidor Greenland.</p>

        <div style="margin-bottom:16px;">
          <div style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;display:block;margin-bottom:4px;">Empresa</span>
            <span style="font-size:16px;color:#1e293b;font-weight:800;">${company}</span>
          </div>
          <div style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;display:block;margin-bottom:4px;">Correo Electrónico</span>
            <span style="font-size:14px;color:#1e293b;font-weight:600;">${email}</span>
          </div>
          <div style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;display:block;margin-bottom:4px;">Teléfono</span>
            <span style="font-size:14px;color:#1e293b;font-weight:600;">${phone}</span>
          </div>
          <div style="padding:12px 0;">
            <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;display:block;margin-bottom:4px;">Ciudad / Estado</span>
            <span style="font-size:14px;color:#1e293b;font-weight:600;">${city}</span>
          </div>
        </div>

        <div style="text-align:center;margin:24px 0;">
          <a href="mailto:${email}" style="display:inline-block;background:#6a9a04;color:#fff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:12px;text-decoration:none;">
            Responder al Interesado
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">Greenland Products — greenland-products.com.mx</p>
      </div>
    </div>
  </div>
</body>
</html>`;

        const { data, error } = await getResend().emails.send({
            from: FROM_EMAIL,
            to: [ADMIN_EMAIL],
            replyTo: email,
            subject: `🤝 Solicitud de Distribución — ${company} (${city})`,
            html,
        });

        if (error) {
            console.error('Resend error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: data?.id });
    } catch (error) {
        console.error('Distributor application API error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

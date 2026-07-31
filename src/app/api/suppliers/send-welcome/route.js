import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function buildSupplierWelcomeEmail({ companyName, contactName, portalUrl, email, tempPassword }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#1a365d,#2563eb);padding:32px 24px;text-align:center;">
        <h1 style="color:#fff;font-size:24px;margin:0;font-weight:800;">🚛 Portal de Proveedores</h1>
        <p style="color:rgba(255,255,255,0.9);font-size:13px;margin:10px 0 0;line-height:1.5;">Bienvenido al<br/><strong>Portal de Proveedores de Greenland Products</strong></p>
      </div>
      <div style="padding:28px 24px;">
        <div style="background:#eff6ff;border-radius:12px;padding:16px;margin-bottom:20px;border:1px solid #bfdbfe;">
          <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.6;">Estimado equipo de ${contactName || companyName},<br/><br/><strong>Greenland Products S.A. de C.V.</strong> le ha dado acceso al Portal de Proveedores donde podrá:<br/><br/>
          ✅ Consultar sus órdenes de servicio<br/>
          📄 Subir facturas (PDF y XML)<br/>
          📋 Cargar documentos de materialidad (Carta Porte, Pedimentos, Citas de Carga)<br/>
          💬 Comunicarse directamente con el equipo administrativo<br/>
          💰 Dar seguimiento al estado de pago de sus facturas</p>
        </div>
        <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:20px;border:1px solid #e2e8f0;">
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Datos de Acceso</p>
          <table style="width:100%;margin-top:12px;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                <span style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Usuario (email)</span><br/>
                <span style="font-size:15px;color:#1e293b;font-weight:700;">${email}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                <span style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Contraseña Temporal</span><br/>
                <span style="font-size:15px;color:#1e293b;font-weight:700;font-family:monospace;letter-spacing:1px;">${tempPassword}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;">
                <span style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Portal</span><br/>
                <a href="${portalUrl}" style="font-size:14px;color:#2563eb;font-weight:600;text-decoration:none;">${portalUrl}</a>
              </td>
            </tr>
          </table>
        </div>
        <div style="background:#fef3c7;border-radius:12px;padding:12px 16px;margin-bottom:20px;border:1px solid #fbbf24;">
          <p style="margin:0;font-size:12px;color:#92400e;font-weight:600;">⚠️ Por seguridad, le recomendamos cambiar su contraseña después de ingresar por primera vez.</p>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${portalUrl}" style="display:inline-block;background:#1a365d;color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;">Acceder al Portal</a>
        </div>
        <p style="font-size:12px;color:#94a3b8;text-align:center;margin:20px 0 0;line-height:1.5;">Este correo fue generado automáticamente por la Plataforma de Greenland Products.<br/>Si tiene alguna duda, responda directamente a este correo.</p>
      </div>
      <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">Greenland Products S.A. de C.V. — greenland-products.com.mx</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { supplier_id } = await request.json();
    if (!supplier_id) return NextResponse.json({ error: 'supplier_id requerido' }, { status: 400 });

    // Get supplier info
    const { data: supplier } = await supabaseAdmin.from('suppliers').select('*').eq('id', supplier_id).single();
    if (!supplier) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
    if (!supplier.user_id) return NextResponse.json({ error: 'Proveedor no tiene cuenta de usuario' }, { status: 400 });

    // Generate a new temporary password and update the user
    const tempPassword = 'GL-' + crypto.randomUUID().slice(0, 8).toUpperCase();
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(supplier.user_id, {
      password: tempPassword,
    });
    if (updateErr) return NextResponse.json({ error: 'Error actualizando contraseña: ' + updateErr.message }, { status: 500 });

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://greenland-products.com.mx'}/portal-proveedores`;

    // Build and send email
    const html = buildSupplierWelcomeEmail({
      companyName: supplier.company_name,
      contactName: supplier.contact_name,
      email: supplier.email,
      tempPassword,
      portalUrl,
    });

    const { error: emailError } = await resend.emails.send({
      from: 'Greenland Products <portal@greenland-products.com.mx>',
      to: supplier.email,
      subject: `🚛 Bienvenido al Portal de Proveedores — ${supplier.company_name}`,
      html,
    });

    if (emailError) return NextResponse.json({ error: 'Error enviando email: ' + emailError.message }, { status: 500 });

    return NextResponse.json({ success: true, message: 'Email de bienvenida enviado a ' + supplier.email });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno: ' + err.message }, { status: 500 });
  }
}

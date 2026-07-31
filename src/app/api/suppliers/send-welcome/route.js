import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function buildSupplierWelcomeEmail({ companyName, contactName, portalUrl, resetLink, email }) {
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
          💰 Dar seguimiento al estado de pago de sus facturas<br/><br/>
          <strong>Su usuario de acceso es:</strong> ${email}<br/><br/>
          Para comenzar, establezca su contraseña haciendo clic en el botón de abajo.</p>
        </div>
        <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:20px;border:1px solid #e2e8f0;">
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Empresa</p>
          <p style="margin:0;font-size:20px;color:#1e293b;font-weight:800;">${companyName}</p>
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#94a3b8;font-weight:700;">PORTAL DE ACCESO</p>
            <p style="margin:4px 0 0;font-size:13px;color:#2563eb;font-weight:600;">${portalUrl}</p>
          </div>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${resetLink}" style="display:inline-block;background:#1a365d;color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;">Establecer Contraseña y Acceder</a>
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

    // Generate password reset link
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://greenland-products.com.mx'}/portal-proveedores`;
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: supplier.email,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://greenland-products.com.mx'}/auth/callback?next=/auth/update-password` }
    });

    if (linkError) return NextResponse.json({ error: 'Error generando link: ' + linkError.message }, { status: 500 });

    const resetLink = linkData?.properties?.action_link || portalUrl;

    // Build and send email
    const html = buildSupplierWelcomeEmail({
      companyName: supplier.company_name,
      contactName: supplier.contact_name,
      email: supplier.email,
      portalUrl,
      resetLink,
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

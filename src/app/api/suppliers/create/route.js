import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const body = await request.json();
    const { company_name, contact_name, email, phone, rfc, address, service_types, notes } = body;

    if (!company_name || !email) {
      return NextResponse.json({ error: 'Nombre de empresa y email son requeridos.' }, { status: 400 });
    }

    // 1. Create Supabase Auth user with auto-generated password
    const tempPassword = crypto.randomUUID().slice(0, 12) + 'Aa1!';
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: contact_name || company_name, role: 'supplier' }
    });

    if (authError) {
      return NextResponse.json({ error: 'Error al crear cuenta: ' + authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Update profiles table to set role = supplier
    await supabaseAdmin
      .from('profiles')
      .update({ role: 'supplier', full_name: contact_name || company_name, is_active: true })
      .eq('id', userId);

    // 3. Create supplier record
    const { data: supplier, error: supplierError } = await supabaseAdmin
      .from('suppliers')
      .insert({
        user_id: userId,
        company_name,
        contact_name,
        email,
        phone,
        rfc,
        address,
        service_types: service_types || [],
        notes,
        is_active: true
      })
      .select()
      .single();

    if (supplierError) {
      return NextResponse.json({ error: 'Error al crear proveedor: ' + supplierError.message }, { status: 400 });
    }

    // Email NOT sent automatically — admin will send welcome email manually when ready
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://greenland-products.com.mx'}/portal-proveedores`;

    return NextResponse.json({
      success: true,
      supplier,
      portalUrl,
      emailSent: false,
      message: 'Proveedor creado. Envía el link de acceso al portal cuando estés listo.'
    });

  } catch (err) {
    return NextResponse.json({ error: 'Error interno: ' + err.message }, { status: 500 });
  }
}

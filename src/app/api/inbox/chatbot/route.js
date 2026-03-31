// ============================================================
// Greenland Chatbot — Bot Engine API
// POST /api/inbox/chatbot
// Receives a conversation_id + message, calls Gemini, responds via WhatsApp
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GREENLAND_KNOWLEDGE, PRODUCT_CATALOG } from '@/lib/chatbot-knowledge';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

// Send WhatsApp message via Meta API
async function sendWhatsAppMessage(phoneNumber, text) {
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  
  if (!accessToken || !phoneNumberId) {
    console.error('Missing META_WHATSAPP env vars');
    return false;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'text',
          text: { body: text },
        }),
      }
    );
    
    if (!res.ok) {
      const errText = await res.text();
      console.error('WhatsApp send error:', errText);
      return false;
    }
    return true;
  } catch (err) {
    console.error('WhatsApp send exception:', err);
    return false;
  }
}

// 📧 Send email notification to admins when bot transfers to human
async function sendTransferNotification(contactName, contactPhone, reason, conversationId) {
  const resendKey = process.env.RESEND_API_KEY;
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
  
  if (!resendKey || adminEmails.length === 0) {
    console.warn('[Chatbot] No Resend key or admin emails for notification');
    return;
  }

  const portalUrl = `https://greenland-products.com.mx/dashboard/inbox?conv=${conversationId}`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Greenland Bot <no-reply@greenland-products.com.mx>',
        to: adminEmails,
        subject: `🤖→👤 Transferencia a humano — ${contactName || 'Cliente'}`,
        html: `
          <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <div style="background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 16px; padding: 24px; color: white; margin-bottom: 16px;">
              <h2 style="margin: 0 0 4px; font-size: 18px;">🤖→👤 Transferencia a Humano</h2>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">El chatbot necesita asistencia humana</p>
            </div>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Cliente</p>
              <p style="margin: 0; font-size: 16px; font-weight: 700; color: #1e293b;">${contactName || 'Sin nombre'}</p>
              ${contactPhone ? `<p style="margin: 4px 0 0; font-size: 13px; color: #475569;">📱 ${contactPhone}</p>` : ''}
            </div>
            
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Razón</p>
              <p style="margin: 0; font-size: 14px; color: #78350f;">${reason}</p>
            </div>
            
            <a href="${portalUrl}" style="display: block; text-align: center; background: #6a9a04; color: white; text-decoration: none; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 14px;">
              💬 Ver conversación en portal
            </a>
            
            <p style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 16px;">
              Greenland Products — Chatbot AI
            </p>
          </div>
        `,
      }),
    });
    console.log(`[Chatbot] 📧 Transfer notification sent to ${adminEmails.join(', ')}`);
  } catch (err) {
    console.error('[Chatbot] Email notification error:', err);
  }
}

// Create checkout link via Supabase
async function createCheckoutLink(conversationId, items) {
  try {
    // Build items with product info from catalog
    const orderItems = [];
    for (const item of items) {
      const product = PRODUCT_CATALOG.find(
        p => p.sku.toLowerCase() === item.sku?.toLowerCase() ||
             p.name.toLowerCase().includes(item.name?.toLowerCase() || '')
      );
      
      if (!product) continue;
      
      // Get product details from DB
      const { data: prod } = await supabaseAdmin
        .from('products')
        .select('id, name, sku, price')
        .eq('sku', product.sku)
        .single();
      
      if (!prod) continue;
      
      orderItems.push({
        product_id: prod.id,
        sku: prod.sku,
        name: prod.name,
        quantity: item.quantity || 1,
        sale_price: prod.price,
      });
    }

    if (orderItems.length === 0) {
      return { success: false, error: 'No valid products found' };
    }

    // Create checkout token directly
    const token = [...Array(16)].map(() => Math.random().toString(36)[2]).join('');
    const orderNumber = `LM-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${token.slice(0, 4).toUpperCase()}`;
    
    const subtotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.sale_price), 0);

    const { data, error } = await supabaseAdmin
      .from('lastmile_orders')
      .insert({
        conversation_id: conversationId,
        checkout_token: token,
        order_number: orderNumber,
        delivery_type: 'delivery',
        items: orderItems,
        subtotal: subtotal,
        total: subtotal,
        notes: 'Venta generada por chatbot AI',
        status: 'pending',
      })
      .select('id, checkout_token, order_number, total')
      .single();

    if (error) {
      console.error('Checkout create error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      checkout_url: `https://greenland-products.com.mx/entrega/${data.checkout_token}`,
      order_number: data.order_number,
      total: data.total,
    };
  } catch (err) {
    console.error('createCheckoutLink exception:', err);
    return { success: false, error: err.message };
  }
}

export async function POST(request) {
  try {
    const { conversation_id, message, phone_number } = await request.json();
    
    if (!conversation_id || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Get conversation history (last 15 messages)
    const { data: messages } = await supabaseAdmin
      .from('inbox_messages')
      .select('direction, content, created_at')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: false })
      .limit(15);

    const history = (messages || []).reverse().map(m => ({
      role: m.direction === 'inbound' ? 'user' : 'model',
      parts: [{ text: m.content || '' }],
    })).filter(m => m.parts[0].text);

    // Setup Gemini with function calling
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: GREENLAND_KNOWLEDGE + `

## FUNCIONES DISPONIBLES
Tienes acceso a las siguientes funciones:
- **create_checkout_link**: Úsala cuando el cliente confirme que quiere comprar. Necesitas los SKUs y cantidades.
- **transfer_to_human**: Úsala cuando el cliente tenga un problema, queja, pida hablar con alguien, o muestre interés en ser distribuidor.

## CONTEXTO ACTUAL
- Estás respondiendo mensajes por WhatsApp
- La fecha actual es: ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Si el cliente quiere comprar, confirma los productos y cantidades antes de generar el link
- Si el cliente quiere ser distribuidor, dale info general y transfiere a humano
`,
      tools: [{
        functionDeclarations: [
          {
            name: 'create_checkout_link',
            description: 'Genera un link de checkout para que el cliente llene sus datos de entrega. Usa esto cuando el cliente confirme que quiere comprar productos específicos.',
            parameters: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  description: 'Lista de productos a comprar',
                  items: {
                    type: 'object',
                    properties: {
                      sku: { type: 'string', description: 'SKU del producto (ej: GL01, GL22)' },
                      name: { type: 'string', description: 'Nombre del producto' },
                      quantity: { type: 'integer', description: 'Cantidad a comprar' },
                    },
                    required: ['sku', 'quantity'],
                  },
                },
              },
              required: ['items'],
            },
          },
          {
            name: 'transfer_to_human',
            description: 'Transfiere la conversación a un agente humano. Usa esto cuando: (1) el cliente tenga un reclamo o problema, (2) pida hablar con una persona, (3) muestre interés en ser distribuidor/mayorista, (4) haga preguntas que no puedes responder.',
            parameters: {
              type: 'object',
              properties: {
                reason: { type: 'string', description: 'Razón por la que se transfiere (para contexto del agente)' },
              },
              required: ['reason'],
            },
          },
        ],
      }],
    });

    // Start chat
    const chat = model.startChat({ history });
    let result = await chat.sendMessage(message);
    let response = result.response;
    let botReply = '';

    // Handle function calls
    let functionCall = response.functionCalls()?.[0];
    
    if (functionCall) {
      let functionResult;
      
      if (functionCall.name === 'create_checkout_link') {
        const checkoutResult = await createCheckoutLink(conversation_id, functionCall.args.items);
        
        if (checkoutResult.success) {
          functionResult = {
            success: true,
            message: `Link generado exitosamente. URL: ${checkoutResult.checkout_url} — Orden: ${checkoutResult.order_number} — Total: $${checkoutResult.total?.toLocaleString('es-MX')} MXN`,
          };
        } else {
          functionResult = { success: false, error: checkoutResult.error };
        }
      } else if (functionCall.name === 'transfer_to_human') {
        // Deactivate bot for this conversation
        await supabaseAdmin
          .from('inbox_conversations')
          .update({ chatbot_active: false })
          .eq('id', conversation_id);

        // Get contact info for notification
        const { data: conv } = await supabaseAdmin
          .from('inbox_conversations')
          .select('contact_id')
          .eq('id', conversation_id)
          .single();
        
        let contactName = 'Cliente';
        let contactPhone = phone_number || '';
        if (conv?.contact_id) {
          const { data: contact } = await supabaseAdmin
            .from('inbox_contacts')
            .select('display_name, phone')
            .eq('id', conv.contact_id)
            .single();
          contactName = contact?.display_name || 'Cliente';
          contactPhone = contact?.phone || phone_number || '';
        }

        // 📧 Send email notification to admins
        await sendTransferNotification(contactName, contactPhone, functionCall.args.reason, conversation_id);
        
        functionResult = {
          success: true,
          message: `Conversación transferida a un agente humano. Razón: ${functionCall.args.reason}`,
        };
      }

      // Send function result back to get final response
      result = await chat.sendMessage([{
        functionResponse: {
          name: functionCall.name,
          response: functionResult,
        },
      }]);
      response = result.response;
    }

    botReply = response.text();

    if (!botReply) {
      botReply = 'Disculpa, no pude procesar tu mensaje. ¿Podrías repetirlo?';
    }

    // Send via WhatsApp
    if (phone_number) {
      await sendWhatsAppMessage(phone_number, botReply);
    }

    // Save bot response as outbound message
    await supabaseAdmin.from('inbox_messages').insert({
      conversation_id,
      direction: 'outbound',
      content: botReply,
      content_type: 'text',
      status: 'sent',
      metadata: { sent_by: 'chatbot' },
    });

    // Update conversation last_message
    await supabaseAdmin
      .from('inbox_conversations')
      .update({
        last_message_preview: botReply?.substring(0, 100),
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversation_id);

    return NextResponse.json({ success: true, reply: botReply });

  } catch (err) {
    console.error('Chatbot error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

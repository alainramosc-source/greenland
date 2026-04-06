// ============================================================
// Greenland Chatbot — Core Engine (shared module)
// Called directly from webhook — no separate HTTP call needed
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GREENLAND_KNOWLEDGE, PRODUCT_CATALOG } from '@/lib/chatbot-knowledge';

let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return _supabase;
}

let _genAI = null;
function getGenAI() {
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
  }
  return _genAI;
}

// Send WhatsApp message via Meta API
async function sendWhatsAppMessage(phoneNumber, text) {
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) return false;

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
      console.error('[Bot] WhatsApp send error:', await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Bot] WhatsApp exception:', err);
    return false;
  }
}

async function sendMessengerMessage(recipientId, text, accessToken, pageId) {
  if (!recipientId || !accessToken) {
    console.error(`[Bot] Messenger: missing params — recipientId=${!!recipientId}, token=${!!accessToken}, pageId=${pageId}`);
    return false;
  }
  try {
    // Use Page ID instead of 'me' — /me doesn't resolve correctly with all token types
    const endpoint = pageId
      ? `https://graph.facebook.com/v21.0/${pageId}/messages?access_token=${accessToken}`
      : `https://graph.facebook.com/v21.0/me/messages?access_token=${accessToken}`;
    console.log(`[Bot] Messenger: sending to ${recipientId} via page ${pageId || 'me'}, token length=${accessToken?.length}`);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    });
    const responseText = await res.text();
    if (!res.ok) {
      console.error(`[Bot] Messenger send error (${res.status}):`, responseText);
      return false;
    }
    console.log(`[Bot] Messenger: sent OK —`, responseText);
    return true;
  } catch (err) {
    console.error('[Bot] Messenger exception:', err);
    return false;
  }
}

async function sendInstagramMessage(recipientId, text, accessToken, accountId) {
  if (!recipientId || !accessToken || !accountId) return false;
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${accountId}/messages?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
        }),
      }
    );
    if (!res.ok) {
      console.error('[Bot] Instagram send error:', await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Bot] Instagram exception:', err);
    return false;
  }
}

// Route bot reply to the correct platform based on conversation's channel
async function sendBotReply(conversationId, recipientId, text) {
  const supabase = getSupabase();
  const { data: conv } = await supabase
    .from('inbox_conversations')
    .select('channel_id, contact_id, inbox_channels(platform, access_token, platform_account_id), inbox_contacts(platform_user_id, phone)')
    .eq('id', conversationId)
    .single();

  if (!conv?.inbox_channels) {
    console.warn('[Bot] No channel found for conversation', conversationId);
    return false;
  }

  const platform = conv.inbox_channels.platform;
  const contactId = conv.inbox_contacts?.platform_user_id || recipientId;
  const channelToken = conv.inbox_channels.access_token;

  console.log(`[Bot] Sending reply via ${platform} to ${contactId}`);

  switch (platform) {
    case 'whatsapp':
      return sendWhatsAppMessage(conv.inbox_contacts?.phone || contactId, text);
    case 'messenger':
      return sendMessengerMessage(contactId, text, channelToken, conv.inbox_channels.platform_account_id);
    case 'instagram': {
      // Instagram Send API uses the Facebook Page endpoint + Page token (same as Messenger)
      const { data: messengerChannel } = await supabase
        .from('inbox_channels')
        .select('access_token, platform_account_id')
        .eq('platform', 'messenger')
        .eq('is_active', true)
        .single();

      if (!messengerChannel) {
        console.error('[Bot] No messenger channel found for Instagram send — needed for Page token');
        return false;
      }

      const pageId = messengerChannel.platform_account_id;
      const pageToken = messengerChannel.access_token;
      console.log(`[Bot] Instagram: using Page ID ${pageId} for send`);
      return sendInstagramMessage(contactId, text, pageToken, pageId);
    }
    default:
      console.warn('[Bot] Unknown platform:', platform);
      return false;
  }
}

// 📧 Send email notification to admins when bot transfers to human
async function sendTransferNotification(contactName, contactPhone, reason, conversationId) {
  const resendKey = process.env.RESEND_API_KEY;
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
  const adminPhones = (process.env.ADMIN_PHONES || '').split(',').map(p => p.trim()).filter(Boolean);

  const portalUrl = `https://greenland-products.com.mx/dashboard/inbox?conv=${conversationId}`;

  // 📧 Email notification
  if (resendKey && adminEmails.length > 0) {
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
                <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase;">Cliente</p>
                <p style="margin: 0; font-size: 16px; font-weight: 700; color: #1e293b;">${contactName || 'Sin nombre'}</p>
                ${contactPhone ? `<p style="margin: 4px 0 0; font-size: 13px; color: #475569;">📱 ${contactPhone}</p>` : ''}
              </div>
              <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                <p style="margin: 0 0 8px; font-size: 12px; color: #92400e; font-weight: 700; text-transform: uppercase;">Razón</p>
                <p style="margin: 0; font-size: 14px; color: #78350f;">${reason}</p>
              </div>
              <a href="${portalUrl}" style="display: block; text-align: center; background: #6a9a04; color: white; text-decoration: none; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 14px;">💬 Ver conversación en portal</a>
              <p style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 16px;">Greenland Products — Chatbot AI</p>
            </div>
          `,
        }),
      });
      console.log(`[Bot] 📧 Transfer notification sent to ${adminEmails.join(', ')}`);
    } catch (err) {
      console.error('[Bot] Email notification error:', err);
    }
  }

  // 📱 WhatsApp notification to admin phones
  for (const phone of adminPhones) {
    try {
      await sendWhatsAppMessage(phone,
        `🤖→👤 *Transferencia a humano*\n\n👤 Cliente: ${contactName || 'Sin nombre'}\n${contactPhone ? `📱 Tel: ${contactPhone}\n` : ''}📝 Razón: ${reason}\n\n👉 Ver en portal:\n${portalUrl}`
      );
      console.log(`[Bot] 📱 WhatsApp notification sent to ${phone}`);
    } catch (err) {
      console.error(`[Bot] WhatsApp notification error to ${phone}:`, err);
    }
  }
}

/**
 * Create checkout link — queries products and creates a lastmile_order
 */
async function createCheckoutLink(supabase, conversationId, items) {
  try {
    const orderItems = [];
    for (const item of items) {
      const product = PRODUCT_CATALOG.find(
        p => p.sku.toLowerCase() === item.sku?.toLowerCase() ||
             p.name.toLowerCase().includes(item.name?.toLowerCase() || '')
      );
      if (!product) continue;

      const { data: prod } = await supabase
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
      return { success: false, error: 'No se encontraron productos válidos' };
    }

    const token = [...Array(16)].map(() => Math.random().toString(36)[2]).join('');
    const orderNumber = `LM-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${token.slice(0, 4).toUpperCase()}`;
    const subtotal = orderItems.reduce((sum, i) => sum + (i.quantity * i.sale_price), 0);

    const { data, error } = await supabase
      .from('lastmile_orders')
      .insert({
        conversation_id: conversationId,
        checkout_token: token,
        order_number: orderNumber,
        delivery_type: 'delivery',
        items: orderItems,
        subtotal, total: subtotal,
        notes: 'Venta generada por chatbot AI',
        status: 'pending',
      })
      .select('id, checkout_token, order_number, total')
      .single();

    if (error) {
      console.error('[Bot] Checkout error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      checkout_url: `https://www.greenland-products.com.mx/entrega/${data.checkout_token}`,
      order_number: data.order_number,
      total: data.total,
    };
  } catch (err) {
    console.error('[Bot] Checkout exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Process a bot message — called directly from webhook
 * @param {string} conversationId
 * @param {string} message - inbound message text
 * @param {string} phoneNumber - customer phone number
 * @returns {Promise<{success: boolean, reply?: string, error?: string}>}
 */
export async function processBotMessage(conversationId, message, phoneNumber) {
  const supabase = getSupabase();
  const genAI = getGenAI();

  try {
    // Get conversation history (last 10 messages for speed)
    const { data: msgs } = await supabase
      .from('inbox_messages')
      .select('direction, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    const history = (msgs || []).reverse().map(m => ({
      role: m.direction === 'inbound' ? 'user' : 'model',
      parts: [{ text: m.content || '' }],
    })).filter(m => m.parts[0].text);

    // Check if within business hours (9am-6pm Mexico City time)
    const now = new Date();
    const mxTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    const hour = mxTime.getHours();
    const isBusinessHours = hour >= 9 && hour < 18;
    const dayName = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][mxTime.getDay()];
    const isWeekend = mxTime.getDay() === 0 || mxTime.getDay() === 6;

    // Setup Gemini
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        thinkingConfig: { thinkingBudget: 0 },
      },
      systemInstruction: GREENLAND_KNOWLEDGE + `

## FUNCIONES DISPONIBLES
- **create_checkout_link**: Cuando el cliente confirme que quiere comprar productos específicos con cantidades.
- **transfer_to_human**: Cuando el cliente pida hablar con una persona real, quiera cotización detallada, o quiera ser distribuidor.

## REGLAS CRÍTICAS
- Cuando el cliente pida hablar con un humano, SIEMPRE usa la función transfer_to_human SIN IMPORTAR LA HORA. No intentes manejar la transferencia tú solo con un mensaje — DEBES llamar la función para que llegue la notificación al equipo.
- Si es fuera de horario, PRIMERO llama transfer_to_human Y en tu respuesta menciona que el horario es de 9am a 6pm y que un asesor dará seguimiento a primera hora.
- Si no sabes algo, di "No tengo esa información exacta, pero puedo poner a un asesor contigo si quieres."
- Mantén respuestas cortas (máximo 3-4 líneas).
- Responde siempre en español.

## HORARIO DE ATENCIÓN
- Nuestro horario de atención con asesores humanos es de **lunes a viernes de 9:00 AM a 6:00 PM** (hora centro de México).
- Ahora mismo es ${dayName} y son las ${mxTime.getHours()}:${String(mxTime.getMinutes()).padStart(2, '0')}.
- ${isBusinessHours && !isWeekend ? 'ESTAMOS EN HORARIO DE ATENCIÓN.' : 'ESTAMOS FUERA DE HORARIO.'}
- El bot SIEMPRE responde, sin importar la hora. Solo menciona el horario cuando el cliente pida hablar con un humano fuera de horario.

## CONTEXTO
- Canal: Mensajería (WhatsApp, Messenger o Instagram)
- Fecha: ${now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
`,
      tools: [{
        functionDeclarations: [
          {
            name: 'create_checkout_link',
            description: 'Genera un link de checkout para comprar productos.',
            parameters: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  description: 'Productos a comprar',
                  items: {
                    type: 'object',
                    properties: {
                      sku: { type: 'string' },
                      name: { type: 'string' },
                      quantity: { type: 'integer' },
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
            description: 'Transfiere a un humano. SOLO cuando el cliente lo pida explícitamente.',
            parameters: {
              type: 'object',
              properties: {
                reason: { type: 'string' },
              },
              required: ['reason'],
            },
          },
        ],
      }],
    });

    // Chat with Gemini — with timeout protection
    const chat = model.startChat({ history });
    let botReply = '';

    try {
      // Race between Gemini response and 15s timeout
      const geminiPromise = chat.sendMessage(message);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 15000)
      );

      let result = await Promise.race([geminiPromise, timeoutPromise]);
      let response = result.response;

      // Handle function calls
      const functionCall = response.functionCalls()?.[0];

      if (functionCall) {
        let functionResult;

        if (functionCall.name === 'transfer_to_human') {
          await supabase
            .from('inbox_conversations')
            .update({ chatbot_active: false })
            .eq('id', conversationId);

          // Get contact info for notification
          const { data: conv } = await supabase
            .from('inbox_conversations')
            .select('contact_id')
            .eq('id', conversationId)
            .single();
          let contactName = null;
          let contactPhone = phoneNumber;
          if (conv?.contact_id) {
            const { data: contact } = await supabase
              .from('inbox_contacts')
              .select('name, phone')
              .eq('id', conv.contact_id)
              .single();
            contactName = contact?.name;
            contactPhone = contactPhone || contact?.phone;
          }

          // Send email + WhatsApp notification to admins
          await sendTransferNotification(
            contactName, contactPhone, functionCall.args.reason, conversationId
          );

          functionResult = {
            success: true,
            message: `Conversación transferida. Razón: ${functionCall.args.reason}`,
          };
        } else if (functionCall.name === 'create_checkout_link') {
          const checkoutResult = await createCheckoutLink(supabase, conversationId, functionCall.args.items);
          if (checkoutResult.success) {
            functionResult = {
              success: true,
              message: `Link generado: ${checkoutResult.checkout_url} — Orden: ${checkoutResult.order_number} — Total: $${checkoutResult.total?.toLocaleString('es-MX')} MXN`,
            };
          } else {
            functionResult = { success: false, error: checkoutResult.error };
          }
        }

        result = await chat.sendMessage([{
          functionResponse: {
            name: functionCall.name,
            response: functionResult,
          },
        }]);
        response = result.response;
      }

      botReply = response.text() || 'Disculpa, ¿podrías repetirlo?';
    } catch (geminiErr) {
      // Fallback message if Gemini times out or fails
      console.error('[Bot] Gemini error:', geminiErr.message);
      botReply = '¡Hola! Disculpa la demora 😊 ¿En qué puedo ayudarte? Puedo darte información sobre nuestros productos o ponerte en contacto con un asesor.';
    }

    // Send reply via the correct platform + save to DB in parallel
    await Promise.all([
      sendBotReply(conversationId, phoneNumber, botReply),
      supabase.from('inbox_messages').insert({
        conversation_id: conversationId,
        direction: 'outbound',
        content: botReply,
        content_type: 'text',
        status: 'sent',
        metadata: { sent_by: 'chatbot' },
      }),
      supabase.from('inbox_conversations').update({
        last_message_preview: botReply.substring(0, 100),
        last_message_at: new Date().toISOString(),
        bot_last_replied_at: new Date().toISOString(),
        bot_followup_count: 0, // Reset followup counter on new bot reply
        chatbot_active: true,
      }).eq('id', conversationId),
    ]);

    console.log(`[Bot] ✅ Replied to ${conversationId}`);
    return { success: true, reply: botReply };

  } catch (err) {
    console.error('[Bot] Error:', err.message);
    return { success: false, error: err.message };
  }
}

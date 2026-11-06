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

  // Convert Markdown **bold** to WhatsApp *bold*
  const formattedText = String(text || '').replace(/\*\*(.+?)\*\*/g, '*$1*');

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
          text: { body: formattedText },
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

async function sendWhatsAppImage(phoneNumber, imageUrl, caption) {
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
          type: 'image',
          image: {
            link: imageUrl,
            ...(caption ? { caption } : {}),
          },
        }),
      }
    );
    if (!res.ok) {
      console.error('[Bot] WhatsApp image send error:', await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Bot] WhatsApp image exception:', err);
    return false;
  }
}

async function sendMessengerImage(recipientId, imageUrl, caption, accessToken, pageId) {
  if (!recipientId || !accessToken) return false;
  try {
    const endpoint = pageId
      ? `https://graph.facebook.com/v21.0/${pageId}/messages?access_token=${accessToken}`
      : `https://graph.facebook.com/v21.0/me/messages?access_token=${accessToken}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'image',
            payload: { url: imageUrl, is_reusable: true },
          },
        },
      }),
    });
    if (!res.ok) {
      console.error('[Bot] Messenger image send error:', await res.text());
      return false;
    }
    if (caption) {
      await sendMessengerMessage(recipientId, caption, accessToken, pageId);
    }
    return true;
  } catch (err) {
    console.error('[Bot] Messenger image exception:', err);
    return false;
  }
}

async function sendInstagramImage(recipientId, imageUrl, caption, accessToken, accountId) {
  if (!recipientId || !accessToken || !accountId) return false;
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${accountId}/messages?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: {
            attachment: {
              type: 'image',
              payload: { url: imageUrl },
            },
          },
        }),
      }
    );
    if (!res.ok) {
      console.error('[Bot] Instagram image send error:', await res.text());
      return false;
    }
    if (caption) {
      await sendInstagramMessage(recipientId, caption, accessToken, accountId);
    }
    return true;
  } catch (err) {
    console.error('[Bot] Instagram image exception:', err);
    return false;
  }
}

async function sendBotImage(conversationId, recipientId, imageUrl, caption) {
  const supabase = getSupabase();
  const { data: conv } = await supabase
    .from('inbox_conversations')
    .select('channel_id, contact_id, inbox_channels(platform, access_token, platform_account_id), inbox_contacts(platform_user_id, phone)')
    .eq('id', conversationId)
    .single();

  if (!conv?.inbox_channels) return false;

  const platform = conv.inbox_channels.platform;
  const contactId = conv.inbox_contacts?.platform_user_id || recipientId;
  const channelToken = conv.inbox_channels.access_token;

  switch (platform) {
    case 'whatsapp':
      return sendWhatsAppImage(conv.inbox_contacts?.phone || contactId, imageUrl, caption);
    case 'messenger':
      return sendMessengerImage(contactId, imageUrl, caption, channelToken, conv.inbox_channels.platform_account_id);
    case 'instagram': {
      const { data: messengerChannel } = await supabase
        .from('inbox_channels')
        .select('access_token, platform_account_id')
        .eq('platform', 'messenger')
        .eq('is_active', true)
        .single();
      if (!messengerChannel) return false;
      return sendInstagramImage(contactId, imageUrl, caption, messengerChannel.access_token, messengerChannel.platform_account_id);
    }
    default:
      return false;
  }
}

async function sendWhatsAppLocation(phoneNumber, latitude, longitude, name, address) {
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
          type: 'location',
          location: {
            latitude: String(latitude),
            longitude: String(longitude),
            name,
            address,
          },
        }),
      }
    );
    if (!res.ok) {
      console.error('[Bot] WhatsApp location send error:', await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Bot] WhatsApp location exception:', err);
    return false;
  }
}

async function sendWarehouseLocation(conversationId, recipientId) {
  const supabase = getSupabase();
  const { data: conv } = await supabase
    .from('inbox_conversations')
    .select('channel_id, contact_id, inbox_channels(platform, access_token, platform_account_id), inbox_contacts(platform_user_id, phone)')
    .eq('id', conversationId)
    .single();

  if (!conv?.inbox_channels) return false;

  const platform = conv.inbox_channels.platform;
  const contactId = conv.inbox_contacts?.platform_user_id || recipientId;
  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=25.46616,-100.99599';

  if (platform === 'whatsapp') {
    return sendWhatsAppLocation(
      conv.inbox_contacts?.phone || contactId,
      25.46616,
      -100.99599,
      'Greenland Products — Bodega Saltillo',
      'Blvd. Vito Alessio Robles 3350, Int. 9, Col. Nazario Ortiz, C.P. 25100, Saltillo, Coahuila'
    );
  }
  return sendBotReply(conversationId, recipientId, `📍 Ubicación GPS en Google Maps:\n${mapsUrl}`);
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
    const decoCategories = new Set(['lambrin', 'wall_cladding', 'marmol_pvc', 'piedra_flexible', 'bodega', 'tarima']);
    const orderItems = [];
    for (const item of items) {
      const product = PRODUCT_CATALOG.find(
        p => p.sku.toLowerCase() === item.sku?.toLowerCase() ||
             p.name.toLowerCase().includes(item.name?.toLowerCase() || '')
      );
      if (!product) continue;

      if (decoCategories.has(product.category)) {
        return {
          success: false,
          error: 'Los revestimientos de la línea Deco NO cuentan con envío a domicilio. Se entregan únicamente en nuestra bodega en Saltillo: Blvd. Vito Alessio Robles 3350, Int. 9, Col. Nazario Ortiz, C.P. 25100, Saltillo, Coahuila.',
        };
      }

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
    // 1) Snapshot latest inbound message ID right now, then debounce 1.8s in case user sends a 2nd message immediately (e.g. "?")
    const { data: initialInbound } = await supabase
      .from('inbox_messages')
      .select('id, created_at')
      .eq('conversation_id', conversationId)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(1);
    const initialInboundId = initialInbound?.[0]?.id;

    await new Promise(resolve => setTimeout(resolve, 1800));

    // Get conversation history (last 12 messages)
    const { data: msgs } = await supabase
      .from('inbox_messages')
      .select('id, direction, content, content_type, metadata, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(12);

    // If a newer inbound message arrived during our 1.8s debounce window, skip this run so only the latest webhook responds once
    const latestInbound = (msgs || []).find(m => m.direction === 'inbound');
    if (initialInboundId && latestInbound && latestInbound.id !== initialInboundId) {
      console.log(`[Bot] ⏭️ Skipping stale burst message ("${message}") — newer inbound message (${latestInbound.id}) will handle the reply.`);
      return { success: true, skipped: true };
    }

    const FALLBACK_REPLY = '¡Hola! Disculpa la demora 😊 ¿En qué puedo ayudarte? Puedo darte información sobre nuestros productos o ponerte en contacto con un asesor.';
    const lastOutboundMsg = (msgs || []).find(m => m.direction === 'outbound');
    const lastOutboundWasFallback = lastOutboundMsg?.content === FALLBACK_REPLY;

    // Track which SKUs have already been sent as images in this conversation so we never spam the same photo 2-3 times
    const alreadySentSkus = new Set(
      (msgs || [])
        .filter(m => m.direction === 'outbound' && m.content_type === 'image' && m.metadata?.sku)
        .map(m => String(m.metadata.sku).toUpperCase())
    );

    // Combine consecutive trailing inbound messages (e.g. "¿Dónde se encuentran ubicados en Saltillo?" followed by "?")
    const trailingInbound = [];
    let idx = 0;
    while (idx < (msgs || []).length && msgs[idx].direction === 'inbound') {
      if (msgs[idx].content && msgs[idx].content_type === 'text') {
        trailingInbound.unshift(msgs[idx].content.trim());
      }
      idx++;
    }
    const effectiveMessage = trailingInbound.length > 0 ? trailingInbound.join(' ') : message;
    const priorMsgs = (msgs || []).slice(idx);

    const rawHistory = priorMsgs
      .reverse()
      .filter(m => m.content && m.content !== FALLBACK_REPLY)
      .map(m => ({
        role: m.direction === 'inbound' ? 'user' : 'model',
        parts: [{ text: m.content || '' }],
      }))
      .filter(m => m.parts[0].text);

    // Ensure history starts with 'user' and strictly alternates user/model
    const history = [];
    for (const item of rawHistory) {
      if (history.length === 0) {
        if (item.role === 'user') history.push(item);
      } else if (history[history.length - 1].role === item.role) {
        history[history.length - 1].parts[0].text += '\n' + item.parts[0].text;
      } else {
        history.push(item);
      }
    }

    // Check if within business hours (Mexico City time: L-V 9am-6pm with lunch 1pm-2pm, Sat 10am-2pm)
    const now = new Date();
    const mxTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    const hour = mxTime.getHours();
    const dayOfWeek = mxTime.getDay();
    const dayName = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][dayOfWeek];
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isSaturday = dayOfWeek === 6;
    const isLunchHour = isWeekday && hour === 13;
    const isOpenNow =
      (isWeekday && hour >= 9 && hour < 18 && !isLunchHour) ||
      (isSaturday && hour >= 10 && hour < 14);

    // Query live prices from Supabase so any edits in /dashboard/precios are reflected immediately
    const { data: liveProducts } = await supabase
      .from('products')
      .select('sku, name, price, category')
      .eq('is_active', true)
      .order('sku', { ascending: true });

    const livePricesBlock = (liveProducts && liveProducts.length > 0)
      ? '\n## PRECIOS BASE ACTUALIZADOS EN TIEMPO REAL (PORTAL GREENLAND)\n' +
        liveProducts
          .filter(p => Number(p.price) > 0)
          .map(p => `- **${p.sku}** (${p.name}): **$${Number(p.price).toLocaleString('es-MX')} MXN**`)
          .join('\n')
      : '';

    // Setup Gemini config with automatic multi-model failover (Free Tier has per-model daily quotas)
    const GEMINI_MODELS = [
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.7-flash',
      'gemini-3-flash-preview',
      'gemini-2.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
    ];

    const systemInstructionText = GREENLAND_KNOWLEDGE + livePricesBlock + `

## FUNCIONES DISPONIBLES
- **send_product_photos**: Cuando el cliente pida ver fotos, imágenes, colores o modelos de Lambrín ("lambrin"), Wall Cladding ("wall_cladding"), Mármol PVC ("marmol_pvc"), Piedra Flexible ("piedra_flexible"), la fachada de la bodega en Saltillo ("bodega"), cómo se envían las tarimas foráneas ("tarima"), o productos por SKU.
  - **IMPORTANTE**: Si en la conversación YA enviaste la foto de la bodega (${alreadySentSkus.has('BODEGA') ? 'YA ENVIADA EN ESTE CHAT — NO VOLVER A LLAMAR send_product_photos PARA BODEGA' : 'aún no enviada'}), NO vuelvas a enviarla si el cliente solo agradece o dice que nos visitará después.
- **create_checkout_link**: Cuando el cliente confirme que quiere comprar productos específicos de mobiliario con cantidades.
- **transfer_to_human**: SOLO cuando el cliente pida hablar con una persona real, quiera cotización de mayoreo/envío foráneo o quiera ser distribuidor. NUNCA transfieras a humano cuando el cliente solo dice "gracias" o "los visitaré la próxima semana".

## REGLAS CRÍTICAS
- Siempre que llames a una función (como send_product_photos), escribe también tu respuesta de texto en el mismo mensaje para acompañar la acción.
- Cuando el cliente pida hablar con un humano, SIEMPRE usa la función transfer_to_human SIN IMPORTAR LA HORA. No intentes manejar la transferencia tú solo con un mensaje — DEBES llamar la función para que llegue la notificación al equipo.
- Si es fuera de horario, PRIMERO llama transfer_to_human Y en tu respuesta menciona nuestro horario (Lunes a Viernes de 9:00 AM a 6:00 PM con comida de 1:00 PM a 2:00 PM, y Sábados de 10:00 AM a 2:00 PM) y que un asesor dará seguimiento en cuanto estemos en horario.
- Si no sabes algo, di "No tengo esa información exacta, pero puedo poner a un asesor contigo si quieres."
- Mantén respuestas cortas (máximo 3-4 líneas, salvo que estés compartiendo lista de precios o modelos solicitados).
- Usa un solo asterisco *texto* para negritas (formato WhatsApp), no uses doble asterisco.
- Responde siempre en español.

## HORARIO DE ATENCIÓN
- Ahora mismo es ${dayName} y son las ${mxTime.getHours()}:${String(mxTime.getMinutes()).padStart(2, '0')}.
- Nuestro horario oficial de bodega y atención es: *Lunes a Viernes de 9:00 AM a 6:00 PM (cerramos de 1:00 PM a 2:00 PM en horario de comida)* y *Sábados de 10:00 AM a 2:00 PM*.
- ${isOpenNow
  ? 'ESTAMOS ABIERTOS AHORITA. Si preguntan por horario, confirma que estamos abiertos y comparte el horario (incluyendo que de 1pm a 2pm cerramos a comer y sábados de 10am a 2pm).'
  : isLunchHour
  ? 'AHORITA ESTAMOS EN HORARIO DE COMIDA (1:00 PM a 2:00 PM, la bodega cierra a esta hora y reabre a las 2:00 PM).'
  : 'ESTAMOS FUERA DE HORARIO. Nuestro horario es de lunes a viernes de 9:00 AM a 6:00 PM (con horario de comida de 1:00 PM a 2:00 PM) y sábados de 10:00 AM a 2:00 PM. Menciona esto si preguntan.'}
- NUNCA menciones el horario si no te lo preguntan (a menos que pidan la dirección para visitar la bodega).
- El bot SIEMPRE responde, sin importar la hora.

## CONTEXTO
- Canal: Mensajería (WhatsApp, Messenger o Instagram)
- Fecha: ${now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
`;

    const toolsConfig = [{
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
          description: 'Transfiere a un humano. SOLO cuando el cliente lo pida explícitamente o requiera evaluación de distribuidor/envío foráneo.',
          parameters: {
            type: 'object',
            properties: {
              reason: { type: 'string' },
            },
            required: ['reason'],
          },
        },
        {
          name: 'send_product_photos',
          description: 'Envía fotografías reales de productos, colores disponibles, la fachada de la bodega en Saltillo o las tarimas de envío foráneo directamente al chat del cliente.',
          parameters: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                description: 'Categoría a mostrar: "lambrin", "wall_cladding", "marmol_pvc", "piedra_flexible", "bodega", "tarima", "mesas", "sillas", "toldos"',
              },
              skus: {
                type: 'array',
                description: 'Lista opcional de SKUs específicos para enviar foto (ej. ["GL26", "GL33", "BODEGA", "TARIMA-1"])',
                items: { type: 'string' },
              },
            },
          },
        },
      ],
    }];

    let botReply = '';
    let shouldStayActive = true;

    try {
      let response = null;
      let lastModelErr = null;

      for (const modelName of GEMINI_MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemInstructionText,
            tools: toolsConfig,
          });
          const chat = model.startChat({ history });
          const geminiPromise = chat.sendMessage(effectiveMessage);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 20000)
          );
          const result = await Promise.race([geminiPromise, timeoutPromise]);
          response = result.response;
          console.log(`[Bot] Model ${modelName} succeeded`);
          break;
        } catch (mErr) {
          lastModelErr = mErr;
          console.warn(`[Bot] Model ${modelName} failed (${mErr.message?.slice(0, 140)}), trying next model...`);
        }
      }

      if (!response) {
        throw lastModelErr || new Error('All Gemini models failed');
      }

      // Extract any text parts returned alongside or instead of a function call
      const candidateParts = response.candidates?.[0]?.content?.parts || [];
      const textFromModel = candidateParts
        .filter(p => typeof p.text === 'string' && !p.thought)
        .map(p => p.text)
        .join('\n')
        .trim();

      // Handle function calls WITHOUT a second chat.sendMessage([{ functionResponse }]) call
      // (avoids Gemini 3.5+ "[400 Bad Request] Role 'function' is not supported" and saves 50% API quota)
      const functionCall = response.functionCalls()?.[0];

      if (functionCall) {
        if (functionCall.name === 'transfer_to_human') {
          shouldStayActive = false;
          await supabase
            .from('inbox_conversations')
            .update({ chatbot_active: false })
            .eq('id', conversationId);

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

          await sendTransferNotification(
            contactName, contactPhone, functionCall.args.reason, conversationId
          );

          botReply = textFromModel || (
            isOpenNow
              ? '¡Con gusto! 😊 En este momento te estoy comunicando con un asesor de nuestro equipo para atenderte personalmente. En breve te contactamos.'
              : '¡Con gusto! 😊 He canalizado tu solicitud con un asesor de nuestro equipo. Nuestro horario de atención es de Lunes a Viernes de 9:00 AM a 6:00 PM (comida de 1:00 PM a 2:00 PM) y Sábados de 10:00 AM a 2:00 PM; te daremos seguimiento a primera hora.'
          );
        } else if (functionCall.name === 'create_checkout_link') {
          const checkoutResult = await createCheckoutLink(supabase, conversationId, functionCall.args.items);
          if (checkoutResult.success) {
            botReply = textFromModel
              ? `${textFromModel}\n\n🔗 *Completa tus datos de entrega aquí*:\n${checkoutResult.checkout_url}\n📦 Orden: *${checkoutResult.order_number}* — Total: *$${checkoutResult.total?.toLocaleString('es-MX')} MXN*`
              : `¡Excelente! 😊 Aquí tienes tu enlace para completar tus datos de entrega:\n\n🔗 ${checkoutResult.checkout_url}\n📦 Orden: *${checkoutResult.order_number}*\n💰 Total: *$${checkoutResult.total?.toLocaleString('es-MX')} MXN*`;
          } else {
            botReply = checkoutResult.error;
          }
        } else if (functionCall.name === 'send_product_photos') {
          const { category, skus } = functionCall.args || {};
          const baseUrl = 'https://www.greenland-products.com.mx';
          let matchedProducts = [];

          if (Array.isArray(skus) && skus.length > 0) {
            const skuSet = new Set(skus.map(s => String(s).toUpperCase().trim()));
            matchedProducts = PRODUCT_CATALOG.filter(p => skuSet.has(p.sku.toUpperCase()) && p.image);
          }
          if (matchedProducts.length === 0 && category) {
            const catNorm = String(category).toLowerCase().trim();
            matchedProducts = PRODUCT_CATALOG.filter(
              p => p.category.toLowerCase() === catNorm && p.image
            );
          }

          // Filter out images already sent in this conversation to prevent duplicate photo spam
          const toSend = matchedProducts
            .filter(p => !alreadySentSkus.has(p.sku.toUpperCase()))
            .slice(0, 5);

          for (const prod of toSend) {
            const fullImageUrl = prod.image.startsWith('http') ? prod.image : `${baseUrl}${prod.image}`;
            const caption = prod.caption || `${prod.name} (${prod.sku})`;
            const sentOk = await sendBotImage(conversationId, phoneNumber, fullImageUrl, caption);
            if (sentOk) {
              alreadySentSkus.add(prod.sku.toUpperCase());
              await supabase.from('inbox_messages').insert({
                conversation_id: conversationId,
                direction: 'outbound',
                content: caption,
                content_type: 'image',
                media_url: fullImageUrl,
                status: 'sent',
                metadata: { sent_by: 'chatbot', sku: prod.sku },
              });
            }
            if (prod.sku === 'BODEGA') {
              await sendWarehouseLocation(conversationId, phoneNumber);
            }
          }

          const isBodegaRequest =
            String(category || '').toLowerCase().trim() === 'bodega' ||
            matchedProducts.some(p => p.sku === 'BODEGA');

          if (textFromModel) {
            botReply = textFromModel;
          } else if (isBodegaRequest) {
            botReply = '📍 Nuestra bodega en Saltillo se encuentra en:\n*Blvd. Vito Alessio Robles 3350, Int. 9, Col. Nazario Ortiz, C.P. 25100, Saltillo, Coahuila*.\n\n🕒 *Horario de atención*: Lunes a Viernes de 9:00 AM a 6:00 PM (cerramos de 1:00 PM a 2:00 PM en horario de comida) y Sábados de 10:00 AM a 2:00 PM.\n🗺️ *Ubicación en Google Maps*: https://www.google.com/maps/search/?api=1&query=25.46616,-100.99599\n\n¡Te esperamos con mucho gusto! 😊';
          } else if (matchedProducts.length > 0) {
            const names = matchedProducts.slice(0, 5).map(p => `*${p.name}*`).join(', ');
            botReply = `Aquí tienes las imágenes y detalles de ${names} 😊 ¿Qué modelo o color te agrada más?`;
          } else {
            botReply = '¿Me podrías confirmar qué modelo o producto te gustaría ver? 😊';
          }
        }
      } else {
        botReply = textFromModel || response.text() || 'Disculpa, ¿podrías repetirlo?';
      }
    } catch (geminiErr) {
      // Fallback message if ALL 7 Gemini models fail
      console.error('[Bot] Gemini error:', geminiErr.message, geminiErr.stack?.substring(0, 300));
      const isBillingOrQuotaError = /402|429|prepayment|quota|billing/i.test(geminiErr.message || '');

      if (lastOutboundWasFallback || isBillingOrQuotaError) {
        shouldStayActive = false;
        botReply = '¡Gracias por tu mensaje! 😊 En este momento te estoy transfiriendo con un asesor de nuestro equipo para atenderte personalmente. En breve te contactamos.';

        try {
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
          await sendTransferNotification(
            contactName,
            contactPhone,
            `Falla automática de IA (${geminiErr.message?.substring(0, 200) || 'Error Gemini'}). Mensaje del cliente: "${effectiveMessage}"`,
            conversationId
          );
        } catch (notifyErr) {
          console.error('[Bot] Fallback transfer notification error:', notifyErr);
        }
      } else {
        botReply = FALLBACK_REPLY;
      }
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
        chatbot_active: shouldStayActive,
      }).eq('id', conversationId),
    ]);

    console.log(`[Bot] ✅ Replied to ${conversationId}`);
    return { success: true, reply: botReply };

  } catch (err) {
    console.error('[Bot] Error:', err.message);
    return { success: false, error: err.message };
  }
}

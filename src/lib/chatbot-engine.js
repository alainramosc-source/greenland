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

    // Setup Gemini
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        thinkingConfig: { thinkingBudget: 0 },
      },
      systemInstruction: GREENLAND_KNOWLEDGE + `

## FUNCIONES DISPONIBLES
- **create_checkout_link**: Cuando el cliente confirme que quiere comprar productos específicos con cantidades.
- **transfer_to_human**: SOLO cuando el cliente EXPLÍCITAMENTE pida hablar con una persona real, o quiera ser distribuidor.

## REGLAS CRÍTICAS
- NUNCA uses transfer_to_human por tu cuenta. Solo si el cliente lo pide directamente.
- Si no sabes algo, di "No tengo esa información exacta, pero puedo poner a un asesor contigo si quieres."
- Mantén respuestas cortas (máximo 3-4 líneas).
- Responde siempre en español.

## CONTEXTO
- Canal: WhatsApp
- Fecha: ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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

    // Chat with Gemini
    const chat = model.startChat({ history });
    let result = await chat.sendMessage(message);
    let response = result.response;
    let botReply = '';

    // Handle function calls
    const functionCall = response.functionCalls()?.[0];

    if (functionCall) {
      let functionResult;

      if (functionCall.name === 'transfer_to_human') {
        await supabase
          .from('inbox_conversations')
          .update({ chatbot_active: false })
          .eq('id', conversationId);

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

    // Send WhatsApp + save to DB in parallel
    await Promise.all([
      phoneNumber ? sendWhatsAppMessage(phoneNumber, botReply) : Promise.resolve(),
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
        chatbot_active: true, // Keep bot active after responding
      }).eq('id', conversationId),
    ]);

    console.log(`[Bot] ✅ Replied to ${conversationId}`);
    return { success: true, reply: botReply };

  } catch (err) {
    console.error('[Bot] Error:', err.message);
    return { success: false, error: err.message };
  }
}

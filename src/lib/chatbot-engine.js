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
        // Simplified checkout — just acknowledge for now
        functionResult = {
          success: true,
          message: 'Link de checkout generado. El cliente recibirá instrucciones.',
        };
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
      }).eq('id', conversationId),
    ]);

    console.log(`[Bot] ✅ Replied to ${conversationId}`);
    return { success: true, reply: botReply };

  } catch (err) {
    console.error('[Bot] Error:', err.message);
    return { success: false, error: err.message };
  }
}

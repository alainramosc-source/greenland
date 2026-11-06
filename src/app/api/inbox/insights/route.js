import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GREENLAND_KNOWLEDGE } from '@/lib/chatbot-knowledge';

export const maxDuration = 30;

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(request) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const analyzeWithAI = searchParams.get('ai') !== 'false';

    // Fetch last 1,500 messages from inbox_messages
    const { data: messages, error } = await supabase
      .from('inbox_messages')
      .select('conversation_id, direction, content, content_type, created_at')
      .order('created_at', { ascending: false })
      .limit(1500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allMessages = (messages || []).slice().reverse();
    const inboundMessages = allMessages.filter(
      m => m.direction === 'inbound' && m.content && m.content.trim().length > 2
    );

    // Filter out pure 1-word greetings to focus on substantive customer messages/questions
    const greetingRegex = /^(hola|buenas|buen dia|buenos dias|buenas tardes|buenas noches|info|informacion|precio|precios|gracias|ok|si|sí|👍|👋)[\s!.,?]*$/i;
    const substantiveCustomerMessages = inboundMessages
      .map(m => m.content.trim().replace(/\s+/g, ' '))
      .filter(text => !greetingRegex.test(text));

    // Group conversations for context
    const convMap = new Map();
    for (const m of allMessages) {
      if (!convMap.has(m.conversation_id)) convMap.set(m.conversation_id, []);
      convMap.get(m.conversation_id).push(m);
    }

    let aiReport = null;
    if (analyzeWithAI && substantiveCustomerMessages.length > 0 && process.env.GOOGLE_GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          generationConfig: {
            thinkingConfig: { thinkingBudget: 0 },
          },
        });

        const sampleTranscripts = Array.from(convMap.values())
          .filter(msgs => msgs.some(m => m.direction === 'inbound' && m.content))
          .slice(-80)
          .map((msgs, idx) => {
            const lines = msgs
              .filter(m => m.content)
              .slice(0, 14)
              .map(m => `${m.direction === 'inbound' ? 'CLIENTE' : 'BOT'}: ${m.content.replace(/\s+/g, ' ').slice(0, 220)}`)
              .join('\n');
            return `--- Chat #${idx + 1} ---\n${lines}`;
          })
          .join('\n\n');

        const prompt = `Eres un auditor experto de chatbots comerciales para Greenland Products.
A continuación tienes:
1) La BASE DE CONOCIMIENTO ACTUAL del bot.
2) El HISTORIAL REAL DE CONVERSACIONES de clientes en WhatsApp, Messenger e Instagram.

Tu objetivo es analizar todas las preguntas reales que han hecho los clientes e identificar:
1. **Preguntas Frecuentes Reales (Top FAQs)**: Qué es lo que más preguntan los clientes (con ejemplos reales tomados de los chats).
2. **Huecos de Información (Qué le falta saber al bot)**: Preguntas específicas que hicieron los clientes (ej. cuántos metros cuadrados cubre una caja de lambrín, cómo se instala o con qué pegamento/clips, si los toldos incluyen paredes laterales o qué colores de lona tienen, si facturan / precios con IVA, cuánto peso aguanta una silla, costos de envío en Saltillo, garantías, etc.) que NO están respondidas claramente en la Base de Conocimiento actual.
3. **Dónde se atora o transfiere el bot**: Casos donde el bot dio respuestas incompletas, repetitivas o transfirió cuando podría haber resuelto la duda.
4. **Propuesta lista para agregar al bot**: Lista puntual de datos que debemos pedirle al dueño para que el bot batee el 100% de las preguntas.

=== BASE DE CONOCIMIENTO ACTUAL ===
${GREENLAND_KNOWLEDGE}

=== CONVERSACIONES REALES DE CLIENTES ===
${sampleTranscripts}

Responde en formato Markdown claro, estructurado y directo al grano.`;

        const result = await model.generateContent(prompt);
        aiReport = result.response.text();
      } catch (aiErr) {
        aiReport = `Error generando análisis con IA: ${aiErr.message}`;
      }
    }

    return NextResponse.json({
      success: true,
      total_messages: allMessages.length,
      total_conversations: convMap.size,
      total_inbound_messages: inboundMessages.length,
      substantive_count: substantiveCustomerMessages.length,
      substantive_messages: substantiveCustomerMessages.slice(-250),
      ai_report: aiReport,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

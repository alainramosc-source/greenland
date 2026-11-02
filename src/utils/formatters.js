export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
};

// For datetime strings (ISO with time component, e.g. created_at)
export const formatDate = (dateString) => {
    if (!dateString) return '—';
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' };
    return new Date(dateString).toLocaleDateString('es-MX', options);
};

// For date-only strings (e.g. "2026-03-18" from payment_date, reception_date)
// Appends T12:00:00 to prevent UTC midnight from shifting to previous day in MX timezone
export const formatDateOnly = (dateString, opts) => {
    if (!dateString) return '—';
    const safe = String(dateString).includes('T') ? dateString : dateString + 'T12:00:00';
    const options = opts || { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(safe).toLocaleDateString('es-MX', options);
};

// ─── Fechas en hora de México ───────────────────────────────────────────────
// NO usar `new Date().toISOString().split('T')[0]` para "hoy": eso es fecha UTC
// y a partir de las 18:00 hora de México ya devuelve el día siguiente.
export const MX_TZ = 'America/Mexico_City';

// 'YYYY-MM-DD' de una fecha (por defecto ahora) en hora de México
export const toDateMX = (date = new Date()) =>
    new Date(date).toLocaleDateString('en-CA', { timeZone: MX_TZ });

// 'YYYY-MM-DD' de hoy en hora de México
export const todayMX = () => toDateMX();

// 'YYYY-MM-01' del mes actual en hora de México
export const firstOfMonthMX = () => `${todayMX().slice(0, 7)}-01`;

// ─── Nombres largos en una sola línea ───────────────────────────────────────
// Recorta por en medio (no al final) para conservar la parte que distingue al
// producto, que suele ir al final: "WPC Indoor Wall Panel / Lambrín Nogal"
// → "WPC Indoor… Lambrín Nogal". Corta en espacios cuando es posible.
export const middleEllipsis = (text, max = 30) => {
    const s = String(text || '').trim().replace(/\s+/g, ' ');
    if (s.length <= max) return s;
    const room = max - 2; // "… " ocupa 2
    let tail;
    // 1) Si la parte en español (después de " / ") cabe dejando algo de inicio, úsala completa
    const slash = s.lastIndexOf(' / ');
    if (slash >= 0 && s.length - slash - 3 <= room - Math.max(4, s.indexOf(' '))) {
        tail = s.slice(slash + 3);
    } else {
        // 2) Si no, palabras completas desde el final (~65% del espacio)
        const words = s.split(' ');
        const budget = Math.floor(room * 0.65);
        tail = words[words.length - 1];
        for (let i = words.length - 2; i > 0; i--) {
            const next = `${words[i]} ${tail}`;
            if (next.length > budget) break;
            tail = next;
        }
        tail = tail.replace(/^[/\-|·]\s*/, '');
    }
    // Inicio: palabras completas que quepan en lo que sobra
    const headBudget = Math.max(3, room - tail.length);
    let head = '';
    for (const w of s.split(' ')) {
        const next = head ? `${head} ${w}` : w;
        if (next.length > headBudget) break;
        head = next;
    }
    if (!head) head = s.slice(0, headBudget);
    head = head.replace(/\s*[/\-|·]$/, '');
    return `${head}… ${tail}`;
};

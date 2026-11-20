const memory = new Map();
const fallbackStorage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}

// Retain the same id after a lost response, including a page reload in this tab.
// A definite server failure rolls back completely and permits a fresh request.
async function runInventoryCommand(supabase, kind, payload, command, suppliedStorage) {
  let storage = suppliedStorage;
  if (!storage) { try { storage = typeof window !== 'undefined' ? window.sessionStorage : fallbackStorage; } catch { storage = fallbackStorage; } }
  const canonical = JSON.stringify(stable({ kind, payload }));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  const key = 'greenland.inventory.v1.' + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  let requestId;
  try { requestId = storage.getItem(key); } catch { storage = fallbackStorage; requestId = storage.getItem(key); }
  if (!requestId) { requestId = crypto.randomUUID(); storage.setItem(key, requestId); }
  const { data, error } = await command(requestId);
  if (error) throw new Error(error.message || 'No se pudo confirmar la respuesta. Puedes reintentar sin duplicar la operación.');
  if (!data || typeof data.success !== 'boolean') throw new Error('No se pudo confirmar la respuesta. Reintenta la misma operación.');
  storage.removeItem(key);
  if (!data.success) throw new Error(data.error || 'No se aplicó ningún cambio.');
  return data;
}

export function runInventoryOperation(supabase, kind, payload, storage) {
  return runInventoryCommand(supabase, kind, payload, requestId => supabase.rpc('apply_inventory_operation', {
    p_request_id: requestId, p_kind: kind, p_payload: payload,
  }), storage);
}

export function saveInventoryCount(supabase, sessionId, lines, storage) {
  return runInventoryCommand(supabase, 'count_save', { session_id: sessionId, lines }, requestId => supabase.rpc('save_inventory_count_lines', {
    p_request_id: requestId, p_session_id: sessionId, p_lines: lines,
  }), storage);
}

export function createProRetailSale(supabase, payload, storage) {
  return runInventoryCommand(supabase, 'pro_retail_sale', payload, requestId => supabase.rpc('create_pro_retail_sale_atomic', {
    p_request_id: requestId, p_warehouse_id: payload.warehouse_id, p_items: payload.items,
    p_customer_name: payload.customer_name || null, p_notes: payload.notes || null,
  }), storage);
}

export function inventoryTransferItems(items, products, credits = {}) {
  if (!items?.length) throw new Error('Incluye al menos una partida.');
  return items.map(item => {
    const product = products.find(p => p.sku === item.sku);
    const quantity = Number(item.qty);
    const credit = Number(credits[item.sku] || 0);
    if (!product || !Number.isSafeInteger(quantity) || quantity <= 0) throw new Error(`Partida inválida: ${item.sku || 'sin SKU'}.`);
    if (!Number.isFinite(credit) || credit < 0 || Math.abs(credit * 100 - Math.round(credit * 100)) > 0.00001) throw new Error(`Crédito inválido: ${item.sku}.`);
    return { product_id: product.id, quantity, credit };
  }).sort((a, b) => a.product_id.localeCompare(b.product_id));
}

/**
 * Input Sanitization & Validation Utilities
 * Protects against XSS, injection, and invalid numeric inputs
 */

/**
 * Strip HTML tags and potentially dangerous content from text input
 */
export function sanitizeText(input, maxLength = 500) {
    if (!input || typeof input !== 'string') return '';
    return input
        .replace(/<[^>]*>/g, '')           // Strip HTML tags
        .replace(/javascript:/gi, '')       // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '')        // Remove event handlers
        .replace(/&lt;script/gi, '')        // Remove encoded script tags
        .trim()
        .slice(0, maxLength);
}

/**
 * Validate and clamp a numeric value
 * Returns the clamped number or null if invalid
 */
export function validateNumber(value, { min = 0, max = Infinity, allowDecimals = true } = {}) {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) return null;
    if (!allowDecimals) {
        if (!Number.isInteger(num)) return null;
    }
    return Math.max(min, Math.min(max, num));
}

/**
 * Validate a currency amount (positive, max 2 decimal places)
 */
export function validateAmount(value) {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num) || num <= 0) return null;
    return Math.round(num * 100) / 100; // Round to 2 decimal places
}

/**
 * Validate quantity (positive integer, >= 1)
 */
export function validateQuantity(value, max = 99999) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return null;
    return Math.min(num, max);
}

/**
 * Validate price (>= 0, max 2 decimals)
 */
export function validatePrice(value) {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num) || num < 0) return null;
    return Math.round(num * 100) / 100;
}

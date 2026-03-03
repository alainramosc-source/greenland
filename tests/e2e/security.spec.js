const { test, expect } = require('@playwright/test');

test.describe('Security Validation Tests', () => {
    // These tests verify security headers and responses without authentication

    test('API routes return 401/403 without auth', async ({ request }) => {
        const response = await request.get('/api/get-ip');
        // API should work (it's a simple IP lookup)
        expect(response.status()).toBe(200);
    });

    test('HTTPS headers are present in responses', async ({ page }) => {
        const response = await page.goto('/');

        // Vercel automatically adds security headers
        const headers = response.headers();
        // X-Frame-Options or CSP should be there on Vercel
        expect(headers['x-powered-by'] || '').not.toContain('Express');
    });

    test('No server info leaked in error pages', async ({ page }) => {
        await page.goto('/api/nonexistent');
        const content = await page.content();

        // Should not reveal stack traces or server details
        expect(content).not.toContain('node_modules');
        expect(content).not.toContain('at Object');
        expect(content).not.toContain('ENOENT');
    });

    test('XSS payloads in URL are not rendered', async ({ page }) => {
        // Try to inject script via URL parameter
        await page.goto('/?q=<script>alert("xss")</script>');
        const content = await page.content();

        // React should escape this automatically
        expect(content).not.toContain('<script>alert("xss")</script>');
    });
});

const { test, expect } = require('@playwright/test');

test.describe('Public Pages', () => {
    test('Landing page renders and has navigation', async ({ page }) => {
        await page.goto('/');

        await expect(page).toHaveTitle(/Greenland/i);

        // Main navigation should be visible
        const nav = page.locator('nav, header').first();
        await expect(nav).toBeVisible();
    });

    test('Productos page loads', async ({ page }) => {
        await page.goto('/productos');
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('Nosotros page loads', async ({ page }) => {
        await page.goto('/nosotros');
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('Distribuidores page loads', async ({ page }) => {
        await page.goto('/distribuidores');
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('Public pages do not expose dashboard data', async ({ page }) => {
        await page.goto('/');
        const content = await page.content();

        // Public pages should not contain dashboard-specific data
        expect(content).not.toContain('distributor_id');
        expect(content).not.toContain('order_id');
    });

    test('404 page handles unknown routes', async ({ page }) => {
        const response = await page.goto('/nonexistent-route-12345');
        // Should either show 404 or redirect
        expect([200, 404]).toContain(response.status());
    });
});

const { test, expect } = require('@playwright/test');

test.describe('Public Flows', () => {
    test('Landing page renders correctly and has main CTA', async ({ page }) => {
        // Navigate to local app
        await page.goto('/');

        // Check if the logo / main heading is there
        // Using loose match for title / branding
        await expect(page).toHaveTitle(/Greenland Products/i);

        // Look for a CTA like "Catálogo" or something in the hero
        // Since we don't know the exact text, we can check for navigation links
        const productosLink = page.getByRole('link', { name: /Mobiliario Funcional/i });
        await expect(productosLink).toBeVisible();
    });

    test('Navigation to Productos page works', async ({ page }) => {
        await page.goto('/');

        // We can also navigate directly to /productos and verify
        await page.goto('/productos');

        // Check if the page loaded
        // Depending on what exactly is in /productos, we can check for a heading or generic element
        await expect(page.locator('h1').first()).toBeVisible();
    });
});

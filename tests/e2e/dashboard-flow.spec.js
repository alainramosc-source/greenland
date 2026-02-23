const { test, expect } = require('@playwright/test');

test.describe('Dashboard Flows', () => {
    // To fully test the dashboard without bypassing auth, we'd need valid test credentials stored in .env
    // For standard E2E testing without credentials, we can at least ensure we handle loading states properly
    // If we had credentials:
    // test.beforeEach(async ({ page }) => {
    //   await page.goto('/login');
    //   await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL);
    //   await page.getByLabel('Contraseña').fill(process.env.TEST_USER_PASSWORD);
    //   await page.getByRole('button', { name: /entrar/i }).click();
    //   await expect(page).toHaveURL(/.*\/dashboard/);
    // });

    test('If navigated to new order directly, should enforce auth', async ({ page }) => {
        await page.goto('/dashboard/pedidos/nuevo');

        // Should be redirected or show loading
        await expect(page).toHaveURL(/.*\/login/);
    });
});

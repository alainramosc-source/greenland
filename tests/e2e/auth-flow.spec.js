const { test, expect } = require('@playwright/test');

test.describe('Authentication & Security', () => {
    test('Login page renders correctly', async ({ page }) => {
        await page.goto('/login');

        await expect(page.getByRole('button', { name: /ingresar/i })).toBeVisible();
        await expect(page.getByPlaceholder('ejemplo@empresa.com')).toBeVisible();
        await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    });

    test('Protected routes redirect to login when unauthenticated', async ({ page }) => {
        const protectedRoutes = [
            '/dashboard',
            '/dashboard/pedidos',
            '/dashboard/pedidos/nuevo',
            '/dashboard/inventarios',
            '/dashboard/pagos',
            '/dashboard/mis-pagos',
            '/dashboard/onboarding',
            '/dashboard/precios',
            '/dashboard/usuarios',
        ];

        for (const route of protectedRoutes) {
            await page.goto(route);
            await expect(page).toHaveURL(/.*\/login/, {
                timeout: 10000,
            });
        }
    });

    test('Invalid credentials stay on login page', async ({ page }) => {
        await page.goto('/login');

        await page.getByPlaceholder('ejemplo@empresa.com').fill('invalid@example.com');
        await page.getByPlaceholder('••••••••').fill('wrongpassword123');
        await page.getByRole('button', { name: /ingresar/i }).click();

        // Should remain on login page
        await page.waitForTimeout(2000);
        await expect(page).toHaveURL(/.*\/login/);
    });

    test('Login page does not expose sensitive info in page source', async ({ page }) => {
        await page.goto('/login');
        const content = await page.content();

        // Should not contain Supabase service key (only anon key is acceptable)
        expect(content).not.toContain('service_role');
        expect(content).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6');
    });
});

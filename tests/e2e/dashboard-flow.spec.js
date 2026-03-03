const { test, expect } = require('@playwright/test');

test.describe('Dashboard Protection', () => {
    const dashboardRoutes = [
        { path: '/dashboard/pedidos/nuevo', name: 'Nuevo Pedido' },
        { path: '/dashboard/inventarios', name: 'Inventarios' },
        { path: '/dashboard/pagos', name: 'Pagos Admin' },
        { path: '/dashboard/mis-pagos', name: 'Mis Pagos' },
        { path: '/dashboard/precios', name: 'Precios' },
        { path: '/dashboard/usuarios', name: 'Usuarios' },
        { path: '/dashboard/onboarding', name: 'Onboarding' },
        { path: '/dashboard/expedientes', name: 'Expedientes' },
        { path: '/dashboard/estadisticas', name: 'Estadísticas' },
        { path: '/dashboard/cms', name: 'CMS' },
    ];

    for (const route of dashboardRoutes) {
        test(`${route.name} (${route.path}) requires authentication`, async ({ page }) => {
            await page.goto(route.path);
            await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
        });
    }
});

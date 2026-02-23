import { render, screen, fireEvent } from '@testing-library/react';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

// Mock routing
jest.mock('next/navigation', () => ({
    usePathname: jest.fn(),
    useRouter: jest.fn(),
}));

// Mock Supabase
jest.mock('@/utils/supabase/client', () => ({
    createClient: jest.fn(),
}));

describe('DashboardSidebar Component', () => {
    let mockSignOut;
    let mockPush;

    beforeEach(() => {
        usePathname.mockReturnValue('/dashboard');
        mockPush = jest.fn();
        useRouter.mockReturnValue({ push: mockPush, refresh: jest.fn() });

        // Setup supabase mock
        mockSignOut = jest.fn();
        createClient.mockReturnValue({
            auth: {
                signOut: mockSignOut
            }
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should render only distributor links when userRole is not admin', () => {
        render(<DashboardSidebar isOpen={true} onClose={jest.fn()} userRole="distributor" />);

        // In navItems for non-admin, "Mis Pedidos" is present.
        expect(screen.getByText('Mis Pedidos')).toBeInTheDocument();

        // Admin links shouldn't be there
        expect(screen.queryByText('Inventarios')).not.toBeInTheDocument();
        expect(screen.queryByText('Estadísticas')).not.toBeInTheDocument();
    });

    it('should render all admin links when userRole is admin', () => {
        render(<DashboardSidebar isOpen={true} onClose={jest.fn()} userRole="admin" />);

        // Main admin nav items
        expect(screen.getByText('Tablero')).toBeInTheDocument();
        expect(screen.getByText('Pedidos')).toBeInTheDocument();

        // Admin specific items
        expect(screen.getByText('Inventarios')).toBeInTheDocument();
        expect(screen.getByText('Estadísticas')).toBeInTheDocument();
        expect(screen.getByText('Clientes')).toBeInTheDocument();
    });

    it('should call signout and redirect on logout click', async () => {
        render(<DashboardSidebar isOpen={true} onClose={jest.fn()} userRole="admin" />);

        const logoutBtn = screen.getByRole('button', { name: /cerrar sesión/i });
        fireEvent.click(logoutBtn);

        expect(mockSignOut).toHaveBeenCalledTimes(1);

        // It's an async handler in the component so we may need a flush of promises or just rely on synchronous trigger
        // Actually the mock returns synchronous promise resolution by default or we might need to wait for it.
        // We can use a tiny delay or just assert directly if it resolves immediately.
        // For safety:
        await Promise.resolve();

        expect(mockPush).toHaveBeenCalledWith('/login');
    });
});

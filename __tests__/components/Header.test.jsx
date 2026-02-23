import { render, screen, fireEvent } from '@testing-library/react';
import Header from '@/components/layout/Header';
import { usePathname } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    usePathname: jest.fn(),
}));

describe('Header Component', () => {
    beforeEach(() => {
        usePathname.mockReturnValue('/');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should render the logo image', () => {
        render(<Header />);
        const logo = screen.getByAltText('Greenland Products');
        expect(logo).toBeInTheDocument();
        expect(logo.closest('a')).toHaveAttribute('href', '/');
    });

    it('should render basic navigation links on desktop', () => {
        render(<Header />);
        expect(screen.getByText('INICIO')).toBeInTheDocument();
        expect(screen.getByText('SOLUCIONES GREENLAND')).toBeInTheDocument();
        expect(screen.getByText('DISTRIBUIDORES')).toBeInTheDocument();
        expect(screen.getByText('NOSOTROS')).toBeInTheDocument();
    });

    it('should mark the active link based on pathname', () => {
        usePathname.mockReturnValue('/nosotros');
        render(<Header />);

        const nosotrosLink = screen.getByText('NOSOTROS');
        expect(nosotrosLink).toHaveClass('active');

        const inicioLink = screen.getByText('INICIO');
        expect(inicioLink).not.toHaveClass('active');
    });

    it('should render dropdown items', () => {
        render(<Header />);
        expect(screen.getByText('Mobiliario Funcional')).toBeInTheDocument();
        expect(screen.getByText('Greenland Spaces')).toBeInTheDocument();
        expect(screen.getByText('Greenland Deco')).toBeInTheDocument();
    });

    it('should toggle mobile menu when clicking menu button', () => {
        // For react testing library, we might need to mock window size or just test the state.
        // The mobile menu renders conditionally when menuOpen is true.
        render(<Header />);

        // initially not present (mobile nav container is conditionally rendered)
        expect(screen.queryByText('ACCESO DISTRIBUIDORES')).not.toBeInTheDocument();

        const menuButton = screen.getByLabelText('Menu');
        fireEvent.click(menuButton);

        // After click, it should show mobile links
        expect(screen.getByText('ACCESO DISTRIBUIDORES')).toBeInTheDocument();
    });
});

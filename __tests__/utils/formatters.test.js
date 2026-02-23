import { formatCurrency, formatDate } from '@/utils/formatters';

describe('Formatters Utilities', () => {
    describe('formatCurrency', () => {
        it('should format positive numbers to MXN currency', () => {
            // The exact output might contain non-breaking spaces depending on Node version,
            // so we use a regex or replace spaces for robustness.
            const result = formatCurrency(1500).replace(/\s/g, ' ');
            expect(result).toMatch(/\$1,500\.00/);
        });

        it('should format zero correctly', () => {
            const result = formatCurrency(0).replace(/\s/g, ' ');
            expect(result).toMatch(/\$0\.00/);
        });

        it('should handle negative numbers', () => {
            const result = formatCurrency(-50.5).replace(/\s/g, ' ');
            expect(result).toMatch(/-\$50\.50/);
        });
    });

    describe('formatDate', () => {
        it('should format a valid date string to Spanish localized date', () => {
            // Hardcode timezone for reliable testing or verify parts
            const dateString = '2025-01-15T14:30:00Z';
            const result = formatDate(dateString);
            // It should contain '15', 'enero', '2025'
            expect(result.toLowerCase()).toContain('15');
            expect(result.toLowerCase()).toContain('enero');
            expect(result.toLowerCase()).toContain('2025');
        });

        it('should return "Invalid Date" for bad inputs when using toLocaleDateString', () => {
            const result = formatDate('invalid-date');
            expect(result).toBe('Invalid Date');
        });
    });
});

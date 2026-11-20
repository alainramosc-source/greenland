import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CountPage from '../../src/app/(dashboard)/dashboard/inventarios/conteo/[id]/page';
import { saveInventoryCount } from '@/lib/inventory-operations';

jest.mock('next/navigation', () => ({ useParams: () => ({ id: 'session-test' }), useRouter: () => ({ push: jest.fn() }) }));
jest.mock('xlsx', () => ({}));
jest.mock('@/lib/inventory-operations', () => ({ saveInventoryCount: jest.fn() }));
let mockRole = 'super_admin';
const mockLine = { id: 'line-test', sku: 'TEST-1', qty_system_snapshot: 10, qty_counted: 10, reason: '', product: { sku: 'TEST-1', name: 'Producto ficticio' } };
const mockClient = {
  auth: { getUser: async () => ({ data: { user: { id: 'user-test' } } }) },
  from: table => ({
    select() { return this; }, eq() { return this; },
    single: async () => ({ data: table === 'profiles' ? { role: 'admin', sub_role: mockRole, is_active: true }
      : { id: 'session-test', session_code: 'TEST-COUNT', status: 'draft', count_type: 'full', warehouse: { name: 'Bodega ficticia' } } }),
    order: async () => ({ data: [{ ...mockLine }] }),
  }),
};
jest.mock('@/utils/supabase/client', () => ({ createClient: () => mockClient }));

beforeEach(() => { mockRole = 'super_admin'; jest.clearAllMocks(); window.alert = jest.fn(); });

test('a rejected save preserves the entered quantity and dirty indicator', async () => {
  saveInventoryCount.mockRejectedValueOnce(new Error('No se guardaron las partidas.'));
  render(<CountPage />);
  const quantity = await screen.findByDisplayValue('10');
  fireEvent.change(quantity, { target: { value: '12' } });
  fireEvent.click(screen.getByRole('button', { name: /Guardar \(1\)/ }));
  await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('No se guardaron')));
  expect(screen.getByDisplayValue('12')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Guardar \(1\)/ })).toBeEnabled();
  expect(saveInventoryCount).toHaveBeenCalledWith(mockClient, 'session-test', [expect.objectContaining({ qty_counted: 12, recapture: true })]);
});

test('accounting can consult a count without capture or workflow controls', async () => {
  mockRole = 'accountant';
  render(<CountPage />);
  await screen.findByText('TEST-COUNT');
  expect(screen.queryByRole('button', { name: /Guardar/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Aprobar/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
});

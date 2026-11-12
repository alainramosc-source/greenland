import SiteDocument from '@/components/layout/SiteDocument';
import DashboardShell from './DashboardShell';

export { metadata } from '@/components/layout/SiteDocument';

export default function Layout({ children }) {
  return (
    <SiteDocument>
      <DashboardShell>{children}</DashboardShell>
    </SiteDocument>
  );
}

import SiteDocument from '@/components/layout/SiteDocument';
import PublicShell from './PublicShell';

export { metadata } from '@/components/layout/SiteDocument';

export default function Layout({ children }) {
  return (
    <SiteDocument analytics>
      <PublicShell>{children}</PublicShell>
    </SiteDocument>
  );
}

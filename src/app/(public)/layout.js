'use client';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function PublicLayout({ children }) {
    return (
        <div className="public-layout">
            <Header />
            <main>{children}</main>
            <Footer />
        </div>
    );
}

'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Loader2 } from 'lucide-react';

/**
 * Wrap admin-only pages with this component.
 * If the user is not an admin, they are redirected to /dashboard.
 */
export default function AdminGuard({ children }) {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        async function check() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/login');
                return;
            }
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role === 'admin') {
                setIsAdmin(true);
            } else {
                router.replace('/dashboard');
            }
            setLoading(false);
        }
        check();
    }, []);

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#6a9a04]" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-slate-500">
                <ShieldAlert size={48} className="text-red-400" />
                <p className="font-bold text-lg">Acceso no autorizado</p>
            </div>
        );
    }

    return children;
}

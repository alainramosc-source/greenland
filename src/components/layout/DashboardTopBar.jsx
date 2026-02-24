'use client';
import { useState, useEffect, useRef } from 'react';
import { Menu, Bell, X, ExternalLink } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

const DashboardTopBar = ({ onMenuClick, userRole, userName }) => {
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef(null);
  const supabase = createClient();
  const router = useRouter();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let uid = user.id;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role === 'admin' && typeof window !== 'undefined' && sessionStorage.getItem('test_view_role') === 'distributor') {
      const simId = sessionStorage.getItem('test_view_distributor_id');
      if (simId) uid = simId;
    }

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setNotifications(data);
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowPanel(false);
      }
    };
    if (showPanel) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPanel]);

  const handleMarkAsRead = async (notifId) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    for (const nid of unreadIds) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', nid);
    }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = (notif) => {
    handleMarkAsRead(notif.id);
    if (notif.reference_id) {
      router.push(`/dashboard/pedidos/${notif.reference_id}`);
      setShowPanel(false);
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  return (
    <header className="h-20 flex items-center justify-between px-8 z-10 sticky top-0" style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.5)' }}>
      <div className="flex-1 flex items-center">
        <button
          className="md:hidden p-2 text-slate-500 hover:bg-white/50 rounded-lg mr-4 transition-colors"
          onClick={onMenuClick}
        >
          <Menu size={24} />
        </button>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notification Bell */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => { setShowPanel(!showPanel); if (!showPanel) fetchNotifications(); }}
            className="relative p-2.5 rounded-xl hover:bg-white/50 text-slate-500 transition-colors border-none bg-transparent cursor-pointer"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-[#ec5b13] text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          {showPanel && (
            <div className="absolute right-0 top-14 w-96 max-h-[500px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 m-0">Notificaciones</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs font-semibold text-[#ec5b13] hover:text-[#ec5b13]/80 bg-transparent border-none cursor-pointer"
                    >
                      Marcar todo leído
                    </button>
                  )}
                  <button onClick={() => setShowPanel(false)} className="p-1 rounded-lg hover:bg-slate-100 bg-transparent border-none cursor-pointer">
                    <X size={16} className="text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[420px]">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Bell size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="font-medium m-0 text-sm">Sin notificaciones</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`px-4 py-3 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50 ${!notif.is_read ? 'bg-[#ec5b13]/[0.03]' : ''
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!notif.is_read ? 'bg-[#ec5b13]' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm m-0 leading-snug ${!notif.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-slate-500 m-0 mt-1 leading-relaxed">{notif.message}</p>
                          <p className="text-[10px] text-slate-400 m-0 mt-1.5 font-medium uppercase tracking-wider">
                            {timeAgo(notif.created_at)}
                          </p>
                        </div>
                        {notif.reference_id && (
                          <ExternalLink size={14} className="text-slate-300 mt-1 shrink-0" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-[1px] bg-slate-200/50 mx-2"></div>

        <div className="flex items-center gap-3 cursor-pointer p-1.5 pr-4 rounded-full border border-slate-200/50 hover:bg-white/50 transition-colors bg-white/20 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-full border border-[#6a9a04]/20 p-0.5 bg-white/50 flex items-center justify-center overflow-hidden">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#6a9a04]/20 to-[#dee24b]/20 flex items-center justify-center text-[#6a9a04] font-bold text-sm">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-800 leading-none">{userName || 'Usuario'}</p>
            <p className="text-[10px] uppercase tracking-widest text-[#ec5b13] font-black mt-1">
              {userRole === 'admin' ? 'Administrador' : 'Distribuidor'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardTopBar;

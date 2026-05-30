import { useState, useEffect, useRef } from 'react';
import { FaBars, FaBell, FaCalendarTimes, FaCheckCircle } from 'react-icons/fa';
import { Avatar, ROLES } from './ui';
import { notificationsAPI } from '../services/api';

const isStaff = (role) => ['nurse', 'doctor', 'admin'].includes(role);

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

export default function Topbar({ title, sub, user, onMenu }) {
  const roleInfo = ROLES[user?.role];
  const staff    = isStaff(user?.role);

  const [open, setOpen]                   = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [count, setCount]                 = useState(0);
  const panelRef = useRef(null);

  // Poll for notifications (staff only)
  useEffect(() => {
    if (!staff) return;
    let active = true;
    const fetchNotifs = async () => {
      try {
        const { notifications, count } = await notificationsAPI.getUnread();
        if (active) { setNotifications(notifications); setCount(count); }
      } catch {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 20000); // every 20s
    return () => { active = false; clearInterval(interval); };
  }, [staff]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  // Opening the bell marks all as read
  const toggleBell = async () => {
    const next = !open;
    setOpen(next);
    if (next && count > 0) {
      try {
        await notificationsAPI.markAllRead();
        setCount(0);
      } catch {}
    }
  };

  return (
    <header className="topbar">
      <button className="icon-btn topbar-menu" onClick={onMenu} aria-label="Open menu">
        <FaBars />
      </button>

      <div className="tb-title">
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>

      <div className="topbar-spacer" />

      {staff && (
        <div className="notif-wrap" ref={panelRef}>
          <button className="icon-btn" aria-label="Notifications" style={{ position: 'relative' }} onClick={toggleBell}>
            <FaBell />
            {count > 0 && <span className="notif-badge">{count > 9 ? '9+' : count}</span>}
          </button>

          {open && (
            <div className="notif-panel">
              <div className="notif-head">
                <b>Notifications</b>
                {notifications.length > 0 && <span>{notifications.length} unread</span>}
              </div>
              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <FaCheckCircle size={26} style={{ color: 'var(--ok)', marginBottom: 8 }} />
                    <div>You're all caught up.</div>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="notif-item">
                      <div className="notif-ic"><FaCalendarTimes size={15} /></div>
                      <div className="notif-body">
                        <p>{n.message}</p>
                        <span>{timeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="tb-user">
        <Avatar name={user?.name} role={user?.role} size={34} />
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{user?.name}</div>
          {roleInfo && <div style={{ fontSize: 11, fontWeight: 700, color: roleInfo.hex }}>{roleInfo.label}</div>}
        </div>
      </div>

      <style>{`
        .topbar-menu { display: none; }
        .tb-title { flex-shrink: 0; }
        .tb-title h1 { white-space: nowrap; }
        .tb-user { display: flex; align-items: center; gap: 10px; padding: 5px 14px 5px 5px;
          border: 1px solid var(--line); border-radius: var(--r-pill); background: var(--surface); }
        .notif-wrap { position: relative; }
        .notif-badge { position: absolute; top: -4px; right: -4px; min-width: 17px; height: 17px; padding: 0 4px;
          border-radius: 99px; background: var(--danger); color: #fff; font-size: 10px; font-weight: 800;
          display: grid; place-items: center; border: 1.5px solid var(--surface); }
        .notif-panel { position: absolute; top: calc(100% + 10px); right: 0; z-index: 80; width: 340px;
          background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-md);
          box-shadow: var(--shadow-lg); overflow: hidden; animation: pop .18s ease; }
        .notif-head { display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px; border-bottom: 1px solid var(--line-soft); }
        .notif-head b { font-size: 14.5px; font-weight: 800; }
        .notif-head span { font-size: 11.5px; font-weight: 700; color: var(--muted); }
        .notif-list { max-height: 380px; overflow-y: auto; }
        .notif-empty { text-align: center; padding: 36px 20px; color: var(--muted); font-size: 13.5px; }
        .notif-item { display: flex; gap: 11px; padding: 13px 16px; border-bottom: 1px solid var(--line-soft); }
        .notif-item:last-child { border-bottom: none; }
        .notif-ic { width: 34px; height: 34px; border-radius: 10px; flex: 0 0 34px;
          background: var(--danger-bg); color: var(--danger); display: grid; place-items: center; }
        .notif-body { flex: 1; min-width: 0; }
        .notif-body p { font-size: 13px; color: var(--ink-soft); line-height: 1.45; margin: 0; }
        .notif-body span { font-size: 11px; color: var(--faint); font-weight: 600; }
        @media (max-width: 920px) {
          .topbar-menu { display: grid; }
          .tb-user > div { display: none; }
          .notif-panel { width: 300px; }
        }
      `}</style>
    </header>
  );
}

import { FaCalendarAlt, FaFileAlt, FaPills, FaTachometerAlt, FaChevronLeft, FaChevronRight, FaSignOutAlt } from 'react-icons/fa';
import { Avatar, RoleTag } from './ui';

const NAV = [
  { id: 'dashboard',    label: 'Dashboard',       icon: <FaTachometerAlt />, roles: ['nurse', 'doctor', 'admin', 'patient'] },
  { id: 'appointments', label: 'Appointments',    icon: <FaCalendarAlt />,   roles: ['nurse', 'doctor', 'admin', 'patient'] },
  { id: 'records',      label: 'Medical Records', icon: <FaFileAlt />,       roles: ['nurse', 'doctor', 'admin', 'patient'] },
  { id: 'inventory',    label: 'Inventory',       icon: <FaPills />,         roles: ['nurse', 'doctor', 'admin'] },
];

export { NAV };

export default function Sidebar({ user, active, onNav, collapsed, setCollapsed, mobileOpen, setMobileOpen, onLogout }) {
  const items = NAV.filter(n => n.roles.includes(user.role));

  const navLabel = (n) => {
    if (user.role === 'patient') {
      if (n.id === 'appointments') return 'My Appointments';
      if (n.id === 'records') return 'My Records';
    }
    return n.label;
  };

  return (
    <>
      {mobileOpen && <div className="scrim" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sb-head">
          <div className="sb-mark">E</div>
          <div className="sb-wordmark">
            <b>E-Cliniq</b>
            <span>Campus Health</span>
          </div>
        </div>

        <nav className="sb-nav">
          <div className="sb-section-label">Workspace</div>
          {items.map(n => (
            <button
              key={n.id}
              className={`sb-item ${active === n.id ? 'active' : ''}`}
              onClick={() => { onNav(n.id); setMobileOpen(false); }}
              title={navLabel(n)}
            >
              {n.icon}
              <span className="sb-label">{navLabel(n)}</span>
            </button>
          ))}
        </nav>

        <div className="sb-foot">
          <div className="sb-user">
            <Avatar name={user.name} role={user.role} size={36} />
            <div className="sb-user-meta sb-foot-text">
              <b>{user.name}</b>
              <RoleTag role={user.role} />
            </div>
          </div>
          <button
            className="sb-item"
            style={{ marginTop: 6, color: 'var(--sb-fg-soft)' }}
            onClick={onLogout}
          >
            <FaSignOutAlt />
            <span className="sb-label">Sign out</span>
          </button>
        </div>

        <button
          className="sb-collapse"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <FaChevronRight size={14} /> : <FaChevronLeft size={14} />}
        </button>
      </aside>

      <style>{`
        .sb-collapse {
          position: absolute; top: 86px; right: -13px; width: 26px; height: 26px;
          border-radius: 50%; border: 1px solid var(--line); background: var(--surface);
          color: var(--muted); display: grid; place-items: center; box-shadow: var(--shadow-sm); z-index: 2;
        }
        .sb-collapse:hover { color: var(--primary); border-color: var(--royal-100); }
        @media (max-width: 920px) { .sb-collapse { display: none; } }
      `}</style>
    </>
  );
}

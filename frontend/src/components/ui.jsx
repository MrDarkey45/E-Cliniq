import { useEffect } from 'react';
import { FaCheck, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

export const ROLES = {
  nurse:   { label: 'Nurse',   hex: '#0e9b86' },
  doctor:  { label: 'Doctor',  hex: '#2a4bd0' },
  admin:   { label: 'Admin',   hex: '#d4920f' },
  patient: { label: 'Patient', hex: '#e0724a' },
};

const initials = (name = '') =>
  name.replace(/^Dr\.\s*/, '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

export function Avatar({ name, role, size = 38, ring = true }) {
  const c = ROLES[role]?.hex || '#888';
  return (
    <div
      className={`avatar ${ring ? 'ring' : ''}`}
      style={{
        width: size, height: size, flexBasis: size, fontSize: size * 0.36,
        background: `linear-gradient(140deg, ${c}, color-mix(in srgb, ${c} 70%, #000))`,
        '--role-c': c,
      }}
    >
      {initials(name)}
    </div>
  );
}

export function RoleTag({ role }) {
  const r = ROLES[role];
  if (!r) return null;
  return (
    <span className="role-tag" style={{ '--role-c': r.hex }}>
      <span className="dot" />{r.label}
    </span>
  );
}

export function Modal({ children, onClose, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className={`modal ${wide ? 'wide' : ''}`} onMouseDown={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function ModalHead({ icon, title, onClose, accent }) {
  return (
    <div className="modal-head">
      {icon && (
        <div style={{
          width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center',
          background: accent ? `color-mix(in srgb, ${accent} 14%, transparent)` : 'var(--royal-50)',
          color: accent || 'var(--primary)',
        }}>
          {icon}
        </div>
      )}
      <h2>{title}</h2>
      <button className="icon-btn" onClick={onClose} aria-label="Close"><FaTimes /></button>
    </div>
  );
}

export function Stat({ label, value, icon, tone = 'blue', delta }) {
  const tones = {
    blue:  { bg: 'var(--royal-50)',  fg: 'var(--primary)' },
    gold:  { bg: 'var(--gold-100)',  fg: 'var(--gold-600)' },
    green: { bg: 'var(--ok-bg)',     fg: 'var(--ok)' },
    coral: { bg: 'var(--danger-bg)', fg: 'var(--danger)' },
  };
  const t = tones[tone] || tones.blue;
  return (
    <div className="stat">
      {icon && <div className="stat-ico" style={{ background: t.bg, color: t.fg }}>{icon}</div>}
      <span className="label">{label}</span>
      <span className="value">{value}</span>
      {delta && <span className="delta" style={{ color: 'var(--muted)' }}>{delta}</span>}
    </div>
  );
}

export function Empty({ icon, title, text, action }) {
  return (
    <div className="empty">
      <div className="e-ico">{icon}</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}

export function Confirm({ title, text, confirmLabel = 'Confirm', danger, onConfirm, onClose }) {
  return (
    <Modal onClose={onClose}>
      <ModalHead
        icon={danger ? <FaExclamationTriangle /> : <FaCheck />}
        title={title}
        onClose={onClose}
        accent={danger ? 'var(--danger)' : 'var(--primary)'}
      />
      <div className="modal-body">
        <p style={{ color: 'var(--ink-soft)', fontSize: 15 }}>{text}</p>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => { onConfirm(); onClose(); }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function Toasts({ toasts }) {
  const icons = {
    ok:     { bg: 'var(--ok)',     El: FaCheck },
    warn:   { bg: 'var(--warn)',   El: FaExclamationTriangle },
    danger: { bg: 'var(--danger)', El: FaTimes },
  };
  return (
    <div className="toast-wrap">
      {toasts.map(t => {
        const m = icons[t.kind] || icons.ok;
        return (
          <div className="toast" key={t.id}>
            <span className="t-ico" style={{ background: m.bg }}><m.El /></span>
            {t.msg}
          </div>
        );
      })}
    </div>
  );
}

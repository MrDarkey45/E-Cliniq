import { useState } from 'react';
import { authAPI } from '../services/api';
import { FaEnvelope, FaExclamationCircle, FaArrowRight } from 'react-icons/fa';

const ROLES = {
  nurse:   { label: 'Nurse',   hex: '#0e9b86' },
  doctor:  { label: 'Doctor',  hex: '#2a4bd0' },
  admin:   { label: 'Admin',   hex: '#d4920f' },
  patient: { label: 'Patient', hex: '#e0724a' },
};

const QUICK_CREDS = {
  nurse:   { email: 'nurse@email.com',   password: 'nursePassword123' },
  doctor:  { email: 'doctor@email.com',  password: 'doctorPassword123' },
  admin:   { email: 'admin@email.com',   password: 'adminPassword123' },
  patient: { email: 'patient@email.com', password: 'patientPassword123' },
};

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [selRole, setSelRole]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const quick = (role) => {
    setSelRole(role);
    setEmail(QUICK_CREDS[role].email);
    setPassword(QUICK_CREDS[role].password);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.login(email, password);
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp">
      {/* Brand panel */}
      <div className="lp-brand">
        <div className="lp-logo">
          <div className="sb-mark" style={{ width: 46, height: 46, fontSize: 23 }}>E</div>
          <div>
            <b>E-Cliniq</b>
            <span>Campus Health</span>
          </div>
        </div>
        <div className="lp-copy">
          <h1>Care that keeps the campus running.</h1>
          <p>Appointments, medical records, and medicine inventory — one calm, connected workspace for your clinic team.</p>
          <div className="lp-stats">
            <div><b>1,240+</b><span>Records managed</span></div>
            <div><b>8</b><span>Daily open slots</span></div>
            <div><b>4</b><span>Team roles</span></div>
          </div>
        </div>
        <div className="lp-glow lp-g1" />
        <div className="lp-glow lp-g2" />
      </div>

      {/* Form panel */}
      <div className="lp-form-wrap">
        <div className="lp-card">
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.02em' }}>Welcome back</h2>
            <p style={{ color: 'var(--muted)', marginTop: 6, fontSize: 15 }}>Sign in to your clinic workspace.</p>
          </div>

          <div className="lp-roles">
            {Object.entries(ROLES).map(([key, r]) => (
              <button
                key={key}
                type="button"
                onClick={() => quick(key)}
                className={`lp-chip ${selRole === key ? 'sel' : ''}`}
                style={{ '--role-c': r.hex }}
              >
                <span className="lp-dot" />
                {r.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 22 }}>
            Pick a role to autofill demo credentials, or type your own.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Email</label>
              <div className="search">
                <FaEnvelope />
                <input
                  className="input"
                  type="email"
                  value={email}
                  placeholder="you@email.com"
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="field" style={{ marginBottom: 8 }}>
              <label>Password</label>
              <input
                className="input"
                type="password"
                value={password}
                placeholder="••••••••"
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="login-err">
                <FaExclamationCircle size={16} />{error}
              </div>
            )}

            <button
              className="btn btn-primary btn-lg btn-block"
              type="submit"
              disabled={loading}
              style={{ marginTop: 18 }}
            >
              {loading ? 'Signing in…' : <><span>Sign in</span><FaArrowRight size={16} /></>}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 12, marginTop: 28 }}>
            Version 2.0 · © 2026 E-Cliniq
          </p>
        </div>
      </div>

      <style>{`
        .lp { min-height: 100vh; display: grid; grid-template-columns: 1.05fr 1fr; background: var(--bg); }
        .lp-brand {
          position: relative; overflow: hidden; padding: 48px;
          background: linear-gradient(165deg, var(--royal-700) 0%, var(--royal-900) 100%);
          color: #fff; display: flex; flex-direction: column; justify-content: space-between;
        }
        .lp-logo { display: flex; align-items: center; gap: 14px; }
        .lp-logo b { display: block; font-size: 22px; font-weight: 800; }
        .lp-logo span { display: block; font-size: 12px; color: var(--gold-200); font-weight: 600; letter-spacing: .05em; text-transform: uppercase; }
        .lp-copy { position: relative; z-index: 2; max-width: 460px; }
        .lp-copy h1 { font-size: clamp(28px, 3.2vw, 44px); font-weight: 800; line-height: 1.08; letter-spacing: -.025em; }
        .lp-copy p { margin-top: 18px; font-size: 17px; line-height: 1.55; color: #c7d0f5; }
        .lp-stats { display: flex; gap: 36px; margin-top: 40px; }
        .lp-stats b { display: block; font-size: 30px; font-weight: 800; color: var(--gold-400); letter-spacing: -.02em; }
        .lp-stats span { font-size: 12.5px; color: #aeb8e6; font-weight: 500; }
        .lp-glow { position: absolute; border-radius: 50%; filter: blur(70px); }
        .lp-g1 { width: 360px; height: 360px; background: var(--gold-500); top: -120px; right: -90px; opacity: .28; }
        .lp-g2 { width: 300px; height: 300px; background: var(--royal-400); bottom: -100px; left: -60px; opacity: .35; }
        .lp-form-wrap { display: grid; place-items: center; padding: 40px; }
        .lp-card { width: 100%; max-width: 400px; }
        .lp-roles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .lp-chip {
          display: flex; align-items: center; gap: 9px; padding: 13px 15px;
          border: 1.5px solid var(--line); border-radius: var(--r-sm); background: var(--surface);
          font-size: 14.5px; font-weight: 700; color: var(--ink-soft); transition: all .15s;
        }
        .lp-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--role-c); flex: 0 0 10px; }
        .lp-chip:hover { border-color: var(--role-c); background: color-mix(in srgb, var(--role-c) 6%, var(--surface)); }
        .lp-chip.sel { border-color: var(--role-c); background: color-mix(in srgb, var(--role-c) 12%, var(--surface)); color: var(--role-c); box-shadow: 0 0 0 3px color-mix(in srgb, var(--role-c) 14%, transparent); }
        .login-err { display: flex; align-items: center; gap: 8px; margin-top: 14px; padding: 11px 14px;
          background: var(--danger-bg); color: var(--danger); border-radius: var(--r-sm); font-size: 13.5px; font-weight: 600; }
        @media (max-width: 860px) {
          .lp { grid-template-columns: 1fr; }
          .lp-brand { display: none; }
        }
      `}</style>
    </div>
  );
}

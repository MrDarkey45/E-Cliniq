import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { appointmentsAPI, medicalRecordsAPI, inventoryAPI } from '../services/api';
import { Stat, Avatar, RoleTag, Empty } from './ui';
import {
  FaCalendarAlt, FaClock, FaFileAlt, FaPills, FaExclamationTriangle,
  FaPlus, FaArrowRight, FaCheckCircle, FaUser, FaBolt,
} from 'react-icons/fa';

// ── Shared constants (keep in sync with AppointmentScheduler) ─────────────────
const SLOT_TIMES = [
  '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30',
];
const SERVICES   = [
  { name: 'General Consultation', color: '#2a4bd0' },
  { name: 'Dental Checkup',       color: '#0e9b86' },
  { name: 'Vaccination',          color: '#d4920f' },
  { name: 'Physical Exam',        color: '#7a5ae0' },
  { name: 'Mental Health',        color: '#e0724a' },
  { name: 'Follow-up Visit',      color: '#3aa0c8' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const iso       = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
const localDate = (s) => new Date(s + 'T00:00');
const fmt12     = (t) => { const [h, m] = t.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`; };
const svcColor  = (name) => SERVICES.find(s => s.name === name)?.color || 'var(--primary)';
const parseMeds = (val) => { if (!val) return []; if (Array.isArray(val)) return val; try { return JSON.parse(val); } catch { return []; } };
const firstName = (name = '') => name.replace(/^Dr\.\s*/, '').split(' ')[0];
const greeting  = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

// ── SectionCard ───────────────────────────────────────────────────────────────
function SectionCard({ title, sub, action, children, icon: Icon }) {
  return (
    <div className="card">
      <div className="card-head">
        {Icon && (
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--royal-50)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
            <Icon size={16} />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <h3>{title}</h3>
          {sub && <div className="sub">{sub}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard({ onNav }) {
  const { user }  = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [records,      setRecords]      = useState([]);
  const [inventory,    setInventory]    = useState([]);
  const [loading,      setLoading]      = useState(true);

  const isPatient = user.role === 'patient';
  const todayIso  = iso(new Date());
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const basePromises = [
          isPatient ? appointmentsAPI.getForPatient(user.email) : appointmentsAPI.getAll(),
          medicalRecordsAPI.getAll(),
        ];
        const results = await Promise.all(
          isPatient ? basePromises : [...basePromises, inventoryAPI.getAll()]
        );
        setAppointments(results[0]);
        setRecords(results[1]);
        if (!isPatient) setInventory(results[2]);
      } catch {
        toast('Failed to load dashboard', 'danger');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────────
  const upcoming  = appointments.filter(a => a.date >= todayIso).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const todays    = appointments.filter(a => a.date === todayIso).sort((a, b) => a.time.localeCompare(b.time));
  const openToday = SLOT_TIMES.filter(t => !todays.some(a => a.time === t)).length;
  const lowStock  = inventory.filter(m => m.quantity < 10);
  const activePrescriptions = records.reduce((n, r) => n + parseMeds(r.prescribedMedicines).length, 0);

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="dash-hero">
        <div className="dh-text">
          <div className="dh-date"><FaCalendarAlt size={13} />{dateLabel}</div>
          <h2>{greeting()}, {firstName(user.name)}.</h2>
          <p>{isPatient
            ? "Here's a look at your upcoming visits and care summary."
            : "Here's what's happening across the clinic today."}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <button className="btn btn-gold" onClick={() => onNav('appointments')}>
              <FaPlus />{isPatient ? 'Book an appointment' : 'New appointment'}
            </button>
            {!isPatient && (
              <button className="btn btn-ghost"
                style={{ background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.25)' }}
                onClick={() => onNav('records')}>
                <FaFileAlt size={14} />View records
              </button>
            )}
          </div>
        </div>
        <div className="dh-badge"><RoleTag role={user.role} /></div>
        <div className="dh-glow" />
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <div className="dash-stats">
        {isPatient ? (
          <>
            <Stat label="Upcoming visits"      value={upcoming.length}                                                    icon={<FaCalendarAlt />}        tone="blue" />
            <Stat label="Past visits"          value={appointments.filter(a => a.date < todayIso).length}                icon={<FaClock />}              tone="gold" />
            <Stat label="My records"           value={records.length}                                                     icon={<FaFileAlt />}            tone="green" />
            <Stat label="Active prescriptions" value={activePrescriptions}                                                icon={<FaPills />}              tone="coral" />
          </>
        ) : (
          <>
            <Stat label="Appointments today" value={todays.length}   icon={<FaCalendarAlt />}        tone="blue" />
            <Stat label="Open slots today"   value={openToday}       icon={<FaClock />}              tone="green"                          delta={`of ${SLOT_TIMES.length} daily slots`} />
            <Stat label="Patient records"    value={records.length}  icon={<FaFileAlt />}            tone="gold" />
            <Stat label="Low-stock items"    value={lowStock.length} icon={<FaExclamationTriangle />} tone={lowStock.length ? 'coral' : 'green'} delta={lowStock.length ? 'needs restock' : 'all good'} />
          </>
        )}
      </div>

      {/* ── Two-column body ───────────────────────────────────────────────── */}
      <div className="dash-cols">

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>

          {/* Today's schedule / Upcoming visits */}
          <SectionCard
            icon={FaCalendarAlt}
            title={isPatient ? 'Your upcoming appointments' : "Today's schedule"}
            sub={isPatient ? `${upcoming.length} scheduled` : dateLabel}
            action={
              <button className="btn btn-soft btn-sm" onClick={() => onNav('appointments')}>
                View all<FaArrowRight size={12} />
              </button>
            }
          >
            <div className="sched-list">
              {(isPatient ? upcoming : todays).length === 0 ? (
                <Empty
                  icon={<FaCalendarAlt />}
                  title={isPatient ? 'No upcoming visits' : 'No appointments today'}
                  text={isPatient ? 'Book a slot to get started.' : 'Enjoy the calm — the day is clear.'}
                />
              ) : (
                (isPatient ? upcoming : todays).slice(0, 5).map(a => (
                  <div className="sched-row" key={a.id}>
                    <div className="sched-time">
                      <b>{fmt12(a.time).split(' ')[0]}</b>
                      <span>{fmt12(a.time).split(' ')[1]}</span>
                    </div>
                    <div className="sched-bar" style={{ background: svcColor(a.service) }} />
                    <div className="sched-main">
                      <b>{isPatient ? a.service : a.clientName}</b>
                      <span>{isPatient
                        ? localDate(a.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                        : a.service}
                      </span>
                    </div>
                    {!isPatient && <Avatar name={a.clientName} role="patient" size={32} ring={false} />}
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          {/* Recent records (staff only) */}
          {!isPatient && (
            <SectionCard
              icon={FaFileAlt}
              title="Recent records"
              sub="Latest clinical updates"
              action={
                <button className="btn btn-soft btn-sm" onClick={() => onNav('records')}>
                  Open<FaArrowRight size={12} />
                </button>
              }
            >
              <div className="sched-list">
                {records.length === 0 ? (
                  <Empty icon={<FaFileAlt />} title="No records yet" text="Create a record to begin tracking patients." />
                ) : (
                  records.slice(-4).reverse().map(r => {
                    const meds = parseMeds(r.prescribedMedicines);
                    return (
                      <div className="sched-row" key={r.id}>
                        <Avatar name={r.patientName} role="patient" size={36} ring={false} />
                        <div className="sched-main" style={{ flex: 1 }}>
                          <b>{r.patientName}</b>
                          <span>{r.diagnosis || 'Record on file'}</span>
                        </div>
                        {meds.length > 0 && (
                          <span className="badge badge-blue"><FaPills size={10} />{meds.length}</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>

          {/* Care summary (patient) / Inventory alerts (staff) */}
          {isPatient ? (
            <SectionCard icon={FaUser} title="Care summary">
              <div className="card-pad">
                {records.length === 0 ? (
                  <Empty icon={<FaFileAlt />} title="No records yet" text="Your visits will appear here once seen by clinic staff." />
                ) : (() => {
                  const r    = records[records.length - 1];
                  const meds = parseMeds(r.prescribedMedicines);
                  return (
                    <div>
                      <div className="db-kv"><span>Latest diagnosis</span><b>{r.diagnosis || '—'}</b></div>
                      <div className="db-kv"><span>Allergies</span><b>{r.allergies || 'None known'}</b></div>
                      <div className="db-kv" style={{ borderBottom: 'none' }}>
                        <span>Follow-up</span>
                        <b>{r.followUpDate ? localDate(r.followUpDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</b>
                      </div>
                      {meds.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>Prescriptions</div>
                          <div>
                            {meds.map((m, i) => (
                              <span key={i} className="rx-pill"><FaPills size={11} />{m.name} {m.dosage}{m.unit} · ×{m.quantity}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </SectionCard>
          ) : (
            <SectionCard
              icon={FaExclamationTriangle}
              title="Inventory alerts"
              sub={lowStock.length ? `${lowStock.length} item${lowStock.length !== 1 ? 's' : ''} running low` : 'All stocked'}
              action={
                <button className="btn btn-soft btn-sm" onClick={() => onNav('inventory')}>
                  Manage
                </button>
              }
            >
              <div className="sched-list">
                {lowStock.length === 0 ? (
                  <Empty icon={<FaCheckCircle />} title="Fully stocked" text="No medicines below threshold." />
                ) : (
                  lowStock.map(m => (
                    <div className="sched-row" key={m.id}>
                      <div className="low-ico"><FaPills size={15} /></div>
                      <div className="sched-main" style={{ flex: 1 }}>
                        <b>{m.name}</b>
                        <span>{m.dosage}{m.unit} · per unit</span>
                      </div>
                      <span className="badge badge-danger">{m.quantity} left</span>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
          )}

          {/* Quick actions */}
          <SectionCard icon={FaBolt} title="Quick actions">
            <div className="qa-grid">
              <button className="qa" onClick={() => onNav('appointments')}>
                <span className="qa-ic" style={{ background: 'var(--gold-100)', color: 'var(--gold-600)' }}><FaPlus size={16} /></span>
                {isPatient ? 'Book visit' : 'Schedule'}
              </button>
              <button className="qa" onClick={() => onNav(isPatient ? 'appointments' : 'records')}>
                <span className="qa-ic" style={{ background: 'var(--royal-50)', color: 'var(--primary)' }}>
                  {isPatient ? <FaCalendarAlt size={16} /> : <FaFileAlt size={16} />}
                </span>
                {isPatient ? 'My schedule' : 'New record'}
              </button>
              <button className="qa" onClick={() => onNav(isPatient ? 'records' : 'inventory')}>
                <span className="qa-ic" style={{ background: 'var(--ok-bg)', color: 'var(--ok)' }}>
                  {isPatient ? <FaFileAlt size={16} /> : <FaPills size={16} />}
                </span>
                {isPatient ? 'My records' : 'Inventory'}
              </button>
            </div>
          </SectionCard>
        </div>
      </div>

      <style>{`
        .dash-hero {
          position: relative; overflow: hidden; border-radius: var(--r-lg);
          background: linear-gradient(135deg, var(--royal-700), var(--royal-900)); color: #fff;
          padding: 32px 34px; display: flex; align-items: flex-start; justify-content: space-between; gap: 20px;
        }
        .dh-date { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; color: var(--gold-200); white-space: nowrap; }
        .dh-text h2 { font-size: clamp(22px, 2.4vw, 30px); font-weight: 800; letter-spacing: -.025em; margin-top: 10px; }
        .dh-text p  { color: #c7d0f5; margin-top: 6px; font-size: 15px; max-width: 480px; }
        .dh-badge .role-tag { background: rgba(255,255,255,.16); color: #fff; }
        .dh-glow { position: absolute; width: 320px; height: 320px; border-radius: 50%; background: var(--gold-500); filter: blur(80px); opacity: .22; top: -140px; right: -40px; pointer-events: none; }
        .dash-cols { display: grid; grid-template-columns: 1.5fr 1fr; gap: var(--gap); align-items: start; }
        .sched-list { padding: 8px 10px 12px; display: flex; flex-direction: column; }
        .sched-row  { display: flex; align-items: center; gap: 13px; padding: 11px 12px; border-radius: var(--r-sm); transition: background .12s; }
        .sched-row:hover { background: var(--surface-2); }
        .sched-time { width: 52px; text-align: center; flex: 0 0 52px; }
        .sched-time b { display: block; font-size: 16px; font-weight: 800; letter-spacing: -.02em; }
        .sched-time span { font-size: 10.5px; font-weight: 700; color: var(--muted); }
        .sched-bar  { width: 4px; align-self: stretch; border-radius: 4px; min-height: 34px; flex: 0 0 4px; }
        .sched-main { display: flex; flex-direction: column; min-width: 0; flex: 1; }
        .sched-main b    { font-size: 14.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sched-main span { font-size: 12.5px; color: var(--muted); }
        .low-ico { width: 38px; height: 38px; border-radius: 11px; background: var(--danger-bg); color: var(--danger); display: grid; place-items: center; flex: 0 0 38px; }
        .db-kv { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--line-soft); font-size: 13.5px; }
        .db-kv span { color: var(--muted); }
        .db-kv b { font-weight: 700; text-align: right; max-width: 60%; }
        .rx-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--primary); background: var(--royal-50); padding: 6px 11px; border-radius: var(--r-pill); margin: 0 6px 6px 0; }
        .qa-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: var(--gap); }
        .qa { display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 16px 8px; border: 1px solid var(--line); border-radius: var(--r-md); background: var(--surface); font-size: 13px; font-weight: 700; color: var(--ink-soft); transition: all .15s; }
        .qa:hover { border-color: var(--royal-100); background: var(--surface-2); transform: translateY(-2px); }
        .qa-ic { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; flex: 0 0 42px; }
        @media (max-width: 1080px) { .dash-cols { grid-template-columns: 1fr; } }
        @media (max-width: 680px) { .dh-badge { display: none; } }
      `}</style>
    </div>
  );
}

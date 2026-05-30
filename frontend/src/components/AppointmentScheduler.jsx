import { useState, useEffect, Fragment } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { appointmentsAPI, patientsAPI } from '../services/api';
import { Avatar, Empty, Modal, ModalHead, Confirm } from './ui';
import {
  FaCalendarAlt, FaChevronLeft, FaChevronRight, FaClock,
  FaPlus, FaCheck, FaExclamationCircle, FaEnvelope, FaIdCard,
  FaUser, FaTrash, FaTimes, FaMapMarkerAlt, FaSearch, FaFileAlt,
} from 'react-icons/fa';

// ── Constants ─────────────────────────────────────────────────────────────────
const SLOT_TIMES = [
  '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30',
];
const SERVICES = [
  { name: 'General Consultation', color: '#2a4bd0' },
  { name: 'Dental Checkup',       color: '#0e9b86' },
  { name: 'Vaccination',          color: '#d4920f' },
  { name: 'Physical Exam',        color: '#7a5ae0' },
  { name: 'Mental Health',        color: '#e0724a' },
  { name: 'Follow-up Visit',      color: '#3aa0c8' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const iso = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
};
const addDays   = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d) => {
  const x = new Date(d); const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x;
};
const fmt12 = (t) => {
  const [h, m] = t.split(':').map(Number);
  return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;
};
const fmtId = (v) => { const n = v.replace(/\D/g,''); return n.length > 4 ? n.slice(0,4)+'-'+n.slice(4,9) : n; };
const localDate = (s) => new Date(s + 'T00:00');
const svcColor  = (name) => SERVICES.find(s => s.name === name)?.color || 'var(--primary)';

const canBook   = (role) => ['nurse', 'admin', 'patient'].includes(role);
const canManage = (role) => role === 'nurse' || role === 'admin';

// Derived status: Cancelled (explicit) · Completed (slot time has passed) · Scheduled (upcoming)
const apptStatus = (appt) => {
  if (appt.status === 'Cancelled') return 'Cancelled';
  const slot = new Date(`${appt.date}T${appt.time}:00`);
  return slot < new Date() ? 'Completed' : 'Scheduled';
};
const STATUS_BADGE = {
  Scheduled: 'badge-blue',
  Completed: 'badge-ok',
  Cancelled: 'badge-muted',
};

const calcAge = (dob) => {
  if (!dob) return '';
  const [y] = dob.split('-').map(Number);
  return String(new Date().getFullYear() - y);
};

// ── BookingModal ──────────────────────────────────────────────────────────────
function BookingModal({ user, takenSlots, presetDate, presetTime, onClose, onSaved }) {
  const { toast } = useToast();
  const isPatient = user.role === 'patient';
  const todayIso  = iso(new Date());

  const [date, setDate]       = useState(presetDate || todayIso);
  const [time, setTime]       = useState(presetTime || '');
  const [service, setService] = useState('');
  const [form, setForm]       = useState({
    clientName: isPatient ? user.name                           : '',
    email:      isPatient ? user.email                          : '',
    idNumber:   isPatient ? (user.patientProfile?.id_number || '') : '',
    age:        isPatient ? calcAge(user.patientProfile?.dob)   : '',
    gender:     isPatient ? (user.patientProfile?.gender || '')  : '',
  });
  const [err, setErr]         = useState('');
  const [saving, setSaving]   = useState(false);

  // Patient lookup (staff only)
  const [patQ, setPatQ]               = useState('');
  const [patResults, setPatResults]   = useState([]);
  const [lookupOpen, setLookupOpen]   = useState(false);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: k === 'idNumber' ? fmtId(v) : v }));

  // Next 10 days from today (skip Sundays for staff, patients can see all)
  const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i))
    .filter(d => d.getDay() !== 0)  // skip Sundays
    .slice(0, 10);

  // Slot availability: use takenSlots (comes from availability endpoint for patients,
  // derived from full appointments list for staff)
  const dayTaken = takenSlots.filter(s => s.date === date);
  const slotInfo = SLOT_TIMES.map(t => ({ t, taken: dayTaken.some(s => s.time === t) }));

  // Patient lookup handler
  const handlePatLookup = async (q) => {
    setPatQ(q);
    upd('clientName', q);
    if (q.length < 2) { setPatResults([]); setLookupOpen(false); return; }
    try {
      const results = await patientsAPI.search(q);
      setPatResults(results);
      setLookupOpen(results.length > 0);
    } catch {}
  };

  const selectPatient = (p) => {
    setForm({
      clientName: p.name,
      email:      p.email,
      idNumber:   p.id_number || '',
      age:        calcAge(p.dob),
      gender:     p.gender || '',
    });
    setPatQ(p.name);
    setLookupOpen(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!time)    { setErr('Please pick an available time slot.'); return; }
    if (!service) { setErr('Please choose a service.'); return; }
    setSaving(true);
    setErr('');
    try {
      await appointmentsAPI.create({
        date, time, service,
        clientName: form.clientName,
        email:      form.email    || undefined,
        idNumber:   form.idNumber || undefined,
        age:        form.age      ? parseInt(form.age) : undefined,
        gender:     form.gender   || undefined,
      });
      toast('Appointment booked!', 'ok');
      onSaved();
      onClose();
    } catch (err) {
      setErr(err.conflictData
        ? 'That slot was just taken — please pick another time.'
        : (err.message || 'Failed to book appointment.'));
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} wide>
      <ModalHead
        icon={<FaCalendarAlt />}
        title={isPatient ? 'Book an appointment' : 'New appointment'}
        onClose={onClose}
        accent="var(--gold-600)"
      />
      <form onSubmit={submit}>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* 1 — Date */}
          <div>
            <div className="bk-label">1 · Choose a day</div>
            <div className="day-strip">
              {days.map(d => {
                const di = iso(d); const sel = di === date;
                return (
                  <button type="button" key={di} className={`day-pill ${sel ? 'sel' : ''}`}
                    onClick={() => { setDate(di); setTime(''); }}>
                    <span className="dp-dow">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="dp-num">{d.getDate()}</span>
                    <span className="dp-mon">{di === todayIso ? 'Today' : d.toLocaleDateString('en-US', { month: 'short' })}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2 — Slots */}
          <div>
            <div className="bk-label">
              2 · Pick an open slot
              <span className="bk-hint">8:00 AM – 4:30 PM · 30-minute visits</span>
            </div>
            <div className="slot-grid">
              {slotInfo.map(({ t, taken }) => (
                <button type="button" key={t}
                  className={`slot ${time === t ? 'sel' : ''} ${taken ? 'taken' : ''}`}
                  disabled={taken}
                  onClick={() => !taken && setTime(t)}>
                  {taken ? <FaTimes size={13} /> : <FaClock size={13} />}
                  <span>{fmt12(t)}</span>
                  <em>{taken ? 'Booked' : 'Open'}</em>
                </button>
              ))}
            </div>
          </div>

          {/* 3 — Service */}
          <div>
            <div className="bk-label">3 · Service</div>
            <div className="svc-grid">
              {SERVICES.map(s => (
                <button type="button" key={s.name}
                  className={`svc ${service === s.name ? 'sel' : ''}`}
                  style={{ '--svc-c': s.color }}
                  onClick={() => setService(s.name)}>
                  <span className="svc-dot" />{s.name}
                </button>
              ))}
            </div>
          </div>

          {/* 4 — Patient details */}
          <div>
            <div className="bk-label">4 · {isPatient ? 'Confirm your details' : 'Patient details'}</div>

            {/* Patient lookup for staff */}
            {!isPatient && (
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <div className="search">
                  <FaSearch />
                  <input className="input" placeholder="Search existing patient by name, ID, or email…"
                    value={patQ} onChange={e => handlePatLookup(e.target.value)}
                    autoComplete="off" />
                </div>
                {lookupOpen && (
                  <div className="pat-dropdown">
                    {patResults.map(p => (
                      <button key={p.id} type="button" className="pat-result"
                        onClick={() => selectPatient(p)}>
                        <b>{p.name}</b>
                        <span>{p.id_number} · {p.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="form-grid">
              <div className="field">
                <label>Full name</label>
                <input className="input" value={form.clientName}
                  onChange={e => { upd('clientName', e.target.value); if (!isPatient) setPatQ(e.target.value); }}
                  placeholder="Patient name" readOnly={isPatient} required />
              </div>
              <div className="field">
                <label>Email</label>
                <input className="input" type="email" value={form.email}
                  onChange={e => upd('email', e.target.value)}
                  placeholder="name@email.com" readOnly={isPatient} />
              </div>
              <div className="field">
                <label>ID number</label>
                <input className="input" value={form.idNumber}
                  onChange={e => upd('idNumber', e.target.value)}
                  placeholder="2021-30001" maxLength={10} readOnly={isPatient} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 12 }}>
                <div className="field">
                  <label>Age</label>
                  <input className="input" type="number" value={form.age}
                    onChange={e => upd('age', e.target.value)} placeholder="21" min="0" max="120" />
                </div>
                <div className="field">
                  <label>Gender</label>
                  <select className="select" value={form.gender} onChange={e => upd('gender', e.target.value)}>
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {err && (
            <div className="login-err" style={{ marginTop: 0 }}>
              <FaExclamationCircle size={14} />{err}
            </div>
          )}
        </div>

        <div className="modal-foot">
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--muted)', fontWeight: 600 }}>
            {date && time
              ? <><FaCheck size={13} style={{ color: 'var(--ok)' }} />
                  {localDate(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {fmt12(time)}
                </>
              : 'No slot selected yet'}
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-gold" disabled={saving}>
            <FaCheck />{isPatient ? 'Confirm booking' : 'Create appointment'}
          </button>
        </div>
      </form>

      <style>{`
        .bk-label { font-size: 13.5px; font-weight: 800; color: var(--ink); margin-bottom: 11px; }
        .bk-hint  { font-size: 11.5px; font-weight: 600; color: var(--muted); margin-left: 8px; }
        .day-strip { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
        .day-pill  { flex: 0 0 auto; width: 60px; padding: 9px 0; border: 1.5px solid var(--line); border-radius: var(--r-sm); background: var(--surface); display: flex; flex-direction: column; align-items: center; gap: 1px; transition: all .14s; }
        .day-pill:hover { border-color: var(--royal-400); }
        .day-pill.sel   { border-color: var(--primary); background: var(--royal-50); }
        .dp-dow { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; }
        .day-pill.sel .dp-dow, .day-pill.sel .dp-mon { color: var(--primary); }
        .dp-num { font-size: 20px; font-weight: 800; letter-spacing: -.02em; }
        .day-pill.sel .dp-num { color: var(--primary); }
        .dp-mon { font-size: 10px; font-weight: 700; color: var(--faint); }
        .slot-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .slot { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 10px 6px;
          border: 1.5px solid var(--line); border-radius: var(--r-sm); background: var(--surface); color: var(--ink); transition: all .14s; }
        .slot svg { color: var(--ok); }
        .slot span { font-size: 13px; font-weight: 700; white-space: nowrap; line-height: 1.1; }
        .slot em   { font-size: 10px; font-style: normal; font-weight: 700; color: var(--ok); text-transform: uppercase; letter-spacing: .04em; }
        .slot:hover:not(.taken):not(.sel) { border-color: var(--primary); }
        .slot.sel  { border-color: var(--primary); background: var(--royal-600); }
        .slot.sel svg, .slot.sel span, .slot.sel em { color: #fff; }
        .slot.taken { background: var(--line-soft); border-color: transparent; cursor: not-allowed; opacity: .7; }
        .slot.taken svg, .slot.taken em { color: var(--faint); }
        .slot.taken span { color: var(--muted); }
        .svc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
        .svc { display: flex; align-items: center; gap: 9px; padding: 11px 14px; border: 1.5px solid var(--line);
          border-radius: var(--r-sm); background: var(--surface); color: var(--ink-soft); font-size: 13px; font-weight: 700; text-align: left; transition: all .14s; }
        .svc-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--svc-c); flex: 0 0 10px; }
        .svc:hover { border-color: var(--svc-c); }
        .svc.sel   { border-color: var(--svc-c); background: color-mix(in srgb, var(--svc-c) 9%, var(--surface)); color: var(--svc-c); }
        .pat-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 50;
          background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-md); box-shadow: var(--shadow-lg); overflow: hidden; }
        .pat-result { width: 100%; display: flex; flex-direction: column; gap: 2px; padding: 10px 14px; border: none;
          background: none; text-align: left; transition: background .12s; cursor: pointer; }
        .pat-result:hover { background: var(--surface-2); }
        .pat-result b { font-size: 14px; font-weight: 700; color: var(--ink); }
        .pat-result span { font-size: 12px; color: var(--muted); }
        @media (max-width: 620px) { .slot-grid { grid-template-columns: 1fr 1fr; } .svc-grid { grid-template-columns: 1fr 1fr; } }
      `}</style>
    </Modal>
  );
}

// ── DayDetail ─────────────────────────────────────────────────────────────────
function DayDetail({ date, user, appointments, takenSlots, onClose, onBook, onOpenAppt }) {
  const dayAppts   = appointments.filter(a => a.date === date);
  const isPatient  = user.role === 'patient';
  const todayIso   = iso(new Date());
  const isPast     = date < todayIso;
  const mine       = (a) => a.email === user.email;

  // For the agenda: a slot is "taken" if it's in dayAppts (staff) OR in takenSlots (patient)
  const isTaken = (t) => {
    if (dayAppts.some(a => a.time === t)) return true;
    if (isPatient) return takenSlots.some(s => s.date === date && s.time === t);
    return false;
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-head" style={{
        background: 'linear-gradient(135deg, var(--royal-700), var(--royal-900))',
        color: '#fff', borderBottom: 'none',
      }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(255,255,255,.16)', display: 'grid', placeItems: 'center' }}>
          <span style={{ fontSize: 19, fontWeight: 800 }}>{localDate(date).getDate()}</span>
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ color: '#fff' }}>{localDate(date).toLocaleDateString('en-US', { weekday: 'long' })}</h2>
          <div style={{ fontSize: 13, color: '#c7d0f5', fontWeight: 600 }}>
            {localDate(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
        <button className="icon-btn" onClick={onClose}
          style={{ background: 'rgba(255,255,255,.14)', border: 'none', color: '#fff' }}>
          <FaTimes />
        </button>
      </div>

      <div className="modal-body" style={{ padding: 16, maxHeight: '58vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SLOT_TIMES.map(t => {
            const appt     = dayAppts.find(a => a.time === t);
            const ownVisit = appt && mine(appt);
            const taken    = isTaken(t);
            // Patient sees Unavailable for taken slots that aren't theirs
            const hidePii  = isPatient && taken && !ownVisit;
            const c        = appt ? svcColor(appt.service) : null;

            return (
              <div key={t} className="agenda-row">
                <div className="ag-time">{fmt12(t)}</div>
                {taken || appt ? (
                  <div className="ag-appt" style={{ '--svc-c': c || 'var(--faint)' }}
                    onClick={() => appt && !hidePii && onOpenAppt(appt)}
                    role={appt && !hidePii ? 'button' : undefined}>
                    <span className="ag-bar" />
                    {hidePii || !appt ? (
                      <div className="ag-main">
                        <b style={{ color: 'var(--muted)' }}>Unavailable</b>
                        <span>Slot is booked</span>
                      </div>
                    ) : (
                      <>
                        <Avatar name={appt.clientName} role="patient" size={32} ring={false} />
                        <div className="ag-main">
                          <b>
                            {appt.clientName}
                            {ownVisit && <span className="badge badge-gold" style={{ marginLeft: 8 }}>You</span>}
                          </b>
                          <span>{appt.service}</span>
                        </div>
                        <FaChevronRight size={13} style={{ color: 'var(--faint)', flexShrink: 0 }} />
                      </>
                    )}
                  </div>
                ) : (
                  <button className="ag-open"
                    disabled={isPast || !canBook(user.role)}
                    onClick={() => onBook(t)}>
                    <FaPlus size={13} />
                    {isPast ? 'Past slot' : 'Open — book this slot'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .agenda-row { display: flex; align-items: stretch; gap: 12px; }
        .ag-time { flex: 0 0 76px; font-size: 13px; font-weight: 700; color: var(--muted); display: flex; align-items: center; }
        .ag-appt { flex: 1; display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: var(--r-sm);
          background: color-mix(in srgb, var(--svc-c) 7%, var(--surface));
          border: 1px solid color-mix(in srgb, var(--svc-c) 22%, transparent); transition: all .14s; }
        .ag-appt[role="button"] { cursor: pointer; }
        .ag-appt[role="button"]:hover { background: color-mix(in srgb, var(--svc-c) 13%, var(--surface)); }
        .ag-bar  { width: 4px; align-self: stretch; border-radius: 4px; background: var(--svc-c); flex: 0 0 4px; }
        .ag-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .ag-main b    { font-size: 14px; font-weight: 700; }
        .ag-main span { font-size: 12.5px; color: var(--muted); }
        .ag-open { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px;
          border-radius: var(--r-sm); border: 1.5px dashed var(--line); background: var(--surface-2);
          color: var(--primary); font-weight: 700; font-size: 13px; transition: all .14s; }
        .ag-open:hover:not(:disabled) { border-color: var(--primary); background: var(--royal-50); }
        .ag-open:disabled { color: var(--faint); cursor: not-allowed; }
      `}</style>
    </Modal>
  );
}

// ── ApptDetail ────────────────────────────────────────────────────────────────
function ApptDetail({ appt, user, onClose, onDeleted, onOpenRecord }) {
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const c = svcColor(appt.service);

  const status    = apptStatus(appt);
  const isOwnAppt = appt.email === user.email;
  // Only upcoming (Scheduled) appointments can be cancelled
  const canCancel = status === 'Scheduled' && (canManage(user.role) || (user.role === 'patient' && isOwnAppt));
  // Staff can jump to the patient's record to complete/fill their visit
  const canOpenRecord = canManage(user.role) || user.role === 'doctor';

  const handleCancel = async () => {
    try {
      await appointmentsAPI.delete(appt.id);
      toast('Appointment cancelled', 'ok');
      onDeleted(appt.id);
      onClose();
    } catch (err) {
      toast(err.message || 'Failed to cancel appointment', 'danger');
    }
  };

  const rows = [
    { icon: <FaEnvelope />, label: 'Email',        val: appt.email },
    { icon: <FaIdCard />,   label: 'ID number',    val: appt.idNumber },
    { icon: <FaUser />,     label: 'Age / Gender', val: [appt.age && `${appt.age} yrs`, appt.gender].filter(Boolean).join(' · ') },
  ].filter(r => r.val);

  return (
    <>
      <Modal onClose={onClose}>
        <ModalHead icon={<FaCalendarAlt />} title="Appointment" onClose={onClose} accent={c} />
        <div className="modal-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <Avatar name={appt.clientName} role="patient" size={52} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.02em' }}>{appt.clientName}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <span className="badge" style={{ background: `color-mix(in srgb, ${c} 14%, transparent)`, color: c, display: 'inline-flex' }}>
                  {appt.service}
                </span>
                <span className={`badge ${STATUS_BADGE[status]}`}>{status}</span>
              </div>
            </div>
          </div>

          <div className="appt-when">
            <div>
              <FaCalendarAlt style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <div>
                <span>Date</span>
                <b>{localDate(appt.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</b>
              </div>
            </div>
            <div>
              <FaClock style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <div><span>Time</span><b>{fmt12(appt.time)}</b></div>
            </div>
          </div>

          {rows.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column' }}>
              {rows.map(r => (
                <div key={r.label} className="kv" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'var(--muted)' }}>{r.icon}</span>
                  <span style={{ flex: 1, color: 'var(--muted)' }}>{r.label}</span>
                  <b>{r.val}</b>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-foot">
          {canCancel && (
            <button className="btn btn-danger" onClick={() => setConfirm(true)}>
              <FaTrash size={13} />
              {user.role === 'patient' ? 'Cancel my appointment' : 'Cancel appointment'}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          {canOpenRecord && onOpenRecord && (
            <button className="btn btn-primary" onClick={() => { onOpenRecord(appt); onClose(); }}>
              <FaFileAlt size={13} />Open patient record
            </button>
          )}
        </div>

        <style>{`
          .appt-when { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .appt-when > div { display: flex; align-items: center; gap: 11px; padding: 14px; background: var(--surface-2); border-radius: var(--r-sm); border: 1px solid var(--line-soft); }
          .appt-when span { font-size: 11.5px; color: var(--muted); font-weight: 600; display: block; }
          .appt-when b    { font-size: 14px; font-weight: 700; }
        `}</style>
      </Modal>

      {confirm && (
        <Confirm
          danger
          title="Cancel appointment?"
          text={`This will remove ${user.role === 'patient' ? 'your' : `${appt.clientName}'s`} ${appt.service} on ${localDate(appt.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.`}
          confirmLabel="Cancel appointment"
          onConfirm={handleCancel}
          onClose={() => setConfirm(false)}
        />
      )}
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AppointmentScheduler({ onOpenRecord }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState([]);
  // takenSlots: [{date, time}] — for patients comes from availability endpoint (no PII);
  // for staff derived from the full appointments list
  const [takenSlots, setTakenSlots]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [view, setView]                 = useState('week');
  const [anchor, setAnchor]             = useState(new Date());
  const [booking, setBooking]           = useState(null);
  const [dayOpen, setDayOpen]           = useState(null);
  const [apptOpen, setApptOpen]         = useState(null);

  const todayIso  = iso(new Date());
  const isPatient = user.role === 'patient';

  const load = async () => {
    try {
      if (isPatient) {
        // Own appointments (display) + all taken slots (availability, no PII)
        const [ownAppts, taken] = await Promise.all([
          appointmentsAPI.getForPatient(user.email),
          appointmentsAPI.getAvailability(),
        ]);
        setAppointments(ownAppts);
        setTakenSlots(taken);
      } else {
        const appts = await appointmentsAPI.getAll();
        setAppointments(appts);
        // Cancelled appointments free their slot, so exclude them from occupancy
        setTakenSlots(appts.filter(a => a.status !== 'Cancelled').map(a => ({ date: a.date, time: a.time })));
      }
    } catch (err) {
      toast('Failed to load appointments', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const mine = (a) => a.email === user.email;

  const nav = (dir) => {
    const x = new Date(anchor);
    if (view === 'week') x.setDate(x.getDate() + dir * 7);
    else x.setMonth(x.getMonth() + dir);
    setAnchor(x);
  };

  // ── Week ────────────────────────────────────────────────────────────────────
  const weekStart = startOfWeek(anchor);
  const weekDays  = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${addDays(weekStart, 5).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  // ── Month ───────────────────────────────────────────────────────────────────
  const mY = anchor.getFullYear(), mM = anchor.getMonth();
  const monthLabel = anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const lead  = (new Date(mY, mM, 1).getDay() + 6) % 7;
  const dim   = new Date(mY, mM + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: dim }, (_, i) => new Date(mY, mM, i+1))];
  while (cells.length % 7) cells.push(null);

  // Cancelled appointments are kept as history but excluded from the calendar grids
  const activeAppointments = appointments.filter(a => a.status !== 'Cancelled');

  const myUpcoming = activeAppointments.filter(mine).filter(a => a.date >= todayIso)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  // Check if a slot is taken (uses takenSlots so patients see Unavailable correctly)
  const slotTaken = (date, time) => takenSlots.some(s => s.date === date && s.time === time);

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>

      {/* Control bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div className="seg">
          <button className={view === 'week'  ? 'on' : ''} onClick={() => setView('week')}>Week</button>
          <button className={view === 'month' ? 'on' : ''} onClick={() => setView('month')}>Month</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="icon-btn" onClick={() => nav(-1)} aria-label="Previous"><FaChevronLeft size={14} /></button>
          <button className="btn btn-ghost btn-sm" onClick={() => setAnchor(new Date())}>Today</button>
          <button className="icon-btn" onClick={() => nav(1)} aria-label="Next"><FaChevronRight size={14} /></button>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.01em', marginLeft: 6 }}>
            {view === 'week' ? weekLabel : monthLabel}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        {canBook(user.role) && (
          <button className="btn btn-gold" onClick={() => setBooking({ date: todayIso, time: '' })}>
            <FaPlus />{isPatient ? 'Book appointment' : 'New appointment'}
          </button>
        )}
      </div>

      {/* Patient: upcoming visits strip */}
      {isPatient && (
        <div className="card card-pad" style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaMapMarkerAlt size={13} style={{ color: 'var(--role-patient)' }} />
            Your booked visits
          </div>
          {myUpcoming.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13.5 }}>No upcoming visits — pick an open slot below to book.</div>
          ) : (
            <div className="myvisits">
              {myUpcoming.map(a => (
                <button key={a.id} className="myvisit" style={{ '--svc-c': svcColor(a.service) }}
                  onClick={() => setApptOpen(a)}>
                  <span className="mv-dot" />
                  <div>
                    <b>{a.service}</b>
                    <span>{localDate(a.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {fmt12(a.time)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WEEK GRID */}
      {view === 'week' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="wk">
            <div className="wk-corner"><FaClock size={13} style={{ color: 'var(--faint)' }} /></div>
            {weekDays.map(d => {
              const di = iso(d); const isToday = di === todayIso;
              return (
                <button key={di} className={`wk-dayhead ${isToday ? 'today' : ''}`} onClick={() => setDayOpen(di)}>
                  <span className="wk-dow">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className="wk-date">{d.getDate()}</span>
                </button>
              );
            })}
            {SLOT_TIMES.map(t => (
              <Fragment key={t}>
                <div className="wk-timecol">{fmt12(t)}</div>
                {weekDays.map(d => {
                  const di   = iso(d);
                  const appt = activeAppointments.find(a => a.date === di && a.time === t);
                  const past = di < todayIso;
                  const taken = slotTaken(di, t);

                  if (appt) {
                    const own  = mine(appt);
                    const hide = isPatient && !own;
                    const done = apptStatus(appt) === 'Completed';
                    return (
                      <div key={di+t} className="wk-cell">
                        <button className={`wk-appt ${hide ? 'busy' : ''} ${done ? 'done' : ''}`}
                          style={{ '--svc-c': svcColor(appt.service) }}
                          onClick={() => !hide && setApptOpen(appt)}
                          disabled={hide}>
                          {hide
                            ? <span className="wk-busy-t">Unavailable</span>
                            : <><b>{own ? 'Your visit' : appt.clientName}{done && <FaCheck size={9} style={{ marginLeft: 5, opacity: .7 }} />}</b><span>{appt.service}</span></>}
                        </button>
                      </div>
                    );
                  }

                  // Patient sees Unavailable for slots taken by others
                  if (isPatient && taken) {
                    return (
                      <div key={di+t} className="wk-cell">
                        <div className="wk-appt busy" style={{ '--svc-c': 'var(--faint)' }}>
                          <span className="wk-busy-t">Unavailable</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={di+t} className="wk-cell">
                      {canBook(user.role) && !past
                        ? <button className="wk-open" onClick={() => setBooking({ date: di, time: t })} aria-label={`Book ${fmt12(t)}`}><FaPlus size={13} /></button>
                        : <div className={`wk-empty ${past ? 'past' : ''}`} />}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {/* MONTH GRID */}
      {view === 'month' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="mo-week">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(w => (
              <div key={w} className={`mo-wd ${w === 'Sun' ? 'mo-wd-sun' : ''}`}>{w}</div>
            ))}
          </div>
          <div className="mo-grid">
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} className="mo-cell empty" />;
              const isSunday = d.getDay() === 0;
              if (isSunday) return <div key={iso(d)} className="mo-cell mo-sunday" />;

              const di       = iso(d);
              const isToday  = di === todayIso;
              const dayAppts = activeAppointments.filter(a => a.date === di);
              const visible  = isPatient ? dayAppts.filter(mine) : dayAppts;
              const open     = SLOT_TIMES.filter(t => !slotTaken(di, t)).length;
              return (
                <button key={di} className={`mo-cell ${isToday ? 'today' : ''}`} onClick={() => setDayOpen(di)}>
                  <div className="mo-num">
                    {d.getDate()}
                    {isToday && <span className="mo-today">Today</span>}
                  </div>
                  <div className="mo-dots">
                    {visible.slice(0, 4).map(a => (
                      <span key={a.id} className="mo-dot" style={{ background: svcColor(a.service) }} />
                    ))}
                    {visible.length > 4 && <span className="mo-more">+{visible.length - 4}</span>}
                  </div>
                  {!isPatient && (
                    <div className="mo-foot">
                      {dayAppts.length ? `${dayAppts.length} booked` : ''}
                      <span>{open} open</span>
                    </div>
                  )}
                  {isPatient && visible.length > 0 && (
                    <div className="mo-foot">
                      <span style={{ color: 'var(--role-patient)' }}>
                        {visible.length} visit{visible.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Service legend */}
      <div className="legend">
        {SERVICES.map(s => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}
      </div>

      {/* Modals */}
      {booking && (
        <BookingModal
          user={user}
          takenSlots={takenSlots}
          presetDate={booking.date}
          presetTime={booking.time}
          onClose={() => setBooking(null)}
          onSaved={load}
        />
      )}
      {dayOpen && (
        <DayDetail
          date={dayOpen}
          user={user}
          appointments={activeAppointments}
          takenSlots={takenSlots}
          onClose={() => setDayOpen(null)}
          onBook={t => { setDayOpen(null); setBooking({ date: dayOpen, time: t }); }}
          onOpenAppt={a => { setDayOpen(null); setApptOpen(a); }}
        />
      )}
      {apptOpen && (
        <ApptDetail
          appt={apptOpen}
          user={user}
          onOpenRecord={onOpenRecord}
          onClose={() => setApptOpen(null)}
          onDeleted={id => { setAppointments(prev => prev.filter(a => a.id !== id)); setTakenSlots(prev => prev.filter(s => !(s.date === apptOpen.date && s.time === apptOpen.time))); }}
        />
      )}

      <style>{`
        .wk { display: grid; grid-template-columns: 72px repeat(6, 1fr); }
        .wk-corner { display: grid; place-items: center; color: var(--faint); border-bottom: 1px solid var(--line); border-right: 1px solid var(--line-soft); min-height: 60px; }
        .wk-dayhead { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 12px 4px; border-bottom: 1px solid var(--line); border-left: 1px solid var(--line-soft); background: var(--surface); transition: background .12s; }
        .wk-dayhead:hover { background: var(--surface-2); }
        .wk-dow { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; }
        .wk-date { font-size: 19px; font-weight: 800; letter-spacing: -.02em; }
        .wk-dayhead.today { background: var(--royal-50); }
        .wk-dayhead.today .wk-dow { color: var(--primary); }
        .wk-dayhead.today .wk-date { color: #fff; background: var(--primary); width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; line-height: 1; font-size: 15px; }
        .wk-timecol { display: flex; align-items: center; justify-content: flex-end; padding: 0 10px; font-size: 11px; font-weight: 700; color: var(--muted); border-right: 1px solid var(--line-soft); border-bottom: 1px solid var(--line-soft); min-height: 46px; }
        .wk-cell { border-left: 1px solid var(--line-soft); border-bottom: 1px solid var(--line-soft); padding: 3px; min-height: 46px; }
        .wk-appt { width: 100%; height: 100%; min-height: 40px; border: none; border-radius: 8px; padding: 5px 7px; text-align: left; cursor: pointer;
          background: color-mix(in srgb, var(--svc-c) 13%, var(--surface)); border-left: 3px solid var(--svc-c); transition: all .12s; display: flex; flex-direction: column; justify-content: center; }
        .wk-appt:hover:not(:disabled) { background: color-mix(in srgb, var(--svc-c) 20%, var(--surface)); }
        .wk-appt b    { font-size: 11.5px; font-weight: 800; color: color-mix(in srgb, var(--svc-c) 75%, #000); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
        .wk-appt span { font-size: 10.5px; color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
        .wk-appt.busy { background: var(--line-soft); border-left-color: var(--faint); cursor: default; }
        .wk-appt.done { opacity: .62; }
        .wk-appt.done b { color: var(--muted); }
        .wk-busy-t { font-size: 11px; font-weight: 700; color: var(--faint); }
        .wk-open { width: 100%; height: 100%; min-height: 40px; border: 1.5px dashed transparent; border-radius: 8px; background: none; color: transparent; display: grid; place-items: center; transition: all .12s; }
        .wk-open:hover { border-color: var(--royal-400); background: var(--royal-50); color: var(--primary); }
        .wk-empty { width: 100%; height: 100%; min-height: 40px; border-radius: 8px; }
        .wk-empty.past { background: repeating-linear-gradient(45deg, var(--surface-2), var(--surface-2) 6px, transparent 6px, transparent 12px); opacity: .5; }

        .mo-week { display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid var(--line); }
        .mo-wd     { padding: 12px; text-align: center; font-size: 11.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
        .mo-wd-sun { color: var(--faint); }
        .mo-grid   { display: grid; grid-template-columns: repeat(7, 1fr); }
        .mo-cell   { min-height: 104px; border-left: 1px solid var(--line-soft); border-bottom: 1px solid var(--line-soft); padding: 9px; background: var(--surface); text-align: left; display: flex; flex-direction: column; gap: 6px; transition: background .12s; border: none; width: 100%; }
        .mo-cell:nth-child(7n+1) { border-left: none; }
        .mo-cell:hover:not(.empty):not(.mo-sunday) { background: var(--surface-2); cursor: pointer; }
        .mo-cell.empty   { background: var(--surface-2); pointer-events: none; }
        .mo-sunday       { background: var(--line-soft); pointer-events: none; opacity: .55; }
        .mo-num  { font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 7px; }
        .mo-cell.today .mo-num { color: var(--primary); }
        .mo-today { font-size: 10px; font-weight: 800; color: #fff; background: var(--primary); padding: 1px 7px; border-radius: 99px; text-transform: uppercase; }
        .mo-dots  { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; flex: 1; align-content: flex-start; }
        .mo-dot   { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 8px; }
        .mo-more  { font-size: 10.5px; font-weight: 700; color: var(--muted); }
        .mo-foot  { font-size: 10.5px; font-weight: 700; color: var(--muted); display: flex; justify-content: space-between; }
        .mo-foot span { color: var(--ok); }

        .myvisits { display: flex; gap: 10px; flex-wrap: wrap; }
        .myvisit  { display: flex; align-items: center; gap: 11px; padding: 10px 16px 10px 12px; border: 1.5px solid var(--line); border-radius: var(--r-sm); background: var(--surface); text-align: left; transition: all .14s; }
        .myvisit:hover { border-color: var(--svc-c); }
        .mv-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--svc-c); flex: 0 0 10px; }
        .myvisit b    { display: block; font-size: 13.5px; font-weight: 700; white-space: nowrap; }
        .myvisit span { font-size: 12px; color: var(--muted); white-space: nowrap; }

        .legend { display: flex; gap: 16px; flex-wrap: wrap; padding: 2px 4px; }
        .legend span { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600; color: var(--muted); }
        .legend i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }

        @media (max-width: 760px) {
          .wk { grid-template-columns: 56px repeat(6, minmax(72px, 1fr)); overflow-x: auto; }
          .mo-cell { min-height: 76px; }
        }
      `}</style>
    </div>
  );
}

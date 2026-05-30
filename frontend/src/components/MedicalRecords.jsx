import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { medicalRecordsAPI, inventoryAPI, patientsAPI } from '../services/api';
import { Avatar, Empty, Modal, ModalHead, Confirm } from './ui';
import {
  FaSearch, FaPlus, FaEdit, FaTrash, FaCheck, FaTimes,
  FaExclamationTriangle, FaPills, FaMinus, FaHeartbeat,
  FaFileAlt, FaUser, FaStethoscope, FaIdCard, FaEnvelope,
  FaUserPlus, FaCalendarAlt,
} from 'react-icons/fa';

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseMeds = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
};

const localDate = (s) => s ? new Date(s + 'T00:00') : null;
const calcAge   = (dob) => { if (!dob) return ''; const [y] = dob.split('-').map(Number); return String(new Date().getFullYear() - y); };
const LOW = 10;

const canEdit   = (role) => ['nurse', 'doctor', 'admin'].includes(role);
const canDelete = (role) => ['doctor', 'admin'].includes(role);

const TABS = [
  { id: 'basic',    label: 'Basic',        Icon: FaUser },
  { id: 'clinical', label: 'Clinical',     Icon: FaStethoscope },
  { id: 'vitals',   label: 'Vitals',       Icon: FaHeartbeat },
  { id: 'rx',       label: 'Prescription', Icon: FaPills },
];

const EMPTY_FORM = {
  patientName: '', email: '', idNumber: '', age: '', gender: '',
  symptoms: '', diagnosis: '', treatment: '', allergies: '', notes: '',
  followUpDate: '', labResults: '', xrayNotes: '',
  bloodPressure: '', heartRate: '', temperature: '',
  prescribedMedicines: [],
};

// ── VisitForm (create or edit a single visit) ─────────────────────────────────
function VisitForm({ visit, patientId, prefill, allVisits, inventory, onClose, onSaved }) {
  const { toast } = useToast();
  const isEditing = !!visit?.id;

  const [tab, setTab]       = useState('basic');
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');
  const [medQ, setMedQ]     = useState('');
  const [f, setF]           = useState(() => ({
    ...EMPTY_FORM,
    ...(prefill || {}),
    ...(visit   || {}),
    prescribedMedicines: parseMeds(visit?.prescribedMedicines),
  }));

  const upd = (k, v) => setF(s => ({ ...s, [k]: v }));

  const origMeds = isEditing ? parseMeds(visit.prescribedMedicines) : [];
  const availFor = (item) => {
    const orig = origMeds.find(p => p.id === item.id);
    return item.quantity + (orig ? Number(orig.quantity) : 0);
  };
  const rxQty    = (id) => f.prescribedMedicines.find(p => p.id === id)?.quantity || 0;
  const setRxQty = (item, qty) => {
    setF(s => {
      const meds = [...s.prescribedMedicines];
      const idx  = meds.findIndex(p => p.id === item.id);
      const cap  = availFor(item);
      const q    = Math.max(0, Math.min(cap, qty));
      if (idx >= 0) { if (q === 0) meds.splice(idx, 1); else meds[idx] = { ...meds[idx], quantity: q }; }
      else if (q > 0) meds.push({ id: item.id, name: item.name, dosage: item.dosage, unit: item.unit, quantity: q });
      return { ...s, prescribedMedicines: meds };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!f.patientName) { setErr('Patient name is required.'); setTab('basic'); return; }
    if (!f.diagnosis)   { setErr('Diagnosis is required.');    setTab('clinical'); return; }
    if (!f.symptoms)    { setErr('Symptoms are required.');    setTab('clinical'); return; }
    if (!f.treatment)   { setErr('Treatment is required.');    setTab('clinical'); return; }

    setSaving(true);
    setErr('');
    const data = {
      patient_id: patientId || null,
      patientName: f.patientName, email: f.email || undefined, idNumber: f.idNumber || undefined,
      age: f.age || undefined, gender: f.gender || undefined,
      symptoms: f.symptoms, diagnosis: f.diagnosis, treatment: f.treatment,
      allergies: f.allergies || undefined, notes: f.notes || undefined,
      followUpDate: f.followUpDate || undefined, labResults: f.labResults || undefined,
      xrayNotes: f.xrayNotes || undefined,
      bloodPressure: f.bloodPressure || undefined, heartRate: f.heartRate || undefined,
      temperature: f.temperature || undefined,
      prescribedMedicines: JSON.stringify(f.prescribedMedicines),
    };

    try {
      let response;
      if (isEditing) {
        response = await medicalRecordsAPI.update(visit.id, data);
        toast('Visit updated', 'ok');
      } else {
        response = await medicalRecordsAPI.create(data);
        toast('Visit recorded', 'ok');
      }
      onSaved(response.record || response, isEditing);
      onClose();
    } catch (err) {
      setErr(err.message || 'Failed to save visit');
      setSaving(false);
    }
  };

  const medList = inventory.filter(m => m.name.toLowerCase().includes(medQ.toLowerCase()));

  return (
    <Modal onClose={onClose} wide>
      <ModalHead
        icon={<FaFileAlt />}
        title={isEditing ? 'Edit visit record' : 'New visit record'}
        onClose={onClose}
      />
      <div className="rf-tabs">
        {TABS.map(t => (
          <button key={t.id} type="button" className={`rf-tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
            <t.Icon size={14} />{t.label}
            {t.id === 'rx' && f.prescribedMedicines.length > 0 && (
              <span className="rf-count">{f.prescribedMedicines.length}</span>
            )}
          </button>
        ))}
      </div>
      <form onSubmit={submit}>
        <div className="modal-body" style={{ minHeight: 340 }}>
          {tab === 'basic' && (
            <div className="form-grid">
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Patient name *</label>
                <input className="input" value={f.patientName} onChange={e => upd('patientName', e.target.value)} placeholder="Full name" required autoFocus />
              </div>
              <div className="field"><label>Email</label><input className="input" type="email" value={f.email} onChange={e => upd('email', e.target.value)} placeholder="name@email.com" /></div>
              <div className="field"><label>ID number</label><input className="input" value={f.idNumber} onChange={e => upd('idNumber', e.target.value)} placeholder="2021-30001" /></div>
              <div className="field"><label>Age</label><input className="input" type="number" value={f.age} onChange={e => upd('age', e.target.value)} placeholder="21" min="0" max="120" /></div>
              <div className="field">
                <label>Gender</label>
                <select className="select" value={f.gender} onChange={e => upd('gender', e.target.value)}>
                  <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Known allergies</label>
                <input className="input" value={f.allergies} onChange={e => upd('allergies', e.target.value)} placeholder='e.g. Penicillin — or "None known"' />
              </div>
            </div>
          )}
          {tab === 'clinical' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field"><label>Symptoms / chief complaint *</label><textarea className="textarea" value={f.symptoms} onChange={e => upd('symptoms', e.target.value)} placeholder="What the patient reports…" /></div>
              <div className="form-grid">
                <div className="field"><label>Diagnosis *</label><input className="input" value={f.diagnosis} onChange={e => upd('diagnosis', e.target.value)} placeholder="Clinical diagnosis" /></div>
                <div className="field"><label>Follow-up date</label><input className="input" type="date" value={f.followUpDate} onChange={e => upd('followUpDate', e.target.value)} /></div>
              </div>
              <div className="field"><label>Treatment plan *</label><textarea className="textarea" value={f.treatment} onChange={e => upd('treatment', e.target.value)} placeholder="Recommended treatment…" /></div>
              <div className="form-grid">
                <div className="field"><label>Lab results</label><textarea className="textarea" value={f.labResults} onChange={e => upd('labResults', e.target.value)} placeholder="Lab findings…" style={{ minHeight: 64 }} /></div>
                <div className="field"><label>X-ray notes</label><textarea className="textarea" value={f.xrayNotes} onChange={e => upd('xrayNotes', e.target.value)} placeholder="Imaging notes…" style={{ minHeight: 64 }} /></div>
              </div>
              <div className="field"><label>Additional notes</label><textarea className="textarea" value={f.notes} onChange={e => upd('notes', e.target.value)} placeholder="Anything else to record…" style={{ minHeight: 64 }} /></div>
            </div>
          )}
          {tab === 'vitals' && (
            <div className="vitals-grid">
              {[
                { label:'Blood pressure', key:'bloodPressure', type:'text', ph:'120/80', unit:'mmHg', bg:'var(--royal-50)', fg:'var(--primary)' },
                { label:'Heart rate',     key:'heartRate',     type:'number', ph:'72',    unit:'bpm',  bg:'var(--danger-bg)', fg:'var(--danger)' },
                { label:'Temperature',    key:'temperature',   type:'number', ph:'36.6',  unit:'°C',   bg:'var(--warn-bg)',   fg:'var(--warn)', step:'0.1' },
              ].map(v => (
                <div key={v.key} className="vital">
                  <div className="v-ic" style={{ background: v.bg, color: v.fg }}><FaHeartbeat size={18} /></div>
                  <label>{v.label}</label>
                  <div className="v-in">
                    <input className="input" type={v.type} value={f[v.key]} step={v.step} onChange={e => upd(v.key, e.target.value)} placeholder={v.ph} />
                    <span>{v.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'rx' && (
            <div className="rx-wrap">
              <div className="rx-avail">
                <div className="search" style={{ marginBottom: 12 }}>
                  <FaSearch /><input className="input" placeholder="Search medicines…" value={medQ} onChange={e => setMedQ(e.target.value)} />
                </div>
                <div className="rx-list">
                  {medList.filter(m => m.type === 'Medicine').map(m => {
                    const avail = availFor(m); const q = rxQty(m.id); const low = m.quantity < LOW;
                    return (
                      <div key={m.id} className={`rx-item ${q > 0 ? 'on' : ''}`}>
                        <div className="rx-info">
                          <b>{m.name} <span style={{ color:'var(--muted)', fontWeight:600 }}>{m.dosage}{m.unit}</span></b>
                          <span className={low ? 'rx-low' : ''}>{low && <FaExclamationTriangle size={11} />}{avail} available{low ? ' · low' : ''}</span>
                        </div>
                        <div className="qty">
                          <button type="button" onClick={() => setRxQty(m, q-1)} disabled={q===0}><FaMinus size={11}/></button>
                          <b>{q}</b>
                          <button type="button" onClick={() => setRxQty(m, q+1)} disabled={q>=avail}><FaPlus size={11}/></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rx-cart">
                <div className="rx-cart-h"><FaCheck size={14} />Prescribed ({f.prescribedMedicines.length})</div>
                {f.prescribedMedicines.length === 0
                  ? <div className="rx-empty">No medicines added yet. Pick from the list — stock updates on save.</div>
                  : f.prescribedMedicines.map(p => (
                    <div key={p.id} className="rx-chip">
                      <span><b>{p.name}</b> {p.dosage}{p.unit}</span>
                      <span className="rx-x" onClick={() => setRxQty({ id: p.id }, 0)}>×{p.quantity} <FaTimes size={11}/></span>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {err && (
            <div className="login-err" style={{ marginTop: 16 }}>
              <FaExclamationTriangle size={14} />{err}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center' }}>
            {TABS.map(t => <span key={t.id} className={`rf-dot ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)} />)}
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <FaCheck />{isEditing ? 'Save visit' : 'Record visit'}
          </button>
        </div>
      </form>
      <style>{`
        .rf-tabs { display: flex; gap: 4px; padding: 0 24px; border-bottom: 1px solid var(--line-soft); }
        .rf-tab  { display: flex; align-items: center; gap: 7px; padding: 14px 14px; border: none; background: none; color: var(--muted); font-size: 13.5px; font-weight: 700; border-bottom: 2.5px solid transparent; margin-bottom: -1px; transition: color .14s; }
        .rf-tab:hover { color: var(--ink); }
        .rf-tab.on    { color: var(--primary); border-bottom-color: var(--primary); }
        .rf-count { background: var(--primary); color: #fff; font-size: 10px; border-radius: 99px; padding: 1px 6px; }
        .vitals-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .vital { border: 1px solid var(--line); border-radius: var(--r-md); padding: 18px; background: var(--surface-2); }
        .v-ic  { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; margin-bottom: 14px; }
        .vital label { display: block; font-size: 12.5px; font-weight: 700; color: var(--muted); margin-bottom: 8px; }
        .v-in  { display: flex; align-items: center; gap: 8px; }
        .v-in span { font-size: 12.5px; color: var(--muted); font-weight: 600; }
        .rx-wrap  { display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px; }
        .rx-avail { display: flex; flex-direction: column; min-height: 0; }
        .rx-list  { display: flex; flex-direction: column; gap: 7px; max-height: 260px; overflow-y: auto; padding-right: 4px; }
        .rx-item  { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--r-sm); background: var(--surface); transition: border-color .12s; }
        .rx-item.on { border-color: var(--primary); background: var(--royal-50); }
        .rx-info b { display: block; font-size: 13.5px; font-weight: 700; }
        .rx-info span { font-size: 11.5px; color: var(--ok); font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
        .rx-info .rx-low { color: var(--warn); }
        .rx-cart   { background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--r-md); padding: 16px; }
        .rx-cart-h { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; color: var(--primary); margin-bottom: 12px; }
        .rx-empty  { font-size: 12.5px; color: var(--muted); line-height: 1.5; }
        .rx-chip   { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 12px; background: var(--surface); border-radius: var(--r-sm); margin-bottom: 7px; border: 1px solid var(--line); }
        .rx-chip span { font-size: 12.5px; } .rx-chip b { font-weight: 700; }
        .rx-x { display: inline-flex; align-items: center; gap: 3px; color: var(--danger); font-weight: 700; cursor: pointer; }
        .rf-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--line); cursor: pointer; flex: 0 0 7px; transition: all .15s; }
        .rf-dot.on { background: var(--primary); width: 20px; border-radius: 99px; }
        @media (max-width: 640px) { .vitals-grid { grid-template-columns: 1fr; } .rx-wrap { grid-template-columns: 1fr; } }
      `}</style>
    </Modal>
  );
}

// ── VisitDetail (view one visit) ──────────────────────────────────────────────
function VisitDetail({ visit, user, onClose, onEdit, onDeleted }) {
  const { toast } = useToast();
  const [del, setDel] = useState(false);
  const r    = visit;
  const meds = parseMeds(r.prescribedMedicines);

  const vitals = [
    { label:'Blood pressure', val:r.bloodPressure, unit:'mmHg', c:'var(--primary)',  bg:'var(--royal-50)' },
    { label:'Heart rate',     val:r.heartRate,     unit:'bpm',  c:'var(--danger)',   bg:'var(--danger-bg)' },
    { label:'Temperature',    val:r.temperature,   unit:'°C',   c:'var(--warn)',     bg:'var(--warn-bg)' },
  ];
  const clin = [
    { label:'Symptoms',    val:r.symptoms }, { label:'Diagnosis', val:r.diagnosis },
    { label:'Treatment',   val:r.treatment }, { label:'Lab results', val:r.labResults },
    { label:'X-ray notes', val:r.xrayNotes }, { label:'Notes', val:r.notes },
  ].filter(x => x.val);

  const handleDelete = async () => {
    try {
      await medicalRecordsAPI.delete(r.id);
      toast('Visit deleted', 'ok');
      onDeleted(r.id);
      onClose();
    } catch (err) {
      toast('Failed to delete visit', 'danger');
    }
  };

  return (
    <>
      <Modal onClose={onClose} wide>
        <div className="modal-head">
          <div style={{ display:'flex', alignItems:'center', gap: 12, flex: 1, minWidth: 0 }}>
            <div style={{ background:'var(--royal-50)', color:'var(--primary)', width:38, height:38, borderRadius:11, display:'grid', placeItems:'center', flexShrink:0 }}>
              <FaCalendarAlt size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin:0 }}>Visit — {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : ''}</h2>
              <div style={{ fontSize:12.5, color:'var(--muted)' }}>{r.diagnosis}</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="modal-body" style={{ maxHeight:'62vh', overflowY:'auto', display:'flex', flexDirection:'column', gap:22 }}>
          {r.allergies && r.allergies.toLowerCase() !== 'none known' && (
            <div className="rec-allergy"><FaExclamationTriangle size={15} />Allergies: <b>{r.allergies}</b></div>
          )}
          <div>
            <div className="rec-sec-t">Vitals</div>
            <div className="rec-vitals">
              {vitals.map(v => (
                <div className="rec-vital" key={v.label}>
                  <div className="rv-ic" style={{ background:v.bg, color:v.c }}><FaHeartbeat size={17}/></div>
                  <div><span>{v.label}</span><b>{v.val||'—'}{v.val&&<em> {v.unit}</em>}</b></div>
                </div>
              ))}
            </div>
          </div>
          {clin.length > 0 && (
            <div>
              <div className="rec-sec-t">Clinical notes</div>
              <div className="rec-clin">
                {clin.map(c => <div key={c.label} className="rec-row"><span>{c.label}</span><p>{c.val}</p></div>)}
              </div>
            </div>
          )}
          <div>
            <div className="rec-sec-t">
              Prescription
              {r.followUpDate && <span style={{ float:'right', fontWeight:600, color:'var(--muted)', textTransform:'none', letterSpacing:0 }}>Follow-up: {localDate(r.followUpDate)?.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}</span>}
            </div>
            {meds.length > 0 ? (
              <div className="rec-rx">
                {meds.map((m,i) => (
                  <div className="rec-rx-item" key={i}>
                    <div className="rx-ic"><FaPills size={16}/></div>
                    <div style={{ flex:1 }}><b>{m.name}</b><span>{m.dosage}{m.unit} per unit</span></div>
                    <span className="badge badge-blue">×{m.quantity}</span>
                  </div>
                ))}
              </div>
            ) : <div style={{ fontSize:13.5, color:'var(--muted)' }}>No medicines prescribed.</div>}
          </div>
        </div>

        <div className="modal-foot">
          {canDelete(user.role) && <button className="btn btn-danger" onClick={() => setDel(true)}><FaTrash size={13}/>Delete</button>}
          <div style={{ flex:1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          {canEdit(user.role) && <button className="btn btn-primary" onClick={() => { onEdit(r); onClose(); }}><FaEdit size={13}/>Edit visit</button>}
        </div>

        <style>{`
          .rec-allergy { display:flex; align-items:center; gap:8px; padding:11px 15px; background:var(--danger-bg); color:var(--danger); border-radius:var(--r-sm); font-size:13.5px; font-weight:600; }
          .rec-allergy b { font-weight:800; }
          .rec-sec-t { font-size:11.5px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-bottom:12px; }
          .rec-vitals { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
          .rec-vital { display:flex; align-items:center; gap:12px; padding:14px; border:1px solid var(--line); border-radius:var(--r-md); background:var(--surface-2); }
          .rv-ic { width:40px; height:40px; border-radius:11px; display:grid; place-items:center; flex:0 0 40px; }
          .rec-vital span { font-size:11.5px; color:var(--muted); font-weight:600; display:block; }
          .rec-vital b { font-size:18px; font-weight:800; letter-spacing:-.02em; }
          .rec-vital em { font-size:11px; color:var(--muted); font-weight:600; font-style:normal; }
          .rec-clin { display:flex; flex-direction:column; gap:0; border:1px solid var(--line); border-radius:var(--r-md); overflow:hidden; }
          .rec-row { display:grid; grid-template-columns:140px 1fr; gap:16px; padding:13px 16px; border-bottom:1px solid var(--line-soft); }
          .rec-row:last-child { border-bottom:none; }
          .rec-row span { font-size:13px; font-weight:700; color:var(--muted); }
          .rec-row p { font-size:14px; color:var(--ink-soft); line-height:1.55; margin:0; }
          .rec-rx { display:flex; flex-direction:column; gap:9px; }
          .rec-rx-item { display:flex; align-items:center; gap:13px; padding:12px 14px; border:1px solid var(--line); border-radius:var(--r-md); }
          .rx-ic { width:38px; height:38px; border-radius:11px; background:var(--royal-50); color:var(--primary); display:grid; place-items:center; flex:0 0 38px; }
          .rec-rx-item b { font-size:14px; font-weight:700; flex:1; }
          @media (max-width:600px) { .rec-vitals { grid-template-columns:1fr; } .rec-row { grid-template-columns:1fr; gap:4px; } }
        `}</style>
      </Modal>
      {del && (
        <Confirm danger title="Delete visit?" text={`This visit record will be permanently removed.`}
          confirmLabel="Delete" onConfirm={handleDelete} onClose={() => setDel(false)} />
      )}
    </>
  );
}

// ── PatientDetail (patient card with all visits) ──────────────────────────────
function PatientDetail({ patient, user, inventory, onClose, onVisitsChanged }) {
  const { toast } = useToast();
  const [visits, setVisits]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editVisit, setEditVisit] = useState(null);
  const [addVisit, setAddVisit]   = useState(false);
  const [viewVisit, setViewVisit] = useState(null);

  useEffect(() => {
    patientsAPI.getVisits(patient.id)
      .then(setVisits)
      .catch(() => toast('Failed to load visits', 'danger'))
      .finally(() => setLoading(false));
  }, [patient.id]);

  const handleSaved = (saved, wasEdit) => {
    if (wasEdit) setVisits(prev => prev.map(v => v.id === saved.id ? saved : v));
    else setVisits(prev => [...prev, saved]);
    onVisitsChanged?.();
  };

  const handleDeleted = (id) => {
    setVisits(prev => prev.filter(v => v.id !== id));
    onVisitsChanged?.();
  };

  const age = patient.dob ? calcAge(patient.dob) : null;

  return (
    <>
      <Modal onClose={onClose} wide>
        <div className="modal-head">
          <Avatar name={patient.name} role="patient" size={52} />
          <div style={{ flex:1, minWidth:0 }}>
            <h2 style={{ margin:0 }}>{patient.name}</h2>
            <div style={{ fontSize:12.5, color:'var(--muted)', display:'flex', gap:12, flexWrap:'wrap', marginTop:2 }}>
              {patient.id_number && <span><FaIdCard size={11} style={{ verticalAlign:'-1px' }} /> {patient.id_number}</span>}
              {age && <span>{age} yrs{patient.gender ? ` · ${patient.gender}` : ''}</span>}
              {patient.email && <span><FaEnvelope size={11} style={{ verticalAlign:'-1px' }} /> {patient.email}</span>}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="modal-body" style={{ maxHeight:'60vh', overflowY:'auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:800 }}>Visit history <span style={{ color:'var(--muted)', fontWeight:600, fontSize:13 }}>({visits.length})</span></div>
            {canEdit(user.role) && (
              <button className="btn btn-primary btn-sm" onClick={() => setAddVisit(true)}>
                <FaPlus size={13}/>Add visit
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:40 }}><div className="spinner" /></div>
          ) : visits.length === 0 ? (
            <Empty icon={<FaFileAlt />} title="No visits yet"
              text="Record this patient's first visit using the button above."
              action={canEdit(user.role) && <button className="btn btn-primary btn-sm" onClick={() => setAddVisit(true)}><FaPlus size={13}/>Add visit</button>} />
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {visits.map((v, idx) => {
                const meds = parseMeds(v.prescribedMedicines);
                return (
                  <div key={v.id} className="visit-row" onClick={() => setViewVisit(v)}>
                    <div className="visit-idx">#{idx+1}</div>
                    <div className="visit-main">
                      <b>{v.diagnosis}</b>
                      <span>{v.createdAt ? new Date(v.createdAt).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' }) : ''}</span>
                    </div>
                    {meds.length > 0 && <span className="badge badge-blue"><FaPills size={11}/>{meds.length} Rx</span>}
                    {v.followUpDate && <span className="badge badge-muted">{localDate(v.followUpDate)?.toLocaleDateString('en-US', { month:'short', day:'numeric' })}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>

        <style>{`
          .visit-row { display:flex; align-items:center; gap:12px; padding:13px 16px; border:1px solid var(--line); border-radius:var(--r-md); cursor:pointer; transition:all .14s; background:var(--surface); }
          .visit-row:hover { border-color:var(--royal-100); background:var(--surface-2); }
          .visit-idx { width:28px; height:28px; border-radius:50%; background:var(--royal-50); color:var(--primary); display:grid; place-items:center; font-size:12px; font-weight:800; flex-shrink:0; }
          .visit-main { flex:1; min-width:0; }
          .visit-main b { display:block; font-size:14px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
          .visit-main span { font-size:12px; color:var(--muted); }
        `}</style>
      </Modal>

      {addVisit && (
        <VisitForm
          patientId={patient.id}
          prefill={{ patientName: patient.name, email: patient.email, idNumber: patient.id_number, gender: patient.gender, age: age || '', allergies: patient.allergies }}
          allVisits={visits}
          inventory={inventory}
          onClose={() => setAddVisit(false)}
          onSaved={handleSaved}
        />
      )}
      {editVisit && (
        <VisitForm
          visit={editVisit}
          patientId={patient.id}
          allVisits={visits}
          inventory={inventory}
          onClose={() => setEditVisit(null)}
          onSaved={handleSaved}
        />
      )}
      {viewVisit && (
        <VisitDetail
          visit={viewVisit}
          user={user}
          onClose={() => setViewVisit(null)}
          onEdit={v => { setViewVisit(null); setEditVisit(v); }}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}

// ── NewPatientFlow (create patient + first visit) ─────────────────────────────
function NewPatientFlow({ inventory, prefill, onClose, onSaved }) {
  const { toast } = useToast();
  const [step, setStep]       = useState('patient');
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');
  const [createdPatient, setCreatedPatient] = useState(null);

  const [patQ, setPatQ]             = useState('');
  const [patResults, setPatResults] = useState([]);
  const [lookupOpen, setLookupOpen] = useState(false);

  const [pf, setPf] = useState({
    name: prefill?.name || '', email: prefill?.email || '',
    id_number: prefill?.id_number || '', dob: prefill?.dob || '',
    gender: prefill?.gender || '', allergies: prefill?.allergies || '',
  });
  const updP = (k, v) => setPf(s => ({ ...s, [k]: v }));

  const handlePatLookup = async (q) => {
    setPatQ(q); updP('name', q);
    if (q.length < 2) { setPatResults([]); setLookupOpen(false); return; }
    try {
      const r = await patientsAPI.search(q);
      setPatResults(r); setLookupOpen(r.length > 0);
    } catch {}
  };

  const selectExisting = (p) => {
    setCreatedPatient(p);
    setStep('visit');
    setLookupOpen(false);
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    if (!pf.name || !pf.email) { setErr('Name and email are required.'); return; }
    setSaving(true); setErr('');
    try {
      const patient = await patientsAPI.create(pf);
      setCreatedPatient(patient);
      setStep('visit');
    } catch (err) {
      setErr(err.message || 'Failed to create patient');
      setSaving(false);
    }
  };

  if (step === 'visit' && createdPatient) {
    return (
      <VisitForm
        patientId={createdPatient.id}
        prefill={{ patientName: createdPatient.name, email: createdPatient.email, idNumber: createdPatient.id_number, gender: createdPatient.gender, age: calcAge(createdPatient.dob), allergies: createdPatient.allergies }}
        allVisits={[]}
        inventory={inventory}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }

  return (
    <Modal onClose={onClose}>
      <ModalHead icon={<FaUserPlus />} title="Add new patient" onClose={onClose} />
      <form onSubmit={handleCreatePatient}>
        <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ position:'relative' }}>
            <div className="field" style={{ marginBottom:0 }}>
              <label>Search existing patients</label>
              <div className="search">
                <FaSearch />
                <input className="input" placeholder="Search by name, ID, or email…"
                  value={patQ} onChange={e => handlePatLookup(e.target.value)} autoComplete="off" />
              </div>
            </div>
            {lookupOpen && (
              <div className="pat-dropdown">
                {patResults.map(p => (
                  <button key={p.id} type="button" className="pat-result" onClick={() => selectExisting(p)}>
                    <b>{p.name}</b><span>{p.id_number} · {p.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ flex:1, height:1, background:'var(--line)' }} />
            <span style={{ fontSize:12, fontWeight:700, color:'var(--muted)' }}>OR CREATE NEW</span>
            <div style={{ flex:1, height:1, background:'var(--line)' }} />
          </div>

          <div className="form-grid">
            <div className="field" style={{ gridColumn:'1 / -1' }}>
              <label>Full name *</label>
              <input className="input" value={pf.name} onChange={e => updP('name', e.target.value)} placeholder="First Last" required />
            </div>
            <div className="field">
              <label>Email *</label>
              <input className="input" type="email" value={pf.email} onChange={e => updP('email', e.target.value)} placeholder="name@email.com" required />
            </div>
            <div className="field">
              <label>ID number</label>
              <input className="input" value={pf.id_number} onChange={e => updP('id_number', e.target.value)} placeholder="2021-30001" />
            </div>
            <div className="field">
              <label>Date of birth</label>
              <input className="input" type="date" value={pf.dob} onChange={e => updP('dob', e.target.value)} />
            </div>
            <div className="field">
              <label>Gender</label>
              <select className="select" value={pf.gender} onChange={e => updP('gender', e.target.value)}>
                <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div className="field" style={{ gridColumn:'1 / -1' }}>
              <label>Known allergies</label>
              <input className="input" value={pf.allergies} onChange={e => updP('allergies', e.target.value)} placeholder='"None known" or list specific allergies' />
            </div>
          </div>

          {err && <div className="login-err"><FaExclamationTriangle size={14}/>{err}</div>}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <FaCheck />Create patient &amp; add visit
          </button>
        </div>
      </form>
      <style>{`
        .pat-dropdown { position:absolute; top:calc(100% + 4px); left:0; right:0; z-index:50; background:var(--surface); border:1px solid var(--line); border-radius:var(--r-md); box-shadow:var(--shadow-lg); overflow:hidden; }
        .pat-result { width:100%; display:flex; flex-direction:column; gap:2px; padding:10px 14px; border:none; background:none; text-align:left; transition:background .12s; cursor:pointer; }
        .pat-result:hover { background:var(--surface-2); }
        .pat-result b { font-size:14px; font-weight:700; color:var(--ink); }
        .pat-result span { font-size:12px; color:var(--muted); }
      `}</style>
    </Modal>
  );
}

// ── MedicalRecords (main) ─────────────────────────────────────────────────────
export default function MedicalRecords({ openFor, clearOpenFor }) {
  const { user }  = useAuth();
  const { toast } = useToast();
  const [patients,   setPatients]   = useState([]);
  const [inventory,  setInventory]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [q, setQ]                   = useState('');
  const [selected,   setSelected]   = useState(null);
  const [newPatient, setNewPatient] = useState(false);
  const [prefillPatient, setPrefillPatient] = useState(null);

  const isPatient = user.role === 'patient';

  const load = async () => {
    try {
      if (isPatient) {
        const visits = await medicalRecordsAPI.getAll();
        setPatients([{
          id: null, name: user.name, email: user.email,
          id_number: null, gender: null, dob: null, allergies: null,
          visitCount: visits.length, _ownVisits: visits,
        }]);
      } else {
        const [pats, inv] = await Promise.all([patientsAPI.getAll(), inventoryAPI.getAll()]);
        setPatients(pats);
        setInventory(inv);
      }
    } catch (err) {
      toast('Failed to load records', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // When opened from an appointment, resolve the patient and jump into their record.
  // If no matching patient exists yet, open the new-patient flow prefilled from the appointment.
  useEffect(() => {
    if (!openFor || loading || isPatient) return;
    const match = patients.find(p =>
      (openFor.email && p.email && p.email === openFor.email) ||
      (openFor.idNumber && p.id_number && p.id_number === openFor.idNumber)
    );
    if (match) {
      setSelected(match);
    } else {
      setPrefillPatient({
        name: openFor.clientName || '', email: openFor.email || '',
        id_number: openFor.idNumber || '', gender: openFor.gender || '',
        dob: '', allergies: '',
      });
      setNewPatient(true);
    }
    clearOpenFor?.();
  }, [openFor, loading]);

  const list = patients.filter(p =>
    p.name.toLowerCase().includes(q.toLowerCase()) ||
    (p.id_number || '').includes(q) ||
    (p.email || '').toLowerCase().includes(q.toLowerCase())
  );

  if (loading) {
    return (
      <div className="page" style={{ display:'flex', justifyContent:'center', paddingTop:60 }}>
        <div className="spinner" />
      </div>
    );
  }

  // Patient view: their own visits as a vertical timeline
  if (isPatient) {
    const ownVisits = patients[0]?._ownVisits || [];
    return (
      <div className="page" style={{ display:'flex', flexDirection:'column', gap:'var(--gap)' }}>
        <h2 style={{ fontSize:18, fontWeight:800 }}>My Medical Records</h2>
        {ownVisits.length === 0 ? (
          <div className="card"><Empty icon={<FaFileAlt />} title="No records yet" text="Your visit records will appear here once clinic staff complete your record." /></div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {ownVisits.map((v, idx) => {
              const meds = parseMeds(v.prescribedMedicines);
              return (
                <div key={v.id} className="card card-pad" style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ background:'var(--royal-50)', color:'var(--primary)', width:36, height:36, borderRadius:10, display:'grid', placeItems:'center', flexShrink:0 }}>
                      <span style={{ fontSize:13, fontWeight:800 }}>#{idx+1}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:15 }}>{v.diagnosis}</div>
                      <div style={{ fontSize:12.5, color:'var(--muted)' }}>{v.createdAt ? new Date(v.createdAt).toLocaleDateString('en-US', { weekday:'short', month:'long', day:'numeric', year:'numeric' }) : ''}</div>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      {meds.length > 0 && <span className="badge badge-blue"><FaPills size={11}/>{meds.length} Rx</span>}
                      {v.followUpDate && <span className="badge badge-warn">Follow-up {localDate(v.followUpDate)?.toLocaleDateString('en-US', { month:'short', day:'numeric' })}</span>}
                    </div>
                  </div>
                  {v.symptoms && <div style={{ fontSize:13.5, color:'var(--ink-soft)' }}>{v.symptoms}</div>}
                  {meds.length > 0 && (
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {meds.map((m,i) => (
                        <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12.5, fontWeight:600, color:'var(--primary)', background:'var(--royal-50)', padding:'5px 10px', borderRadius:'var(--r-pill)' }}>
                          <FaPills size={11}/>{m.name} {m.dosage}{m.unit} ×{m.quantity}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page" style={{ display:'flex', flexDirection:'column', gap:'var(--gap)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
        <div className="search" style={{ flex:1, maxWidth:420 }}>
          <FaSearch />
          <input className="input" placeholder="Search patients by name, ID, or email…"
            value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div style={{ flex:1 }} />
        {canEdit(user.role) && (
          <button className="btn btn-primary" onClick={() => setNewPatient(true)}>
            <FaUserPlus />New patient
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="card">
          <Empty
            icon={<FaUser />}
            title={q ? 'No matching patients' : 'No patients yet'}
            text={q ? 'Try another search.' : 'Add a patient to start recording visits.'}
            action={canEdit(user.role) && !q && (
              <button className="btn btn-primary" onClick={() => setNewPatient(true)}><FaUserPlus />New patient</button>
            )}
          />
        </div>
      ) : (
        <div className="rec-grid">
          {list.map(p => (
            <button key={p.id || p.email} className="rec-card" onClick={() => setSelected(p)}>
              <div className="rc-top">
                <Avatar name={p.name} role="patient" size={44} ring={false} />
                <div style={{ flex:1, minWidth:0 }}>
                  <b>{p.name}</b>
                  <span>{p.id_number || p.email || '—'}</span>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, color:'var(--muted)' }}>
                  {p.visitCount || 0} visit{(p.visitCount || 0) !== 1 ? 's' : ''}
                </span>
                {p.gender && <span style={{ fontSize:12, color:'var(--muted)' }}>{p.gender}{p.dob ? ` · ${calcAge(p.dob)} yrs` : ''}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <PatientDetail
          patient={selected}
          user={user}
          inventory={inventory}
          onClose={() => setSelected(null)}
          onVisitsChanged={load}
        />
      )}

      {newPatient && (
        <NewPatientFlow
          inventory={inventory}
          prefill={prefillPatient}
          onClose={() => { setNewPatient(false); setPrefillPatient(null); }}
          onSaved={() => { setNewPatient(false); setPrefillPatient(null); load(); }}
        />
      )}

      <style>{`
        .rec-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:var(--gap); }
        .rec-card { text-align:left; background:var(--surface); border:1px solid var(--line); border-radius:var(--r-md); padding:18px; box-shadow:var(--shadow-sm); transition:all .16s; display:flex; flex-direction:column; gap:14px; }
        .rec-card:hover { box-shadow:var(--shadow-md); transform:translateY(-2px); border-color:var(--royal-100); }
        .rc-top  { display:flex; align-items:center; gap:12px; }
        .rc-top b { display:block; font-size:15px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .rc-top span { font-size:12px; color:var(--muted); }
      `}</style>
    </div>
  );
}

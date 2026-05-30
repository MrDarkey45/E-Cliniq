import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { inventoryAPI } from '../services/api';
import { Stat, Empty, Modal, ModalHead, Confirm } from './ui';
import {
  FaPills, FaBoxOpen, FaChartBar, FaExclamationTriangle,
  FaSearch, FaPlus, FaMinus, FaEdit, FaTrash, FaCheck,
} from 'react-icons/fa';

const LOW = 10;
const canEdit = (role) => role === 'nurse' || role === 'admin';

const MED_UNITS    = ['mg', 'ml', 'tabs', 'caps'];
const SUPPLY_UNITS = ['pcs', 'rolls', 'boxes', 'bags', 'pairs', 'packs'];

// ── Item modal (Medicine or Supply) ──────────────────────────────────────────
function ItemModal({ item, onClose, onSaved }) {
  const { toast } = useToast();
  const isEdit = !!item;
  const [f, setF] = useState({
    name:     item?.name     || '',
    type:     item?.type     || 'Medicine',
    dosage:   item?.dosage   || '',
    size:     item?.size     || '',
    unit:     item?.unit     || 'mg',
    quantity: item?.quantity ?? '',
  });
  const [saving, setSaving] = useState(false);
  const isSupply = f.type === 'Supply';

  const setType = (type) => {
    setF(s => ({
      ...s,
      type,
      unit: type === 'Supply'
        ? (SUPPLY_UNITS.includes(s.unit) ? s.unit : 'pcs')
        : (MED_UNITS.includes(s.unit) ? s.unit : 'mg'),
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      name: f.name,
      type: f.type,
      unit: f.unit,
      quantity: parseInt(f.quantity) || 0,
      dosage: isSupply ? '' : f.dosage,
      size:   isSupply ? f.size : null,
    };
    try {
      if (isEdit) {
        // PUT is a full replace — send the whole object
        await inventoryAPI.update(item.id, { ...item, ...data });
        toast('Item updated', 'ok');
      } else {
        await inventoryAPI.create(data);
        toast('Item added', 'ok');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast(err.message || 'Failed to save', 'danger');
      setSaving(false);
    }
  };

  const units = isSupply ? SUPPLY_UNITS : MED_UNITS;

  return (
    <Modal onClose={onClose}>
      <ModalHead
        icon={isSupply ? <FaBoxOpen /> : <FaPills />}
        title={isEdit ? 'Edit item' : 'Add item'}
        onClose={onClose}
        accent="var(--gold-600)"
      />
      <form onSubmit={submit}>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Type toggle */}
          <div className="field">
            <label>Item type</label>
            <div className="seg" style={{ width: 'fit-content' }}>
              <button type="button" className={!isSupply ? 'on' : ''} onClick={() => setType('Medicine')}>Medicine</button>
              <button type="button" className={isSupply ? 'on' : ''} onClick={() => setType('Supply')}>Supply</button>
            </div>
          </div>

          <div className="field">
            <label>{isSupply ? 'Supply name' : 'Medicine name'}</label>
            <input className="input" value={f.name}
              onChange={e => setF({ ...f, name: e.target.value })}
              placeholder={isSupply ? 'e.g. Gauze Pads' : 'e.g. Amoxicillin'} required autoFocus />
          </div>

          <div className="form-grid">
            <div className="field">
              <label>{isSupply ? 'Size / spec' : 'Dosage'}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {isSupply ? (
                  <input className="input" value={f.size}
                    onChange={e => setF({ ...f, size: e.target.value })}
                    placeholder="e.g. 4x4 in" style={{ flex: 1 }} />
                ) : (
                  <input className="input" type="number" value={f.dosage}
                    onChange={e => setF({ ...f, dosage: e.target.value })}
                    placeholder="500" min="0" step="0.1" style={{ flex: 1 }} required />
                )}
                <select className="select" value={f.unit}
                  onChange={e => setF({ ...f, unit: e.target.value })} style={{ width: 100 }}>
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <span className="hint">{isSupply ? 'Dimensions or grade + packaging unit' : 'Per-unit strength'}</span>
            </div>
            <div className="field">
              <label>Quantity in stock</label>
              <input className="input" type="number" value={f.quantity}
                onChange={e => setF({ ...f, quantity: e.target.value })}
                placeholder="0" min="0" required />
              <span className="hint">Low-stock alert under {LOW} units</span>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-gold" disabled={saving}>
            <FaCheck />{isEdit ? 'Save changes' : 'Add item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function InventoryManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [q, setQ]                 = useState('');
  const [typeFilter, setTypeFilter] = useState('all');  // all | Medicine | Supply
  const [lowOnly, setLowOnly]       = useState(false);
  const [modal, setModal]         = useState(null);
  const [del, setDel]             = useState(null);
  const editable = canEdit(user?.role);

  const load = async () => {
    try {
      setInventory(await inventoryAPI.getAll());
    } catch (err) {
      toast('Failed to load inventory', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdjust = async (item, delta) => {
    const newQty = Math.max(0, item.quantity + delta);
    setInventory(inv => inv.map(m => m.id === item.id ? { ...m, quantity: newQty } : m));
    try {
      await inventoryAPI.update(item.id, { ...item, quantity: newQty });
    } catch (err) {
      toast('Failed to update stock', 'danger');
      load();
    }
  };

  const handleDelete = async (item) => {
    try {
      await inventoryAPI.delete(item.id);
      setInventory(inv => inv.filter(m => m.id !== item.id));
      toast(`${item.name} removed`, 'ok');
    } catch (err) {
      toast('Failed to delete item', 'danger');
    }
  };

  const specOf = (m) => m.type === 'Supply' ? (m.size || '') : m.dosage;

  let list = inventory.filter(m => {
    const hay = `${m.name} ${specOf(m)} ${m.unit}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  if (typeFilter !== 'all') list = list.filter(m => (m.type || 'Medicine') === typeFilter);
  if (lowOnly) list = list.filter(m => m.quantity < LOW);
  list = [...list].sort((a, b) => a.quantity - b.quantity);

  const medCount    = inventory.filter(m => (m.type || 'Medicine') === 'Medicine').length;
  const supplyCount = inventory.filter(m => m.type === 'Supply').length;
  const lowCount    = inventory.filter(m => m.quantity < LOW).length;
  const maxQ        = Math.max(60, ...inventory.map(m => m.quantity));

  const statusOf = (qty) => {
    if (qty === 0) return { c: 'badge-danger', t: 'Out of stock' };
    if (qty < LOW) return { c: 'badge-warn',   t: 'Low stock' };
    return             { c: 'badge-ok',     t: 'In stock' };
  };

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>

      <div className="dash-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Stat label="Medicines" value={medCount}    icon={<FaPills />}    tone="blue" />
        <Stat label="Supplies"  value={supplyCount} icon={<FaBoxOpen />}  tone="gold" />
        <Stat
          label="Need restocking"
          value={lowCount}
          icon={<FaExclamationTriangle />}
          tone={lowCount ? 'coral' : 'green'}
          delta={lowCount ? 'below threshold' : 'all healthy'}
        />
      </div>

      <div className="card">
        <div className="card-head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="search" style={{ flex: 1, minWidth: 200 }}>
            <FaSearch />
            <input className="input" placeholder="Search items, dosage, or size…"
              value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="seg">
            <button className={typeFilter === 'all' ? 'on' : ''} onClick={() => setTypeFilter('all')}>All</button>
            <button className={typeFilter === 'Medicine' ? 'on' : ''} onClick={() => setTypeFilter('Medicine')}>Medicines</button>
            <button className={typeFilter === 'Supply' ? 'on' : ''} onClick={() => setTypeFilter('Supply')}>Supplies</button>
          </div>
          <button className={`btn btn-sm ${lowOnly ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setLowOnly(v => !v)}>
            <FaExclamationTriangle size={12} />Low stock
          </button>
          {editable && (
            <button className="btn btn-gold" onClick={() => setModal({})}>
              <FaPlus />Add item
            </button>
          )}
        </div>

        {list.length === 0 ? (
          <Empty
            icon={<FaBoxOpen />}
            title="No items found"
            text={q || lowOnly || typeFilter !== 'all' ? 'Try adjusting the filters.' : 'Add your first item to start tracking.'}
            action={editable && !q && (
              <button className="btn btn-gold" onClick={() => setModal({})}>
                <FaPlus />Add item
              </button>
            )}
          />
        ) : (
          <div className="inv-table">
            <div className="inv-head">
              <div>Item</div>
              <div>Spec</div>
              <div className="ic">Stock level</div>
              <div className="ic">Quantity</div>
              <div>Status</div>
              {editable && <div />}
            </div>
            {list.map(m => {
              const isSupply = m.type === 'Supply';
              const st   = statusOf(m.quantity);
              const pct  = Math.min(100, (m.quantity / maxQ) * 100);
              const barC = m.quantity === 0 ? 'var(--danger)' : m.quantity < LOW ? 'var(--warn)' : 'var(--ok)';
              return (
                <div className={`inv-row ${m.quantity < LOW ? 'low' : ''}`} key={m.id}>
                  <div className="inv-name">
                    <div className="inv-ico" style={{ background: `color-mix(in srgb, ${barC} 14%, transparent)`, color: barC }}>
                      {isSupply ? <FaBoxOpen size={17} /> : <FaPills size={18} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <b>{m.name}</b>
                      <span className={`badge ${isSupply ? 'badge-gold' : 'badge-blue'}`} style={{ marginLeft: 8, verticalAlign: 'middle' }}>
                        {isSupply ? 'Supply' : 'Medicine'}
                      </span>
                    </div>
                  </div>
                  <div className="inv-dose">{specOf(m) || '—'}<span>{m.unit}</span></div>
                  <div className="ic inv-barwrap">
                    <div className="inv-bar"><span style={{ width: `${pct}%`, background: barC }} /></div>
                  </div>
                  <div className="ic">
                    {editable ? (
                      <div className="qty">
                        <button onClick={() => handleAdjust(m, -1)} disabled={m.quantity === 0}><FaMinus size={12} /></button>
                        <b>{m.quantity}</b>
                        <button onClick={() => handleAdjust(m, 1)}><FaPlus size={12} /></button>
                      </div>
                    ) : (
                      <b style={{ fontSize: 16, fontWeight: 800 }}>{m.quantity}</b>
                    )}
                  </div>
                  <div><span className={`badge ${st.c}`}>{st.t}</span></div>
                  {editable && (
                    <div className="inv-actions">
                      <button className="icon-btn" onClick={() => setModal({ item: m })} title="Edit"><FaEdit size={15} /></button>
                      <button className="icon-btn inv-del" onClick={() => setDel(m)} title="Delete"><FaTrash size={15} /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal !== null && (
        <ItemModal item={modal.item} onClose={() => setModal(null)} onSaved={load} />
      )}
      {del && (
        <Confirm
          danger
          title="Delete item?"
          text={`${del.name} will be permanently removed from inventory.`}
          confirmLabel="Delete"
          onConfirm={() => handleDelete(del)}
          onClose={() => setDel(null)}
        />
      )}

      <style>{`
        .inv-table { padding: 6px 0 10px; }
        .inv-head, .inv-row {
          display: grid;
          grid-template-columns: 2.4fr 1fr 1.6fr 1.1fr 1.1fr ${editable ? 'auto' : ''};
          align-items: center; gap: 14px; padding: 0 var(--gap);
        }
        .inv-head {
          font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
          color: var(--muted); padding-top: 10px; padding-bottom: 10px;
          border-bottom: 1px solid var(--line-soft);
        }
        .ic { text-align: center; }
        .inv-row { padding-top: 11px; padding-bottom: 11px; border-bottom: 1px solid var(--line-soft); transition: background .12s; }
        .inv-row:last-child { border-bottom: none; }
        .inv-row:hover { background: var(--surface-2); }
        .inv-row.low { background: color-mix(in srgb, var(--warn) 4%, transparent); }
        .inv-name { display: flex; align-items: center; gap: 12px; }
        .inv-ico { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; flex: 0 0 38px; }
        .inv-name b { font-size: 14.5px; font-weight: 700; }
        .inv-dose { font-size: 15px; font-weight: 800; letter-spacing: -.01em; }
        .inv-dose span { font-size: 12px; color: var(--muted); font-weight: 600; margin-left: 2px; }
        .inv-barwrap { padding: 0 4px; }
        .inv-bar { height: 8px; border-radius: 99px; background: var(--line); overflow: hidden; }
        .inv-bar span { display: block; height: 100%; border-radius: 99px; transition: width .4s; }
        .inv-actions { display: flex; gap: 7px; justify-content: flex-end; }
        .icon-btn.inv-del:hover { background: var(--danger-bg); color: var(--danger); border-color: var(--danger-bg); }
        @media (max-width: 860px) {
          .inv-head { display: none; }
          .inv-row { grid-template-columns: 1fr auto; grid-auto-rows: auto; row-gap: 8px; padding: 14px var(--gap); }
          .inv-barwrap { grid-column: 1 / -1; }
          .inv-dose { text-align: right; }
        }
      `}</style>
    </div>
  );
}

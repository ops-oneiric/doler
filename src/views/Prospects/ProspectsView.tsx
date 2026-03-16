import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { DataTable } from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import * as store from '../../store';
import { markProspectAsWon } from '../../utils/helpers';
import type { Prospect, ProspectStatus, PreviousVendor, Region, Ancillary } from '../../types';

const STATUSES: ProspectStatus[] = ['Active', 'Won', 'Lost'];
const VENDORS: PreviousVendor[] = ['Internal Simple', 'Internal Complex', 'External', 'None'];
const REGIONS: Region[] = ['Central', 'Northeast', 'South', 'West'];
const ANCILLARY_OPTIONS: Ancillary[] = ['TLM', 'ETS', 'GLI', 'WOTC', 'MEP', 'RS', 'LMS', 'API'];

const emptyProspect = (): Omit<Prospect, 'token'> => ({
  legalName: '',
  probability: 50,
  status: 'Active',
  employeeCount: 0,
  controlCount: 1,
  hqState: '',
  stateCount: 1,
  targetInputDate: '',
  carvesOutBenefits: false,
  previousVendor: 'None',
  revenue: 0,
  closeDate: null,
});

export function ProspectsView() {
  useStore();

  const allProspects = store.getProspects();
  const activeProspects = allProspects.filter((p) => p.status === 'Active')
    .sort((a, b) => a.targetInputDate.localeCompare(b.targetInputDate));
  const archived = allProspects.filter((p) => p.status !== 'Active');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyProspect());
  const [showArchive, setShowArchive] = useState(false);

  // Won modal
  const [wonProspect, setWonProspect] = useState<Prospect | null>(null);
  const [wonForm, setWonForm] = useState({
    clientId: '',
    startDate: '',
    firstInputDate: '',
    benefitsDate: '',
    region: 'Central' as Region,
    ancillaries: null as Ancillary[] | null,
  });

  const columns: Column<Prospect>[] = [
    { key: 'legalName', label: 'Legal Name' },
    { key: 'probability', label: 'Prob %', getValue: (r) => r.probability },
    { key: 'employeeCount', label: 'Employees', getValue: (r) => r.employeeCount },
    { key: 'controlCount', label: 'Controls', getValue: (r) => r.controlCount },
    { key: 'hqState', label: 'HQ State' },
    { key: 'targetInputDate', label: 'Target Input' },
    { key: 'revenue', label: 'Revenue', render: (r) => `$${r.revenue.toLocaleString()}` },
    { key: 'previousVendor', label: 'Prev Vendor' },
  ];

  const archiveColumns: Column<Prospect>[] = [
    { key: 'legalName', label: 'Legal Name' },
    { key: 'status', label: 'Status' },
    { key: 'closeDate', label: 'Close Date' },
    { key: 'employeeCount', label: 'Employees', getValue: (r) => r.employeeCount },
    { key: 'revenue', label: 'Revenue', render: (r) => `$${r.revenue.toLocaleString()}` },
  ];

  const handleCreate = () => {
    if (!form.legalName) return;
    store.createProspect(form);
    setForm(emptyProspect());
    setShowCreate(false);
  };

  const handleStatusChange = (prospect: Prospect, status: ProspectStatus) => {
    if (status === 'Won') {
      setWonProspect(prospect);
      setWonForm({
        clientId: '',
        startDate: '',
        firstInputDate: prospect.targetInputDate,
        benefitsDate: '',
        region: 'Central',
        ancillaries: null,
      });
    } else if (status === 'Lost') {
      store.updateProspect(prospect.token, {
        status: 'Lost',
        closeDate: new Date().toISOString().slice(0, 10),
      });
    }
  };

  const handleWonConfirm = () => {
    if (!wonProspect || !wonForm.clientId) return;
    markProspectAsWon(wonProspect.token, wonForm);
    setWonProspect(null);
  };

  return (
    <div className="view">
      <div className="view__header">
        <h1 className="view__title">Prospects</h1>
        <div className="view__header-actions">
          <button className="btn btn--outline" onClick={() => setShowArchive(true)}>Archive</button>
          <button className="btn btn--primary" onClick={() => { setShowCreate(true); setForm(emptyProspect()); }}>+ New Prospect</button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={activeProspects}
        keyField="token"
        actions={(row) => (
          <div className="inline-actions">
            <select
              value={row.status}
              onChange={(e) => handleStatusChange(row, e.target.value as ProspectStatus)}
              className="inline-select"
            >
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        )}
      />

      {/* Create Prospect */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Prospect">
        <div className="form-stack">
          <div className="form-group">
            <label>Legal Name</label>
            <input value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Probability %</label>
              <input type="number" min={0} max={100} value={form.probability} onChange={(e) => setForm({ ...form, probability: +e.target.value })} />
            </div>
            <div className="form-group">
              <label>Revenue ($)</label>
              <input type="number" min={0} step={100} value={form.revenue} onChange={(e) => setForm({ ...form, revenue: +e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Employee Count</label>
              <input type="number" min={0} value={form.employeeCount} onChange={(e) => setForm({ ...form, employeeCount: +e.target.value })} />
            </div>
            <div className="form-group">
              <label>Control Count</label>
              <input type="number" min={1} value={form.controlCount} onChange={(e) => setForm({ ...form, controlCount: +e.target.value })} />
            </div>
            <div className="form-group">
              <label>State Count</label>
              <input type="number" min={1} value={form.stateCount} onChange={(e) => setForm({ ...form, stateCount: +e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>HQ State</label>
              <input value={form.hqState} onChange={(e) => setForm({ ...form, hqState: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} />
            </div>
            <div className="form-group">
              <label>Previous Vendor</label>
              <select value={form.previousVendor} onChange={(e) => setForm({ ...form, previousVendor: e.target.value as PreviousVendor })}>
                {VENDORS.map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Target Input Date</label>
            <input type="date" value={form.targetInputDate} onChange={(e) => setForm({ ...form, targetInputDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label>
              <input type="checkbox" checked={form.carvesOutBenefits} onChange={(e) => setForm({ ...form, carvesOutBenefits: e.target.checked })} />
              {' '}Carves Out Benefits
            </label>
          </div>
          <button className="btn btn--primary" onClick={handleCreate}>Create Prospect</button>
        </div>
      </Modal>

      {/* Won → Client creation modal */}
      <Modal open={!!wonProspect} onClose={() => setWonProspect(null)} title={`Mark Won — ${wonProspect?.legalName ?? ''}`}>
        {wonProspect && (
          <div className="form-stack">
            <p className="text-muted">
              Create a client from this prospect. Fields have been pre-filled where possible.
            </p>
            <div className="form-group">
              <label>Client ID</label>
              <input value={wonForm.clientId} onChange={(e) => setWonForm({ ...wonForm, clientId: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Region</label>
              <select value={wonForm.region} onChange={(e) => setWonForm({ ...wonForm, region: e.target.value as Region })}>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" value={wonForm.startDate} onChange={(e) => setWonForm({ ...wonForm, startDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label>First Input Date</label>
                <input type="date" value={wonForm.firstInputDate} onChange={(e) => setWonForm({ ...wonForm, firstInputDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Benefits Date</label>
                <input type="date" value={wonForm.benefitsDate} onChange={(e) => setWonForm({ ...wonForm, benefitsDate: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Ancillaries</label>
              <div className="checkbox-group">
                {ANCILLARY_OPTIONS.map((a) => (
                  <label key={a} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={wonForm.ancillaries?.includes(a) ?? false}
                      onChange={(e) => {
                        const current = wonForm.ancillaries ?? [];
                        const next = e.target.checked ? [...current, a] : current.filter((x) => x !== a);
                        setWonForm({ ...wonForm, ancillaries: next.length > 0 ? next : null });
                      }}
                    />
                    {a}
                  </label>
                ))}
              </div>
            </div>
            <button className="btn btn--primary" onClick={handleWonConfirm}>Create Client & Mark Won</button>
          </div>
        )}
      </Modal>

      {/* Archive */}
      <Modal open={showArchive} onClose={() => setShowArchive(false)} title="Archived Prospects" wide>
        <DataTable columns={archiveColumns} data={archived} keyField="token" />
      </Modal>
    </div>
  );
}

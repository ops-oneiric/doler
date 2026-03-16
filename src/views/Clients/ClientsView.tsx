import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useStore } from '../../hooks/useStore';
import { DataTable } from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { SearchSelect } from '../../components/SearchSelect';
import * as store from '../../store';
import { getActiveImplClients, markClientTransitioned, markClientTerminated } from '../../utils/helpers';
import type { Client, ClientStatus, ImplementationPhase, Region, Ancillary } from '../../types';

const REGIONS: Region[] = ['Central', 'Northeast', 'South', 'West'];
const STATUSES: ClientStatus[] = ['Active', 'Terminated', 'No Start'];
const PHASES: ImplementationPhase[] = ['Startup', 'Setup', 'Post Payroll', 'Transitioned'];
const ANCILLARY_OPTIONS: Ancillary[] = ['TLM', 'ETS', 'GLI', 'WOTC', 'MEP', 'RS', 'LMS', 'API'];
const PIE_COLORS = ['#D0271D', '#4A90D9', '#50C878', '#F59E0B'];

const emptyClient = (): Omit<Client, 'token'> => ({
  clientId: '',
  prospectToken: null,
  legalName: '',
  status: 'Active',
  implementationPhase: 'Startup',
  transitionedToPayroll: false,
  employeeCount: 0,
  controlCount: 1,
  hqState: '',
  region: 'Central',
  stateCount: 1,
  ancillaries: null,
  carvesOutBenefits: false,
  primaryConsultant: null,
  secondaryConsultant: null,
  nps: null,
  startDate: new Date().toISOString().slice(0, 10),
  firstInputDate: '',
  benefitsDate: '',
  assignmentDate: null,
  transitionDate: null,
  terminationDate: null,
});

export function ClientsView() {
  useStore();

  const activeImpl = getActiveImplClients();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyClient());
  const [fromProspect, setFromProspect] = useState(false);

  // Edit modal state
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [editForm, setEditForm] = useState(emptyClient());

  // Pie chart data
  const regionCounts = REGIONS.map((r) => ({
    name: r,
    value: activeImpl.filter((c) => c.region === r).length,
  }));

  const columns: Column<Client>[] = [
    { key: 'legalName', label: 'Client Name' },
    { key: 'status', label: 'Status' },
    { key: 'implementationPhase', label: 'Phase' },
    { key: 'employeeCount', label: 'Employees', getValue: (r) => r.employeeCount },
    { key: 'firstInputDate', label: 'First Input' },
    { key: 'region', label: 'Region' },
    { key: 'hqState', label: 'HQ State' },
  ];

  const handleCreate = () => {
    if (!form.clientId || !form.legalName) return;
    store.createClient(form);
    setForm(emptyClient());
    setShowCreate(false);
    setFromProspect(false);
  };

  const handlePhaseChange = (token: string, phase: ImplementationPhase) => {
    if (phase === 'Transitioned') {
      markClientTransitioned(token);
    } else {
      store.updateClient(token, { implementationPhase: phase });
    }
  };

  const handleStatusChange = (token: string, status: ClientStatus) => {
    if (status === 'Terminated') {
      markClientTerminated(token);
    } else {
      store.updateClient(token, { status });
    }
  };

  const openEdit = (client: Client) => {
    setEditClient(client);
    setEditForm({
      clientId: client.clientId,
      prospectToken: client.prospectToken,
      legalName: client.legalName,
      status: client.status,
      implementationPhase: client.implementationPhase,
      transitionedToPayroll: client.transitionedToPayroll,
      employeeCount: client.employeeCount,
      controlCount: client.controlCount,
      hqState: client.hqState,
      region: client.region,
      stateCount: client.stateCount,
      ancillaries: client.ancillaries,
      carvesOutBenefits: client.carvesOutBenefits,
      primaryConsultant: client.primaryConsultant,
      secondaryConsultant: client.secondaryConsultant,
      nps: client.nps,
      startDate: client.startDate,
      firstInputDate: client.firstInputDate,
      benefitsDate: client.benefitsDate,
      assignmentDate: client.assignmentDate,
      transitionDate: client.transitionDate,
      terminationDate: client.terminationDate,
    });
  };

  const handleEditSave = () => {
    if (!editClient) return;
    store.updateClient(editClient.token, editForm);
    setEditClient(null);
  };

  // Prospect options for creating from prospect
  const prospects = store.getProspects().filter((p) => p.status === 'Active');
  const prospectOptions = prospects.map((p) => ({
    value: p.token,
    label: p.legalName,
    meta: `${p.employeeCount} EEs · ${p.hqState}`,
  }));

  const fillFromProspect = (prospectToken: string | null) => {
    if (!prospectToken) {
      setFromProspect(false);
      return;
    }
    const p = store.getProspect(prospectToken);
    if (!p) return;
    setForm({
      ...form,
      prospectToken,
      legalName: p.legalName,
      employeeCount: p.employeeCount,
      controlCount: p.controlCount,
      hqState: p.hqState,
      stateCount: p.stateCount,
      carvesOutBenefits: p.carvesOutBenefits,
      firstInputDate: p.targetInputDate,
    });
    setFromProspect(true);
  };

  return (
    <div className="view">
      <div className="view__header">
        <h1 className="view__title">Clients</h1>
        <button className="btn btn--primary" onClick={() => { setShowCreate(true); setForm(emptyClient()); setFromProspect(false); }}>+ New Client</button>
      </div>

      <h2 className="view__subtitle">Clients by Region</h2>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={regionCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
              {regionCounts.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <h2 className="view__subtitle">Active Implementation Clients</h2>
      <DataTable
        columns={columns}
        data={activeImpl}
        keyField="token"
        onRowClick={openEdit}
        actions={(row) => (
          <div className="inline-actions">
            <select
              value={row.implementationPhase}
              onChange={(e) => handlePhaseChange(row.token, e.target.value as ImplementationPhase)}
              className="inline-select"
            >
              {PHASES.map((p) => <option key={p}>{p}</option>)}
            </select>
            <select
              value={row.status}
              onChange={(e) => handleStatusChange(row.token, e.target.value as ClientStatus)}
              className="inline-select"
            >
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        )}
      />

      {/* Edit Client Modal */}
      <Modal open={!!editClient} onClose={() => setEditClient(null)} title={`Edit: ${editClient?.legalName ?? ''}`} wide>
        <div className="form-stack">
          <div className="form-row">
            <div className="form-group">
              <label>Client ID</label>
              <input value={editForm.clientId} onChange={(e) => setEditForm({ ...editForm, clientId: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Legal Name</label>
              <input value={editForm.legalName} onChange={(e) => setEditForm({ ...editForm, legalName: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ClientStatus })}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Phase</label>
              <select value={editForm.implementationPhase} onChange={(e) => setEditForm({ ...editForm, implementationPhase: e.target.value as ImplementationPhase })}>
                {PHASES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Employee Count</label>
              <input type="number" min={0} value={editForm.employeeCount} onChange={(e) => setEditForm({ ...editForm, employeeCount: +e.target.value })} />
            </div>
            <div className="form-group">
              <label>Control Count</label>
              <input type="number" min={1} value={editForm.controlCount} onChange={(e) => setEditForm({ ...editForm, controlCount: +e.target.value })} />
            </div>
            <div className="form-group">
              <label>State Count</label>
              <input type="number" min={1} value={editForm.stateCount} onChange={(e) => setEditForm({ ...editForm, stateCount: +e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>HQ State</label>
              <input value={editForm.hqState} onChange={(e) => setEditForm({ ...editForm, hqState: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} />
            </div>
            <div className="form-group">
              <label>Region</label>
              <select value={editForm.region} onChange={(e) => setEditForm({ ...editForm, region: e.target.value as Region })}>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>NPS</label>
              <input type="number" min={0} max={10} value={editForm.nps ?? ''} onChange={(e) => setEditForm({ ...editForm, nps: e.target.value ? +e.target.value : null })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>First Input Date</label>
              <input type="date" value={editForm.firstInputDate} onChange={(e) => setEditForm({ ...editForm, firstInputDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Benefits Date</label>
              <input type="date" value={editForm.benefitsDate} onChange={(e) => setEditForm({ ...editForm, benefitsDate: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Ancillaries</label>
            <div className="checkbox-group">
              {ANCILLARY_OPTIONS.map((a) => (
                <label key={a} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editForm.ancillaries?.includes(a) ?? false}
                    onChange={(e) => {
                      const current = editForm.ancillaries ?? [];
                      const next = e.target.checked
                        ? [...current, a]
                        : current.filter((x) => x !== a);
                      setEditForm({ ...editForm, ancillaries: next.length > 0 ? next : null });
                    }}
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>
              <input type="checkbox" checked={editForm.carvesOutBenefits} onChange={(e) => setEditForm({ ...editForm, carvesOutBenefits: e.target.checked })} />
              {' '}Carves Out Benefits
            </label>
          </div>
          <button className="btn btn--primary" onClick={handleEditSave}>Save Changes</button>
        </div>
      </Modal>

      {/* New Client Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Client" wide>
        <div className="form-stack">
          <div className="form-group">
            <label>Create from Prospect (optional)</label>
            <SearchSelect
              options={prospectOptions}
              value={form.prospectToken}
              onChange={fillFromProspect}
              placeholder="Select prospect…"
              clearable
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Client ID</label>
              <input value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Legal Name</label>
              <input value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
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
              <label>Region</label>
              <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value as Region })}>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>First Input Date</label>
              <input type="date" value={form.firstInputDate} onChange={(e) => setForm({ ...form, firstInputDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Benefits Date</label>
              <input type="date" value={form.benefitsDate} onChange={(e) => setForm({ ...form, benefitsDate: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Ancillaries</label>
            <div className="checkbox-group">
              {ANCILLARY_OPTIONS.map((a) => (
                <label key={a} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.ancillaries?.includes(a) ?? false}
                    onChange={(e) => {
                      const current = form.ancillaries ?? [];
                      const next = e.target.checked
                        ? [...current, a]
                        : current.filter((x) => x !== a);
                      setForm({ ...form, ancillaries: next.length > 0 ? next : null });
                    }}
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>
              <input type="checkbox" checked={form.carvesOutBenefits} onChange={(e) => setForm({ ...form, carvesOutBenefits: e.target.checked })} />
              {' '}Carves Out Benefits
            </label>
          </div>
          <button className="btn btn--primary" onClick={handleCreate}>Create Client</button>
        </div>
      </Modal>
    </div>
  );
}

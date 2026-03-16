import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { SummaryCard } from '../../components/SummaryCard';
import { DataTable } from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { SearchSelect } from '../../components/SearchSelect';
import { getActiveAssociates, getActiveImplClients, getUnassignedClients } from '../../utils/helpers';
import { assignAssociates } from '../../utils/helpers';
import { getRecommendations } from '../../engine/recommend';
import { getAssociate } from '../../store';
import type { Client, Recommendation } from '../../types';

export function QueueView() {
  useStore();

  const activeAssocs = getActiveAssociates();
  const activeClients = getActiveImplClients();
  const unassigned = getUnassignedClients();

  const avgControls = activeAssocs.length > 0
    ? (activeClients.reduce((s, c) => s + c.controlCount, 0) / activeAssocs.length).toFixed(1)
    : '0';

  const [selected, setSelected] = useState<Client | null>(null);
  const [primaryPick, setPrimaryPick] = useState<string | null>(null);
  const [secondaryPick, setSecondaryPick] = useState<string | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);

  const openDetail = (client: Client) => {
    setSelected(client);
    setPrimaryPick(null);
    setSecondaryPick(null);
    setRecs(getRecommendations(client.token, 'IC'));
  };

  const handleAssign = () => {
    if (!selected || !primaryPick) return;
    assignAssociates(selected.token, primaryPick, secondaryPick);
    setSelected(null);
  };

  const columns: Column<Client>[] = [
    { key: 'legalName', label: 'Client Name' },
    { key: 'firstInputDate', label: 'First Input Date' },
    { key: 'controlCount', label: 'Controls', getValue: (r) => r.controlCount },
    { key: 'employeeCount', label: 'Employees', getValue: (r) => r.employeeCount },
    { key: 'hqState', label: 'HQ State' },
    { key: 'region', label: 'Region' },
  ];

  const icOptions = activeAssocs.filter((a) => a.role === 'IC').map((a) => ({
    value: a.token,
    label: a.fullName,
    meta: `${a.role}${a.isHybrid ? ' (Hybrid)' : ''} · ${a.workState}`,
  }));

  const ipcOptions = activeAssocs.filter((a) => a.role === 'IPC' || (a.role === 'IC' && a.isHybrid)).map((a) => ({
    value: a.token,
    label: a.fullName,
    meta: `${a.role}${a.isHybrid ? ' (Hybrid)' : ''} · ${a.workState}`,
  }));

  return (
    <div className="view">
      <h1 className="view__title">Assignment Queue</h1>

      <div className="summary-row">
        <SummaryCard label="Active Associates" value={activeAssocs.length} />
        <SummaryCard label="Clients in Implementation" value={activeClients.length} />
        <SummaryCard label="Avg Controls / Associate" value={avgControls} />
      </div>

      <h2 className="view__subtitle">Pending Assignments</h2>
      <DataTable
        columns={columns}
        data={unassigned}
        keyField="token"
        onRowClick={openDetail}
      />

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.legalName ?? ''} wide>
        {selected && (
          <div className="queue-detail">
            <div className="queue-detail__grid">
              <div><strong>Client ID:</strong> {selected.clientId}</div>
              <div><strong>Status:</strong> {selected.status}</div>
              <div><strong>Phase:</strong> {selected.implementationPhase}</div>
              <div><strong>Employees:</strong> {selected.employeeCount}</div>
              <div><strong>Controls:</strong> {selected.controlCount}</div>
              <div><strong>States:</strong> {selected.stateCount}</div>
              <div><strong>HQ State:</strong> {selected.hqState}</div>
              <div><strong>Region:</strong> {selected.region}</div>
              <div><strong>Start Date:</strong> {selected.startDate}</div>
              <div><strong>First Input:</strong> {selected.firstInputDate}</div>
              <div><strong>Benefits Date:</strong> {selected.benefitsDate}</div>
              <div><strong>Ancillaries:</strong> {selected.ancillaries?.join(', ') || 'None'}</div>
              <div><strong>Carves Benefits:</strong> {selected.carvesOutBenefits ? 'Yes' : 'No'}</div>
            </div>

            <h3>Assign Team</h3>
            <div className="queue-detail__assign">
              <div className="form-group">
                <label>Primary Consultant (IC)</label>
                <SearchSelect options={icOptions} value={primaryPick} onChange={setPrimaryPick} placeholder="Select IC…" clearable />
              </div>
              <div className="form-group">
                <label>Secondary Consultant (IPC) — Optional</label>
                <SearchSelect options={ipcOptions} value={secondaryPick} onChange={setSecondaryPick} placeholder="Select IPC…" clearable />
              </div>
              <button className="btn btn--primary" onClick={handleAssign} disabled={!primaryPick}>
                Assign
              </button>
            </div>

            <h3>Recommended Associates</h3>
            <div className="recs-list">
              {recs.length === 0 && <p className="text-muted">No recommendations available.</p>}
              {recs.slice(0, 10).map((rec, i) => {
                const a = getAssociate(rec.associateToken);
                if (!a) return null;
                return (
                  <div
                    key={rec.associateToken}
                    className={`rec-card ${primaryPick === rec.associateToken ? 'rec-card--selected' : ''}`}
                    onClick={() => setPrimaryPick(rec.associateToken)}
                  >
                    <div className="rec-card__rank">#{i + 1}</div>
                    <div className="rec-card__info">
                      <strong>{a.fullName}</strong>
                      <span>{a.role}{a.isHybrid ? ' (Hybrid)' : ''} · {a.workState}</span>
                    </div>
                    <div className="rec-card__score">{(rec.score * 100).toFixed(0)}%</div>
                    <div className="rec-card__reasons">
                      {rec.reasons.slice(0, 3).map((r, j) => (
                        <span key={j} className="rec-card__reason">{r}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

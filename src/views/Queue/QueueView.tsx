import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { SummaryCard } from '../../components/SummaryCard';
import { DataTable } from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { SearchSelect } from '../../components/SearchSelect';
import { getActiveAssociates, getActiveImplClients, getUnassignedClients, getAssociateClients } from '../../utils/helpers';
import { assignAssociates } from '../../utils/helpers';
import { getRecommendations } from '../../engine/recommend';
import { getAssociate } from '../../store';
import type { Client, Recommendation } from '../../types';

/**
 * Detect whether a client fits the Hybrid model.
 * Hybrid is appropriate for smaller clients when IPC associates are stretched
 * thin (each assigned to many clients on average).
 */
function detectHybridFit(client: Client): { isHybrid: boolean; reason: string } {
  const SMALL_EMPLOYEE_THRESHOLD = 100;
  const IPC_CLIENT_LOAD_THRESHOLD = 4;

  if (client.employeeCount > SMALL_EMPLOYEE_THRESHOLD) {
    return { isHybrid: false, reason: '' };
  }

  const activeAssocs = getActiveAssociates();
  const ipcs = activeAssocs.filter((a) => a.role === 'IPC' || (a.role === 'IC' && a.isHybrid));
  if (ipcs.length === 0) {
    return { isHybrid: true, reason: 'No IPC associates available; a Hybrid IC can cover both roles.' };
  }

  const totalIpcClients = ipcs.reduce((sum, a) => {
    const clients = getAssociateClients(a.token).filter(
      (c) => c.status === 'Active' && c.implementationPhase !== 'Transitioned',
    );
    return sum + clients.length;
  }, 0);
  const avgLoad = totalIpcClients / ipcs.length;

  if (avgLoad >= IPC_CLIENT_LOAD_THRESHOLD) {
    return {
      isHybrid: true,
      reason: `Smaller client (${client.employeeCount} EEs) and IPCs are at high utilization (avg ${avgLoad.toFixed(1)} clients each). A Hybrid IC as Primary can handle both IC and IPC duties.`,
    };
  }

  return { isHybrid: false, reason: '' };
}

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
  const [icRecs, setIcRecs] = useState<Recommendation[]>([]);
  const [ipcRecs, setIpcRecs] = useState<Recommendation[]>([]);
  const [hybridInfo, setHybridInfo] = useState<{ isHybrid: boolean; reason: string }>({ isHybrid: false, reason: '' });

  const openDetail = (client: Client) => {
    setSelected(client);
    setPrimaryPick(null);
    setSecondaryPick(null);
    setIcRecs(getRecommendations(client.token, 'IC'));
    setIpcRecs(getRecommendations(client.token, 'IPC'));
    setHybridInfo(detectHybridFit(client));
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

  const renderRecCard = (
    rec: Recommendation,
    index: number,
    selectedToken: string | null,
    onSelect: (token: string) => void,
  ) => {
    const a = getAssociate(rec.associateToken);
    if (!a) return null;
    return (
      <div
        key={rec.associateToken}
        className={`rec-card ${selectedToken === rec.associateToken ? 'rec-card--selected' : ''}`}
        onClick={() => onSelect(rec.associateToken)}
      >
        <div className="rec-card__rank">#{index + 1}</div>
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
  };

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

            {hybridInfo.isHybrid && (
              <div className="queue-detail__hybrid-banner">
                <strong>Hybrid Recommendation:</strong> {hybridInfo.reason}
              </div>
            )}

            <h3>Assign Team</h3>
            <div className="queue-detail__assign">
              <div className="form-group">
                <label>Primary Consultant (IC{hybridInfo.isHybrid ? ' / Hybrid' : ''})</label>
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

            <div className="queue-detail__recs-split">
              <div className="queue-detail__recs-column">
                <h3>Recommended IC</h3>
                <div className="recs-list">
                  {icRecs.length === 0 && <p className="text-muted">No IC recommendations available.</p>}
                  {icRecs.slice(0, 5).map((rec, i) => renderRecCard(rec, i, primaryPick, setPrimaryPick))}
                </div>
              </div>

              <div className="queue-detail__recs-column">
                <h3>Recommended IPC</h3>
                <div className="recs-list">
                  {ipcRecs.length === 0 && <p className="text-muted">No IPC recommendations available.</p>}
                  {ipcRecs.slice(0, 5).map((rec, i) => renderRecCard(rec, i, secondaryPick, setSecondaryPick))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

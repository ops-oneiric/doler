import React, { useState } from 'react';
import { useTheme } from '../../components/ThemeProvider';
import { useStore } from '../../hooks/useStore';
import { exportDatabase, importDatabase, deleteAllData, getAssociates } from '../../store';
import { Modal } from '../../components/Modal';
import { generateAssociates, generateClientsAndProspects } from '../../utils/generateTrainingData';
import type { FontSize, ThemeMode } from '../../types';

export function SettingsView() {
  useStore();
  const { theme, fontSize, setTheme, setFontSize } = useTheme();
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Training set modal
  const [showTraining, setShowTraining] = useState(false);
  const [tsAssociates, setTsAssociates] = useState(20);
  const [tsClients, setTsClients] = useState(50);
  const [tsProspects, setTsProspects] = useState(15);
  const [tsError, setTsError] = useState<string | null>(null);

  const existingAssociates = getAssociates().filter((a) => a.status === 'Active');
  const hasAssociates = existingAssociates.length > 0;

  const handleExport = () => {
    const data = exportDatabase();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doler-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target?.result as string);
          importDatabase(data);
          setImportMsg(`Imported successfully.`);
          setTimeout(() => setImportMsg(null), 3000);
        } catch {
          setImportMsg('Failed to parse JSON.');
          setTimeout(() => setImportMsg(null), 3000);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleDelete = () => {
    deleteAllData();
    setConfirmDelete(false);
  };

  const handleGenerateTrainingSet = () => {
    setTsError(null);

    if (tsClients > 0 && !hasAssociates) {
      setTsError('You must have active associates in the database before generating client data. Create associates first (or generate associates-only with 0 clients).');
      return;
    }

    const clampedAssociates = Math.min(100, Math.max(0, tsAssociates));
    const clampedClients = Math.min(100, Math.max(0, tsClients));
    const clampedProspects = Math.min(100, Math.max(0, tsProspects));

    const associates = clampedAssociates > 0 ? generateAssociates(clampedAssociates) : [];
    const { clients, prospects } = clampedClients > 0 || clampedProspects > 0
      ? generateClientsAndProspects(clampedClients, clampedProspects, existingAssociates)
      : { clients: [], prospects: [] };

    const data = { associates, clients, prospects };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doler-training-set-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowTraining(false);
  };

  return (
    <div className="view">
      <h1 className="view__title">Settings</h1>

      <div className="settings-section">
        <h2>Appearance</h2>
        <div className="form-group">
          <label>Theme</label>
          <div className="toggle-group">
            {(['light', 'dark'] as ThemeMode[]).map((t) => (
              <button
                key={t}
                className={`toggle-btn ${theme === t ? 'toggle-btn--active' : ''}`}
                onClick={() => setTheme(t)}
              >
                {t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Font Size</label>
          <div className="toggle-group">
            {(['small', 'medium', 'large'] as FontSize[]).map((f) => (
              <button
                key={f}
                className={`toggle-btn ${fontSize === f ? 'toggle-btn--active' : ''}`}
                onClick={() => setFontSize(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Data Management</h2>
        <div className="settings-actions">
          <button className="btn btn--outline" onClick={handleExport}>Export Database to JSON</button>
          <button className="btn btn--outline" onClick={handleImport}>Import JSON to Database</button>
          <button className="btn btn--primary" onClick={() => { setShowTraining(true); setTsError(null); }}>Create Training Set</button>
          {importMsg && <span className="text-muted">{importMsg}</span>}
        </div>
      </div>

      <div className="settings-section">
        <h2>Danger Zone</h2>
        {!confirmDelete ? (
          <button className="btn btn--danger" onClick={() => setConfirmDelete(true)}>Delete All Data</button>
        ) : (
          <div className="confirm-row">
            <span>Are you sure? This cannot be undone.</span>
            <button className="btn btn--danger" onClick={handleDelete}>Yes, Delete Everything</button>
            <button className="btn btn--outline" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        )}
      </div>

      <Modal open={showTraining} onClose={() => setShowTraining(false)} title="Create Training Set">
        <div className="form-stack">
          <p className="text-muted">
            Generate randomized data and download as a JSON file. Data is not imported into the database.
          </p>

          <div className="form-group">
            <label>Associates (max 100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={tsAssociates}
              onChange={(e) => setTsAssociates(Math.min(100, Math.max(0, +e.target.value)))}
            />
            <span className="text-muted">All generated associates will be Active with past hire dates.</span>
          </div>

          <div className="form-group">
            <label>Clients (max 100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={tsClients}
              onChange={(e) => setTsClients(Math.min(100, Math.max(0, +e.target.value)))}
            />
            {!hasAssociates && tsClients > 0 && (
              <span className="text-warn">
                Requires active associates in the database. Add associates first.
              </span>
            )}
            <span className="text-muted">
              Each client will include a linked Won prospect. Employees: 10–5,000 (median ~75). Controls: 1–100 (median ~2).
            </span>
          </div>

          <div className="form-group">
            <label>Additional Active Prospects (max 100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={tsProspects}
              onChange={(e) => setTsProspects(Math.min(100, Math.max(0, +e.target.value)))}
            />
            <span className="text-muted">Standalone active prospects (not yet won).</span>
          </div>

          {tsError && <div className="alert alert--danger">{tsError}</div>}

          <button
            className="btn btn--primary"
            onClick={handleGenerateTrainingSet}
            disabled={tsAssociates === 0 && tsClients === 0 && tsProspects === 0}
          >
            Generate & Download JSON
          </button>
        </div>
      </Modal>
    </div>
  );
}

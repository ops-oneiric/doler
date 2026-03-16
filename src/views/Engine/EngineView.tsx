import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore';
import * as store from '../../store';
import { retrainModel } from '../../engine/recommend';
import type { EngineWeights } from '../../types';
import { DEFAULT_ENGINE_WEIGHTS } from '../../types';

const WEIGHT_LABELS: Record<keyof EngineWeights, string> = {
  pastExperience: 'Past Experience with Similar Clients',
  npsHistory: 'NPS History with Similar Clients',
  noStartHistory: 'No-Start Rate (penalizes high rates)',
  ancillaryExperience: 'Ancillary Product Experience',
  futureTimeOff: 'Future Time Off Avoidance',
  skillsAndTenure: 'Skills & Tenure Match',
  timelineUrgency: 'Timeline Urgency Fit',
  timezoneMatch: 'Timezone Proximity',
  currentWorkload: 'Current Workload Capacity',
  controlGroupExperience: 'Multi-Control-Group Experience',
};

export function EngineView() {
  useStore();

  const [weights, setWeights] = useState<EngineWeights>(store.getEngineWeights());
  const [trainResult, setTrainResult] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const handleWeightChange = (key: keyof EngineWeights, value: number) => {
    const next = { ...weights, [key]: value };
    setWeights(next);
    store.saveEngineWeights(next);
  };

  const handleReset = () => {
    setWeights(DEFAULT_ENGINE_WEIGHTS);
    store.saveEngineWeights(DEFAULT_ENGINE_WEIGHTS);
  };

  const handleSync = () => {
    const result = retrainModel();
    setTrainResult(`Model retrained using ${result.clientsUsed} clients across ${result.associatesScored} active associates.`);
    setTimeout(() => setTrainResult(null), 5000);
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
          const clients = Array.isArray(data) ? data : data.clients;
          if (!Array.isArray(clients)) {
            setImportResult('Invalid format: expected an array of clients or { clients: [...] }');
            return;
          }
          store.setTrainingData(clients);
          setImportResult(`Imported ${clients.length} clients for training (not added to database).`);
          setTimeout(() => setImportResult(null), 5000);
        } catch {
          setImportResult('Failed to parse JSON file.');
          setTimeout(() => setImportResult(null), 5000);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const total = Object.values(weights).reduce((s, v) => s + v, 0);

  return (
    <div className="view">
      <h1 className="view__title">Recommendation Engine</h1>

      <div className="engine-actions">
        <button className="btn btn--primary" onClick={handleSync}>Sync / Retrain Model</button>
        <button className="btn btn--outline" onClick={handleImport}>Import Training Data (JSON)</button>
        <button className="btn btn--outline" onClick={handleReset}>Reset to Defaults</button>
      </div>

      {trainResult && <div className="alert alert--success">{trainResult}</div>}
      {importResult && <div className="alert alert--info">{importResult}</div>}

      <h2 className="view__subtitle">Factor Weights</h2>
      <p className="text-muted">
        Adjust the relative importance of each factor. Total: {(total * 100).toFixed(0)}%
        {Math.abs(total - 1) > 0.01 && <span className="text-warn"> (should sum to ~100%)</span>}
      </p>

      <div className="weights-grid">
        {(Object.keys(WEIGHT_LABELS) as (keyof EngineWeights)[]).map((key) => (
          <div key={key} className="weight-row">
            <label className="weight-row__label">{WEIGHT_LABELS[key]}</label>
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.01}
              value={weights[key]}
              onChange={(e) => handleWeightChange(key, +e.target.value)}
              className="weight-row__slider"
            />
            <span className="weight-row__value">{(weights[key] * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>

      <h2 className="view__subtitle">How It Works</h2>
      <div className="engine-info">
        <p>
          The recommendation engine evaluates each active associate against a pending client
          using {Object.keys(WEIGHT_LABELS).length} weighted factors derived from historical
          implementation data.
        </p>
        <ul>
          <li><strong>Past Experience:</strong> How frequently an associate has implemented clients with similar size, region, and state complexity.</li>
          <li><strong>NPS History:</strong> Average NPS scores from similar past clients.</li>
          <li><strong>No-Start Rate:</strong> Penalizes associates with higher no-start rates among their client history.</li>
          <li><strong>Ancillary Experience:</strong> Matches the client's ancillary products against the associate's implementation history.</li>
          <li><strong>Time Off:</strong> Avoids associates who have scheduled time off near critical implementation dates.</li>
          <li><strong>Skills & Tenure:</strong> Reserves experienced associates for more complex clients with more employees, controls, and states.</li>
          <li><strong>Timeline Urgency:</strong> Favors experienced associates when the first input date is approaching quickly.</li>
          <li><strong>Timezone Match:</strong> Prefers associates in the same or nearby time zone.</li>
          <li><strong>Current Workload:</strong> Favors associates with fewer active implementations in progress.</li>
          <li><strong>Control Group Experience:</strong> Values experience with multi-control-group clients when relevant.</li>
        </ul>
      </div>
    </div>
  );
}

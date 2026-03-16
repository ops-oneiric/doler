import React, { useState } from 'react';
import { useTheme } from '../../components/ThemeProvider';
import { exportDatabase, importDatabase, deleteAllData } from '../../store';
import type { FontSize, ThemeMode } from '../../types';

export function SettingsView() {
  const { theme, fontSize, setTheme, setFontSize } = useTheme();
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    </div>
  );
}

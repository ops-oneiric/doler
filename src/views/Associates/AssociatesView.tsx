import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { DataTable } from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { CalendarPicker } from '../../components/CalendarPicker';
import * as store from '../../store';
import { getAssociateClients, getLastAssignmentDate } from '../../utils/helpers';
import type { Associate, AssociateRole, AssociateStatus, Region, Client } from '../../types';

const REGIONS: Region[] = ['Central', 'Northeast', 'South', 'West'];
const ROLES: AssociateRole[] = ['IC', 'IPC'];
const STATUSES: AssociateStatus[] = ['Active', 'Leave', 'Terminated'];
const SKILL_OPTIONS = [
  'Payroll', 'Benefits', 'TLM', 'GL', 'Onboarding', 'Tax', 'HR', 'Reporting',
  'API Integration', 'Multi-State', 'Multi-EIN', 'WOTC', 'LMS',
];

const emptyAssociate = (): Omit<Associate, 'token'> => ({
  fullName: '',
  status: 'Active',
  role: 'IC',
  hireDate: new Date().toISOString().slice(0, 10),
  isHybrid: false,
  skills: [],
  timeOff: [],
  workState: '',
  region: 'Central',
});

export function AssociatesView() {
  useStore();

  const associates = store.getAssociates().filter((a) => a.status === 'Active');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyAssociate());
  const [profile, setProfile] = useState<Associate | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Associate | null>(null);
  const [showTimeOff, setShowTimeOff] = useState<Associate | null>(null);

  const columns: Column<Associate>[] = [
    { key: 'fullName', label: 'Name' },
    { key: 'role', label: 'Role' },
    { key: 'isHybrid', label: 'Hybrid', render: (r) => r.isHybrid ? 'Yes' : 'No' },
    { key: 'workState', label: 'State' },
    { key: 'region', label: 'Region' },
    { key: 'hireDate', label: 'Hire Date' },
    { key: 'skills', label: 'Skills', render: (r) => r.skills.length.toString(), getValue: (r) => r.skills.length },
  ];

  const handleCreate = () => {
    if (!form.fullName || !form.workState) return;
    store.createAssociate(form);
    setForm(emptyAssociate());
    setShowCreate(false);
  };

  const handleSaveEdit = () => {
    if (!editForm) return;
    store.updateAssociate(editForm.token, editForm);
    setProfile(editForm);
    setEditing(false);
  };

  const profileClients = profile ? getAssociateClients(profile.token) : [];
  const lastAssignment = profile ? getLastAssignmentDate(profile.token) : null;

  return (
    <div className="view">
      <div className="view__header">
        <h1 className="view__title">Associates</h1>
        <button className="btn btn--primary" onClick={() => setShowCreate(true)}>+ New Associate</button>
      </div>

      <DataTable
        columns={columns}
        data={associates}
        keyField="token"
        onRowClick={(a) => { setProfile(a); setEditing(false); setEditForm(null); }}
        actions={(row) => (
          <button
            className="btn btn--sm btn--outline"
            onClick={(e) => { e.stopPropagation(); setShowTimeOff(row); }}
          >
            Time Off
          </button>
        )}
      />

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Associate">
        <div className="form-stack">
          <div className="form-group">
            <label>Full Name</label>
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AssociateRole })}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Hybrid</label>
              <input type="checkbox" checked={form.isHybrid} onChange={(e) => setForm({ ...form, isHybrid: e.target.checked })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Work State</label>
              <input value={form.workState} onChange={(e) => setForm({ ...form, workState: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} />
            </div>
            <div className="form-group">
              <label>Region</label>
              <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value as Region })}>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Hire Date</label>
            <input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Skills</label>
            <div className="checkbox-group">
              {SKILL_OPTIONS.map((s) => (
                <label key={s} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.skills.includes(s)}
                    onChange={(e) => {
                      const skills = e.target.checked
                        ? [...form.skills, s]
                        : form.skills.filter((x) => x !== s);
                      setForm({ ...form, skills });
                    }}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn--primary" onClick={handleCreate}>Create</button>
        </div>
      </Modal>

      {/* Profile Modal */}
      <Modal open={!!profile} onClose={() => setProfile(null)} title={profile?.fullName ?? ''} wide>
        {profile && !editing && (
          <div className="profile">
            <div className="profile__grid">
              <div><strong>Role:</strong> {profile.role}{profile.isHybrid ? ' (Hybrid)' : ''}</div>
              <div><strong>Status:</strong> {profile.status}</div>
              <div><strong>Work State:</strong> {profile.workState}</div>
              <div><strong>Region:</strong> {profile.region}</div>
              <div><strong>Hire Date:</strong> {profile.hireDate}</div>
              <div><strong>Skills:</strong> {profile.skills.join(', ') || 'None'}</div>
              <div><strong>Last Assignment:</strong> {lastAssignment ?? 'Never'}</div>
              <div><strong>Time Off:</strong> {profile.timeOff.length} days scheduled</div>
            </div>
            <button className="btn btn--outline" onClick={() => { setEditing(true); setEditForm({ ...profile }); }}>Edit</button>

            <h3>Assigned Clients ({profileClients.length})</h3>
            {profileClients.length === 0 && <p className="text-muted">No clients assigned.</p>}
            {profileClients.map((c) => (
              <div key={c.token} className="mini-card">
                <span>{c.legalName}</span>
                <span className="text-muted">{c.implementationPhase} · {c.status}</span>
              </div>
            ))}
          </div>
        )}
        {profile && editing && editForm && (
          <div className="form-stack">
            <div className="form-group">
              <label>Full Name</label>
              <input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as AssociateStatus })}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as AssociateRole })}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Hybrid</label>
                <input type="checkbox" checked={editForm.isHybrid} onChange={(e) => setEditForm({ ...editForm, isHybrid: e.target.checked })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Work State</label>
                <input value={editForm.workState} onChange={(e) => setEditForm({ ...editForm, workState: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} />
              </div>
              <div className="form-group">
                <label>Region</label>
                <select value={editForm.region} onChange={(e) => setEditForm({ ...editForm, region: e.target.value as Region })}>
                  {REGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Skills</label>
              <div className="checkbox-group">
                {SKILL_OPTIONS.map((s) => (
                  <label key={s} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={editForm.skills.includes(s)}
                      onChange={(e) => {
                        const skills = e.target.checked
                          ? [...editForm.skills, s]
                          : editForm.skills.filter((x) => x !== s);
                        setEditForm({ ...editForm, skills });
                      }}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-row">
              <button className="btn btn--primary" onClick={handleSaveEdit}>Save</button>
              <button className="btn btn--outline" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Time Off Modal */}
      <Modal open={!!showTimeOff} onClose={() => setShowTimeOff(null)} title={`Time Off — ${showTimeOff?.fullName ?? ''}`}>
        {showTimeOff && (
          <CalendarPicker
            selectedDates={showTimeOff.timeOff}
            onChange={(dates) => {
              store.updateAssociate(showTimeOff.token, { timeOff: dates });
              setShowTimeOff({ ...showTimeOff, timeOff: dates });
            }}
          />
        )}
      </Modal>
    </div>
  );
}

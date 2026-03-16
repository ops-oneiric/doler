// ── Data Types ──────────────────────────────────────────────────────────────

export type Region = 'Central' | 'Northeast' | 'South' | 'West';
export type AssociateStatus = 'Active' | 'Leave' | 'Terminated';
export type AssociateRole = 'IC' | 'IPC';
export type ClientStatus = 'Active' | 'Terminated' | 'No Start';
export type ImplementationPhase = 'Startup' | 'Setup' | 'Post Payroll' | 'Transitioned';
export type ProspectStatus = 'Active' | 'Won' | 'Lost';
export type PreviousVendor = 'Internal Simple' | 'Internal Complex' | 'External' | 'None';
export type Ancillary = 'TLM' | 'ETS' | 'GLI' | 'WOTC' | 'MEP' | 'RS' | 'LMS' | 'API';

export interface Associate {
  token: string;
  status: AssociateStatus;
  role: AssociateRole;
  hireDate: string;
  isHybrid: boolean;
  skills: string[];
  timeOff: string[];
  fullName: string;
  workState: string;
  region: Region;
}

export interface Client {
  clientId: string;
  token: string;
  prospectToken: string | null;
  legalName: string;
  status: ClientStatus;
  implementationPhase: ImplementationPhase;
  transitionedToPayroll: boolean;
  employeeCount: number;
  controlCount: number;
  hqState: string;
  region: Region;
  stateCount: number;
  ancillaries: Ancillary[] | null;
  carvesOutBenefits: boolean;
  primaryConsultant: string | null;
  secondaryConsultant: string | null;
  nps: number | null;
  startDate: string;
  firstInputDate: string;
  benefitsDate: string;
  assignmentDate: string | null;
  transitionDate: string | null;
  terminationDate: string | null;
}

export interface Prospect {
  legalName: string;
  token: string;
  probability: number;
  status: ProspectStatus;
  employeeCount: number;
  controlCount: number;
  hqState: string;
  stateCount: number;
  targetInputDate: string;
  carvesOutBenefits: boolean;
  previousVendor: PreviousVendor;
  revenue: number;
  closeDate: string | null;
}

// ── Engine Config ───────────────────────────────────────────────────────────

export interface EngineWeights {
  pastExperience: number;
  npsHistory: number;
  noStartHistory: number;
  ancillaryExperience: number;
  futureTimeOff: number;
  skillsAndTenure: number;
  timelineUrgency: number;
  timezoneMatch: number;
  currentWorkload: number;
  controlGroupExperience: number;
}

export const DEFAULT_ENGINE_WEIGHTS: EngineWeights = {
  pastExperience: 0.15,
  npsHistory: 0.15,
  noStartHistory: 0.10,
  ancillaryExperience: 0.08,
  futureTimeOff: 0.12,
  skillsAndTenure: 0.10,
  timelineUrgency: 0.08,
  timezoneMatch: 0.07,
  currentWorkload: 0.10,
  controlGroupExperience: 0.05,
};

// ── Theme ───────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark';
export type FontSize = 'small' | 'medium' | 'large';

export interface AppSettings {
  theme: ThemeMode;
  fontSize: FontSize;
}

// ── Recommendation Result ───────────────────────────────────────────────────

export interface Recommendation {
  associateToken: string;
  score: number;
  reasons: string[];
}

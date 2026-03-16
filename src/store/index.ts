import { v4 as uuid } from 'uuid';
import type {
  Associate,
  Client,
  Prospect,
  EngineWeights,
  AppSettings,
  DEFAULT_ENGINE_WEIGHTS,
} from '../types';
import { DEFAULT_ENGINE_WEIGHTS as DEFAULTS } from '../types';

// ── Persistence keys ────────────────────────────────────────────────────────

const KEYS = {
  associates: 'doler_associates',
  clients: 'doler_clients',
  prospects: 'doler_prospects',
  engineWeights: 'doler_engine_weights',
  trainingData: 'doler_training_data',
  settings: 'doler_settings',
} as const;

// ── Generic helpers ─────────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Store (simple pub/sub) ──────────────────────────────────────────────────

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}

// ── Associates ──────────────────────────────────────────────────────────────

export function getAssociates(): Associate[] {
  return load<Associate[]>(KEYS.associates, []);
}

export function getAssociate(token: string): Associate | undefined {
  return getAssociates().find((a) => a.token === token);
}

export function createAssociate(data: Omit<Associate, 'token'>): Associate {
  const item: Associate = { ...data, token: uuid() };
  const all = getAssociates();
  all.push(item);
  save(KEYS.associates, all);
  notify();
  return item;
}

export function updateAssociate(token: string, patch: Partial<Associate>): Associate | null {
  const all = getAssociates();
  const idx = all.findIndex((a) => a.token === token);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch, token };
  save(KEYS.associates, all);
  notify();
  return all[idx];
}

export function deleteAssociate(token: string): boolean {
  const all = getAssociates();
  const filtered = all.filter((a) => a.token !== token);
  if (filtered.length === all.length) return false;
  save(KEYS.associates, filtered);
  notify();
  return true;
}

// ── Clients ─────────────────────────────────────────────────────────────────

export function getClients(): Client[] {
  return load<Client[]>(KEYS.clients, []);
}

export function getClient(token: string): Client | undefined {
  return getClients().find((c) => c.token === token);
}

export function createClient(data: Omit<Client, 'token'>): Client {
  const item: Client = { ...data, token: uuid() };
  const all = getClients();
  all.push(item);
  save(KEYS.clients, all);
  notify();
  return item;
}

export function updateClient(token: string, patch: Partial<Client>): Client | null {
  const all = getClients();
  const idx = all.findIndex((c) => c.token === token);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch, token };
  save(KEYS.clients, all);
  notify();
  return all[idx];
}

export function deleteClient(token: string): boolean {
  const all = getClients();
  const filtered = all.filter((c) => c.token !== token);
  if (filtered.length === all.length) return false;
  save(KEYS.clients, filtered);
  notify();
  return true;
}

// ── Prospects ───────────────────────────────────────────────────────────────

export function getProspects(): Prospect[] {
  return load<Prospect[]>(KEYS.prospects, []);
}

export function getProspect(token: string): Prospect | undefined {
  return getProspects().find((p) => p.token === token);
}

export function createProspect(data: Omit<Prospect, 'token'>): Prospect {
  const item: Prospect = { ...data, token: uuid() };
  const all = getProspects();
  all.push(item);
  save(KEYS.prospects, all);
  notify();
  return item;
}

export function updateProspect(token: string, patch: Partial<Prospect>): Prospect | null {
  const all = getProspects();
  const idx = all.findIndex((p) => p.token === token);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch, token };
  save(KEYS.prospects, all);
  notify();
  return all[idx];
}

export function deleteProspect(token: string): boolean {
  const all = getProspects();
  const filtered = all.filter((p) => p.token !== token);
  if (filtered.length === all.length) return false;
  save(KEYS.prospects, filtered);
  notify();
  return true;
}

// ── Engine Weights ──────────────────────────────────────────────────────────

export function getEngineWeights(): EngineWeights {
  return load<EngineWeights>(KEYS.engineWeights, DEFAULTS);
}

export function saveEngineWeights(w: EngineWeights): void {
  save(KEYS.engineWeights, w);
  notify();
}

// ── Training Data (imported JSON clients for model training) ────────────────

export function getTrainingData(): Client[] {
  return load<Client[]>(KEYS.trainingData, []);
}

export function setTrainingData(data: Client[]): void {
  save(KEYS.trainingData, data);
  notify();
}

export function clearTrainingData(): void {
  localStorage.removeItem(KEYS.trainingData);
  notify();
}

// ── Settings ────────────────────────────────────────────────────────────────

export function getSettings(): AppSettings {
  return load<AppSettings>(KEYS.settings, { theme: 'light', fontSize: 'medium' });
}

export function saveSettings(s: AppSettings): void {
  save(KEYS.settings, s);
  notify();
}

// ── Bulk import / export / delete ───────────────────────────────────────────

export interface DatabaseExport {
  associates: Associate[];
  clients: Client[];
  prospects: Prospect[];
  engineWeights: EngineWeights;
  settings: AppSettings;
}

export function exportDatabase(): DatabaseExport {
  return {
    associates: getAssociates(),
    clients: getClients(),
    prospects: getProspects(),
    engineWeights: getEngineWeights(),
    settings: getSettings(),
  };
}

export function importDatabase(data: Partial<DatabaseExport>): { associates: number; clients: number; prospects: number } {
  let added = { associates: 0, clients: 0, prospects: 0 };

  if (data.associates?.length) {
    const existing = getAssociates();
    const existingTokens = new Set(existing.map((a) => a.token));
    const newItems = data.associates.filter((a) => !existingTokens.has(a.token));
    save(KEYS.associates, [...existing, ...newItems]);
    added.associates = newItems.length;
  }

  if (data.clients?.length) {
    const existing = getClients();
    const existingTokens = new Set(existing.map((c) => c.token));
    const newItems = data.clients.filter((c) => !existingTokens.has(c.token));
    save(KEYS.clients, [...existing, ...newItems]);
    added.clients = newItems.length;
  }

  if (data.prospects?.length) {
    const existing = getProspects();
    const existingTokens = new Set(existing.map((p) => p.token));
    const newItems = data.prospects.filter((p) => !existingTokens.has(p.token));
    save(KEYS.prospects, [...existing, ...newItems]);
    added.prospects = newItems.length;
  }

  if (data.engineWeights) save(KEYS.engineWeights, data.engineWeights);
  if (data.settings) save(KEYS.settings, data.settings);
  notify();
  return added;
}

export function deleteAllData(): void {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  notify();
}

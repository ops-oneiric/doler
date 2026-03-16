import type { Associate, Client, EngineWeights, Recommendation } from '../types';
import * as store from '../store';
import { timezoneDifference, getActiveAssociates } from '../utils/helpers';

// ── Feature computation helpers ─────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return Math.abs(
    (new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24),
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** How many past clients of this associate were "similar" to the target? */
function similarityCount(assoc: Associate, target: Client, allClients: Client[]): number {
  const pastClients = allClients.filter(
    (c) =>
      (c.primaryConsultant === assoc.token || c.secondaryConsultant === assoc.token) &&
      c.assignmentDate,
  );
  return pastClients.filter((c) => {
    const regionMatch = c.region === target.region;
    const sizeMatch = Math.abs(c.employeeCount - target.employeeCount) < Math.max(target.employeeCount * 0.5, 50);
    const stateMatch = c.stateCount <= target.stateCount + 3 && c.stateCount >= target.stateCount - 3;
    return (regionMatch ? 1 : 0) + (sizeMatch ? 1 : 0) + (stateMatch ? 1 : 0) >= 2;
  }).length;
}

/** Average NPS of similar past clients */
function avgNpsOfSimilar(assoc: Associate, target: Client, allClients: Client[]): number {
  const pastClients = allClients.filter(
    (c) =>
      (c.primaryConsultant === assoc.token || c.secondaryConsultant === assoc.token) &&
      c.nps !== null,
  );
  if (pastClients.length === 0) return 5; // neutral default
  const sameRegion = pastClients.filter((c) => c.region === target.region);
  const pool = sameRegion.length > 0 ? sameRegion : pastClients;
  return pool.reduce((s, c) => s + (c.nps ?? 0), 0) / pool.length;
}

/** Fraction of past clients that became No Starts (lower is better) */
function noStartRate(assoc: Associate, allClients: Client[]): number {
  const past = allClients.filter(
    (c) => c.primaryConsultant === assoc.token || c.secondaryConsultant === assoc.token,
  );
  if (past.length === 0) return 0;
  return past.filter((c) => c.status === 'No Start').length / past.length;
}

/** How many distinct ancillary types has this associate implemented? */
function ancillaryBreadth(assoc: Associate, target: Client, allClients: Client[]): number {
  if (!target.ancillaries || target.ancillaries.length === 0) return 1;
  const past = allClients.filter(
    (c) => c.primaryConsultant === assoc.token || c.secondaryConsultant === assoc.token,
  );
  const seenAnc = new Set(past.flatMap((c) => c.ancillaries ?? []));
  const matched = target.ancillaries.filter((a) => seenAnc.has(a)).length;
  return matched / target.ancillaries.length;
}

/** Does the associate have time off near critical dates? (0 = clear, 1 = conflicting) */
function timeOffConflict(assoc: Associate, target: Client): number {
  const criticalStart = new Date(target.firstInputDate).getTime();
  const benefitsDate = new Date(target.benefitsDate).getTime();
  const buffer = 14 * 24 * 60 * 60 * 1000; // 14 days in ms

  for (const d of assoc.timeOff) {
    const t = new Date(d).getTime();
    if (Math.abs(t - criticalStart) < buffer) return 1;
    if (Math.abs(t - benefitsDate) < buffer) return 1;
  }
  return 0;
}

/** Tenure in years */
function tenureYears(assoc: Associate): number {
  return daysBetween(assoc.hireDate, today()) / 365;
}

/** Skills score relative to client complexity */
function skillsFit(assoc: Associate, target: Client): number {
  const complexity =
    (target.employeeCount > 100 ? 1 : 0) +
    (target.controlCount > 1 ? 1 : 0) +
    (target.stateCount > 3 ? 1 : 0) +
    ((target.ancillaries?.length ?? 0) > 2 ? 1 : 0);
  const skillsScore = assoc.skills.length + tenureYears(assoc) * 0.5;
  if (complexity <= 1) return 1; // simple client, anyone works
  return Math.min(1, skillsScore / (complexity * 2));
}

/** How urgent is this implementation? (higher = more urgent) */
function urgencyFit(assoc: Associate, target: Client): number {
  const daysUntilInput = daysBetween(today(), target.firstInputDate);
  if (daysUntilInput > 60) return 1; // plenty of time
  const readiness = (tenureYears(assoc) * 0.4 + assoc.skills.length * 0.15);
  return Math.min(1, readiness / (1 + (60 - daysUntilInput) / 60));
}

/** Timezone proximity (0 = same, 1 = worst) */
function timezoneFit(assoc: Associate, target: Client): number {
  const diff = timezoneDifference(assoc.workState, target.hqState);
  return Math.max(0, 1 - diff / 5);
}

/** Current workload (fewer active clients = higher score) */
function workloadScore(assoc: Associate, allClients: Client[]): number {
  const activeCount = allClients.filter(
    (c) =>
      (c.primaryConsultant === assoc.token || c.secondaryConsultant === assoc.token) &&
      c.status === 'Active' &&
      c.implementationPhase !== 'Transitioned',
  ).length;
  return Math.max(0, 1 - activeCount / 15);
}

/** Experience with multi-control-group clients */
function controlGroupExp(assoc: Associate, target: Client, allClients: Client[]): number {
  if (target.controlCount <= 1) return 1;
  const past = allClients.filter(
    (c) =>
      (c.primaryConsultant === assoc.token || c.secondaryConsultant === assoc.token) &&
      c.controlCount > 1,
  );
  return Math.min(1, past.length / 5);
}

// ── Main recommendation function ────────────────────────────────────────────

export function getRecommendations(
  clientToken: string,
  roleFilter?: 'IC' | 'IPC',
): Recommendation[] {
  const weights = store.getEngineWeights();
  const allClients = [...store.getClients(), ...store.getTrainingData()];
  const client = store.getClient(clientToken);
  if (!client) return [];

  const associates = getActiveAssociates().filter((a) => {
    if (roleFilter) {
      if (roleFilter === 'IC') return a.role === 'IC';
      if (roleFilter === 'IPC') return a.role === 'IPC' || (a.role === 'IC' && a.isHybrid);
    }
    return true;
  });

  const scored: Recommendation[] = associates.map((assoc) => {
    const features: Record<keyof EngineWeights, number> = {
      pastExperience: Math.min(1, similarityCount(assoc, client, allClients) / 10),
      npsHistory: avgNpsOfSimilar(assoc, client, allClients) / 10,
      noStartHistory: 1 - noStartRate(assoc, allClients),
      ancillaryExperience: ancillaryBreadth(assoc, client, allClients),
      futureTimeOff: 1 - timeOffConflict(assoc, client),
      skillsAndTenure: skillsFit(assoc, client),
      timelineUrgency: urgencyFit(assoc, client),
      timezoneMatch: timezoneFit(assoc, client),
      currentWorkload: workloadScore(assoc, allClients),
      controlGroupExperience: controlGroupExp(assoc, client, allClients),
    };

    let score = 0;
    const reasons: string[] = [];
    for (const key of Object.keys(weights) as (keyof EngineWeights)[]) {
      score += features[key] * weights[key];
      if (features[key] >= 0.8) {
        reasons.push(`Strong ${formatKey(key)} (${(features[key] * 100).toFixed(0)}%)`);
      } else if (features[key] <= 0.3) {
        reasons.push(`Weak ${formatKey(key)} (${(features[key] * 100).toFixed(0)}%)`);
      }
    }

    return { associateToken: assoc.token, score, reasons };
  });

  return scored.sort((a, b) => b.score - a.score);
}

function formatKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
}

// ── Re-train: recalculate internal stats (placeholder for real ML) ──────────

export function retrainModel(): { clientsUsed: number; associatesScored: number } {
  const allClients = [...store.getClients(), ...store.getTrainingData()];
  const assocs = getActiveAssociates();
  // In a production system, this would run gradient descent or similar.
  // Here the scoring functions above act as the "trained model" using
  // all available client history as the training corpus.
  return { clientsUsed: allClients.length, associatesScored: assocs.length };
}

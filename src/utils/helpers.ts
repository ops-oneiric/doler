import type { Associate, Client, Prospect, Region } from '../types';
import * as store from '../store';

// ── Time-zone map (US state → IANA offset bucket) ──────────────────────────

const STATE_TZ: Record<string, number> = {
  // Eastern (UTC-5)
  CT: -5, DE: -5, FL: -5, GA: -5, IN: -5, KY: -5, MA: -5, MD: -5, ME: -5,
  MI: -5, NC: -5, NH: -5, NJ: -5, NY: -5, OH: -5, PA: -5, RI: -5, SC: -5,
  VA: -5, VT: -5, WV: -5, DC: -5,
  // Central (UTC-6)
  AL: -6, AR: -6, IA: -6, IL: -6, KS: -6, LA: -6, MN: -6, MO: -6, MS: -6,
  ND: -6, NE: -6, OK: -6, SD: -6, TN: -6, TX: -6, WI: -6,
  // Mountain (UTC-7)
  AZ: -7, CO: -7, ID: -7, MT: -7, NM: -7, UT: -7, WY: -7,
  // Pacific (UTC-8)
  CA: -8, NV: -8, OR: -8, WA: -8,
  // Alaska / Hawaii
  AK: -9, HI: -10,
};

export function getTimezoneOffset(state: string): number {
  return STATE_TZ[state.toUpperCase()] ?? -5;
}

export function timezoneDifference(stateA: string, stateB: string): number {
  return Math.abs(getTimezoneOffset(stateA) - getTimezoneOffset(stateB));
}

// ── Helper: Mark Prospect as Won → create Client ────────────────────────────

export function markProspectAsWon(
  prospectToken: string,
  extra: {
    clientId: string;
    startDate: string;
    firstInputDate: string;
    benefitsDate: string;
    ancillaries?: Client['ancillaries'];
    region: Region;
  },
): Client | null {
  const prospect = store.getProspect(prospectToken);
  if (!prospect) return null;

  store.updateProspect(prospectToken, {
    status: 'Won',
    closeDate: new Date().toISOString().slice(0, 10),
  });

  return store.createClient({
    clientId: extra.clientId,
    prospectToken,
    legalName: prospect.legalName,
    status: 'Active',
    implementationPhase: 'Startup',
    transitionedToPayroll: false,
    employeeCount: prospect.employeeCount,
    controlCount: prospect.controlCount,
    hqState: prospect.hqState,
    region: extra.region,
    stateCount: prospect.stateCount,
    ancillaries: extra.ancillaries ?? null,
    carvesOutBenefits: prospect.carvesOutBenefits,
    primaryConsultant: null,
    secondaryConsultant: null,
    nps: null,
    startDate: extra.startDate,
    firstInputDate: extra.firstInputDate,
    benefitsDate: extra.benefitsDate,
    assignmentDate: null,
    transitionDate: null,
    terminationDate: null,
  });
}

// ── Helper: Most recent assignment date for an associate ────────────────────

export function getLastAssignmentDate(associateToken: string): string | null {
  const clients = store.getClients();
  const dates = clients
    .filter(
      (c) =>
        (c.primaryConsultant === associateToken ||
          c.secondaryConsultant === associateToken) &&
        c.assignmentDate,
    )
    .map((c) => c.assignmentDate as string)
    .sort()
    .reverse();
  return dates[0] ?? null;
}

// ── Helper: Assign associate(s) to a client ─────────────────────────────────

export function assignAssociates(
  clientToken: string,
  primaryToken: string,
  secondaryToken?: string | null,
): Client | null {
  const today = new Date().toISOString().slice(0, 10);
  return store.updateClient(clientToken, {
    primaryConsultant: primaryToken,
    secondaryConsultant: secondaryToken ?? null,
    assignmentDate: today,
  });
}

// ── Helper: Transition a client ─────────────────────────────────────────────

export function markClientTransitioned(clientToken: string): Client | null {
  const today = new Date().toISOString().slice(0, 10);
  return store.updateClient(clientToken, {
    implementationPhase: 'Transitioned',
    transitionedToPayroll: true,
    transitionDate: today,
  });
}

// ── Helper: Terminate a client ──────────────────────────────────────────────

export function markClientTerminated(clientToken: string): Client | null {
  const today = new Date().toISOString().slice(0, 10);
  return store.updateClient(clientToken, {
    status: 'Terminated',
    terminationDate: today,
  });
}

// ── Active implementation clients ───────────────────────────────────────────

export function getActiveImplClients(): Client[] {
  return store.getClients().filter(
    (c) => c.implementationPhase !== 'Transitioned' && c.status === 'Active',
  );
}

// ── Active associates ───────────────────────────────────────────────────────

export function getActiveAssociates(): Associate[] {
  return store.getAssociates().filter((a) => a.status === 'Active');
}

// ── Clients assigned to a specific associate ────────────────────────────────

export function getAssociateClients(token: string): Client[] {
  return store.getClients().filter(
    (c) => c.primaryConsultant === token || c.secondaryConsultant === token,
  );
}

// ── Unassigned clients (no primary consultant, active) ──────────────────────

export function getUnassignedClients(): Client[] {
  return store.getClients()
    .filter((c) => !c.primaryConsultant && c.status === 'Active')
    .sort((a, b) => a.firstInputDate.localeCompare(b.firstInputDate));
}

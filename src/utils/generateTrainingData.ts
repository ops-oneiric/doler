import { v4 as uuid } from 'uuid';
import type {
  Associate,
  Client,
  Prospect,
  Region,
  ClientStatus,
  ImplementationPhase,
  Ancillary,
  PreviousVendor,
} from '../types';

// ── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/** Log-normal–ish distribution skewed toward a low median. */
function skewedEmployeeCount(): number {
  // Median ~75, range 10–5000
  // Use exponential with clamp
  const raw = Math.exp(randFloat(Math.log(10), Math.log(5000)));
  // Bias toward low end: blend with a lower value
  const biased = raw * 0.4 + Math.exp(randFloat(Math.log(10), Math.log(200))) * 0.6;
  return Math.max(10, Math.min(5000, Math.round(biased)));
}

/** Control count: median ~2, range 1–100 */
function skewedControlCount(): number {
  const raw = Math.exp(randFloat(Math.log(1), Math.log(100)));
  const biased = raw * 0.3 + Math.exp(randFloat(0, Math.log(5))) * 0.7;
  return Math.max(1, Math.min(100, Math.round(biased)));
}

function randomDate(start: Date, end: Date): string {
  const t = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(t).toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

const REGIONS: Region[] = ['Central', 'Northeast', 'South', 'West'];

const STATE_REGION: Record<string, Region> = {
  CT:'Northeast', DE:'Northeast', MA:'Northeast', MD:'Northeast', ME:'Northeast',
  NH:'Northeast', NJ:'Northeast', NY:'Northeast', PA:'Northeast', RI:'Northeast',
  VT:'Northeast', DC:'Northeast',
  AL:'South', AR:'South', FL:'South', GA:'South', KY:'South', LA:'South',
  MS:'South', NC:'South', SC:'South', TN:'South', TX:'South', VA:'South', WV:'South',
  IA:'Central', IL:'Central', IN:'Central', KS:'Central', MI:'Central', MN:'Central',
  MO:'Central', ND:'Central', NE:'Central', OH:'Central', OK:'Central', SD:'Central', WI:'Central',
  AK:'West', AZ:'West', CA:'West', CO:'West', HI:'West', ID:'West', MT:'West',
  NM:'West', NV:'West', OR:'West', UT:'West', WA:'West', WY:'West',
};

function regionForState(st: string): Region {
  return STATE_REGION[st] ?? pick(REGIONS);
}

const ANCILLARIES: Ancillary[] = ['TLM', 'ETS', 'GLI', 'WOTC', 'MEP', 'RS', 'LMS', 'API'];
const VENDORS: PreviousVendor[] = ['Internal Simple', 'Internal Complex', 'External', 'None'];

const COMPANY_PREFIXES = [
  'Apex', 'Summit', 'Pinnacle', 'Horizon', 'Atlas', 'Vertex', 'Nova', 'Meridian',
  'Catalyst', 'Sterling', 'Pioneer', 'Vanguard', 'Beacon', 'Nexus', 'Crest',
  'Pacific', 'Granite', 'Iron', 'Blue', 'Golden', 'Eagle', 'River', 'Oak',
  'Cedar', 'Crown', 'Liberty', 'Patriot', 'United', 'National', 'Premier',
];

const COMPANY_SUFFIXES = [
  'Industries', 'Solutions', 'Group', 'Corp', 'Services', 'Holdings',
  'Partners', 'Enterprises', 'Technologies', 'Systems', 'Associates', 'Co',
  'Consulting', 'Manufacturing', 'Logistics', 'Capital', 'Healthcare',
  'Construction', 'Properties', 'Foods', 'Energy', 'Media',
];

function randomCompanyName(): string {
  return `${pick(COMPANY_PREFIXES)} ${pick(COMPANY_SUFFIXES)}`;
}

const FIRST_NAMES = [
  'James','Mary','Robert','Patricia','John','Jennifer','Michael','Linda',
  'David','Elizabeth','William','Barbara','Richard','Susan','Joseph','Jessica',
  'Thomas','Sarah','Christopher','Karen','Charles','Lisa','Daniel','Nancy',
  'Matthew','Betty','Anthony','Margaret','Mark','Sandra','Donald','Ashley',
  'Steven','Emily','Paul','Donna','Andrew','Michelle','Joshua','Carol',
];

const LAST_NAMES = [
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis',
  'Rodriguez','Martinez','Hernandez','Lopez','Wilson','Anderson','Thomas',
  'Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White',
  'Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker',
];

// ── Generators ──────────────────────────────────────────────────────────────

export function generateAssociates(count: number): Associate[] {
  const today = new Date();
  const results: Associate[] = [];

  for (let i = 0; i < count; i++) {
    const role = Math.random() < 0.55 ? 'IC' : 'IPC';
    const isHybrid = role === 'IC' && Math.random() < 0.2;
    const workState = pick(US_STATES);
    const hireDate = randomDate(
      new Date(today.getFullYear() - 15, 0, 1),
      new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    );

    const skillPool = [
      'Payroll', 'Benefits', 'TLM', 'GL', 'Onboarding', 'Tax', 'HR',
      'Reporting', 'API Integration', 'Multi-State', 'Multi-EIN', 'WOTC', 'LMS',
    ];
    const skillCount = randInt(1, 6);
    const skills: string[] = [];
    for (let s = 0; s < skillCount; s++) {
      const sk = pick(skillPool);
      if (!skills.includes(sk)) skills.push(sk);
    }

    // Future time off: 0-8 random days in the next 90 days
    const timeOff: string[] = [];
    const offCount = randInt(0, 8);
    for (let t = 0; t < offCount; t++) {
      timeOff.push(addDays(today.toISOString().slice(0, 10), randInt(1, 90)));
    }

    results.push({
      token: uuid(),
      status: 'Active',
      role,
      hireDate,
      isHybrid,
      skills,
      timeOff: [...new Set(timeOff)].sort(),
      fullName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      workState,
      region: regionForState(workState),
    });
  }

  return results;
}

export function generateClientsAndProspects(
  clientCount: number,
  prospectCount: number,
  existingAssociates: Associate[],
): { clients: Client[]; prospects: Prospect[] } {
  const today = new Date();
  const clients: Client[] = [];
  const prospects: Prospect[] = [];
  const activeAssocs = existingAssociates.filter((a) => a.status === 'Active');
  const ics = activeAssocs.filter((a) => a.role === 'IC');
  const ipcs = activeAssocs.filter((a) => a.role === 'IPC' || (a.role === 'IC' && a.isHybrid));

  // Generate clients (each gets an associated "Won" prospect)
  for (let i = 0; i < clientCount; i++) {
    const hqState = pick(US_STATES);
    const region = regionForState(hqState);
    const employeeCount = skewedEmployeeCount();
    const controlCount = skewedControlCount();
    const stateCount = Math.max(1, Math.min(50, Math.round(Math.exp(randFloat(0, Math.log(Math.min(controlCount * 2, 20)))))));
    const legalName = randomCompanyName();

    // Dates: start 30-180 days ago, first input 14-60 days after start, benefits 7-30 days after first input
    const startDate = randomDate(
      new Date(today.getFullYear() - 1, today.getMonth(), 1),
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7),
    );
    const firstInputDate = addDays(startDate, randInt(14, 60));
    const benefitsDate = addDays(firstInputDate, randInt(7, 30));

    // Status distribution: 75% Active, 10% Terminated, 15% No Start-potential
    const statusRoll = Math.random();
    let status: ClientStatus = 'Active';
    let terminationDate: string | null = null;
    if (statusRoll > 0.9) {
      status = 'Terminated';
      terminationDate = addDays(firstInputDate, randInt(30, 180));
    } else if (statusRoll > 0.75) {
      status = 'No Start';
    }

    // Phase distribution for active clients
    let phase: ImplementationPhase = 'Startup';
    let transitionDate: string | null = null;
    let transitionedToPayroll = false;
    if (status === 'Active') {
      const phaseRoll = Math.random();
      if (phaseRoll < 0.25) phase = 'Startup';
      else if (phaseRoll < 0.5) phase = 'Setup';
      else if (phaseRoll < 0.7) phase = 'Post Payroll';
      else {
        phase = 'Transitioned';
        transitionedToPayroll = true;
        transitionDate = addDays(firstInputDate, randInt(60, 180));
      }
    }

    // Ancillaries: 0-4
    const ancCount = randInt(0, 4);
    const ancillaries: Ancillary[] = [];
    for (let a = 0; a < ancCount; a++) {
      const anc = pick(ANCILLARIES);
      if (!ancillaries.includes(anc)) ancillaries.push(anc);
    }

    // Assign consultants from existing associates
    const primaryConsultant = ics.length > 0 ? pick(ics).token : null;
    let secondaryConsultant: string | null = null;
    if (ipcs.length > 0 && Math.random() < 0.7) {
      const chosenIpc = pick(ipcs);
      if (chosenIpc.token !== primaryConsultant) {
        secondaryConsultant = chosenIpc.token;
      }
    }

    const assignmentDate = primaryConsultant
      ? addDays(startDate, randInt(-7, 7))
      : null;

    // NPS: 60% chance of having one
    const nps = Math.random() < 0.6 ? randInt(0, 10) : null;

    const prospectToken = uuid();
    const clientToken = uuid();

    // Create the associated Won prospect
    const revenue = Math.round(employeeCount * randFloat(8, 35) * 100) / 100;
    const closeDate = addDays(startDate, -randInt(7, 45));

    prospects.push({
      legalName,
      token: prospectToken,
      probability: 100,
      status: 'Won',
      employeeCount,
      controlCount,
      hqState,
      stateCount,
      targetInputDate: firstInputDate,
      carvesOutBenefits: Math.random() < 0.25,
      previousVendor: pick(VENDORS),
      revenue,
      closeDate,
    });

    clients.push({
      clientId: `C-${String(i + 1).padStart(5, '0')}`,
      token: clientToken,
      prospectToken,
      legalName,
      status,
      implementationPhase: phase,
      transitionedToPayroll,
      employeeCount,
      controlCount,
      hqState,
      region,
      stateCount,
      ancillaries: ancillaries.length > 0 ? ancillaries : null,
      carvesOutBenefits: prospects[prospects.length - 1].carvesOutBenefits,
      primaryConsultant,
      secondaryConsultant,
      nps,
      startDate,
      firstInputDate,
      benefitsDate,
      assignmentDate,
      transitionDate,
      terminationDate,
    });
  }

  // Generate standalone Active prospects (not yet won)
  for (let i = 0; i < prospectCount; i++) {
    const hqState = pick(US_STATES);
    const employeeCount = skewedEmployeeCount();
    const controlCount = skewedControlCount();
    const stateCount = Math.max(1, Math.min(50, Math.round(Math.exp(randFloat(0, Math.log(Math.min(controlCount * 2, 20)))))));
    const revenue = Math.round(employeeCount * randFloat(8, 35) * 100) / 100;
    const targetInputDate = addDays(
      today.toISOString().slice(0, 10),
      randInt(14, 120),
    );

    prospects.push({
      legalName: randomCompanyName(),
      token: uuid(),
      probability: randInt(10, 95),
      status: 'Active',
      employeeCount,
      controlCount,
      hqState,
      stateCount,
      targetInputDate,
      carvesOutBenefits: Math.random() < 0.25,
      previousVendor: pick(VENDORS),
      revenue,
      closeDate: null,
    });
  }

  return { clients, prospects };
}

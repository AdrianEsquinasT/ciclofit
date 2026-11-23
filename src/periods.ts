import { CycleSettings, addDays, fromISO } from './cycle';

export interface Period {
  start: string; // primer día de sangrado
  end?: string; // último día de sangrado (si ya terminó)
}

const days = (a: string, b: string) => Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000);
const sortP = (ps: Period[]) => [...ps].sort((a, b) => (a.start < b.start ? -1 : 1));

export interface CycleStats {
  intervals: number[]; // duración de los ciclos registrados (días)
  durations: number[]; // duración de las reglas registradas (días)
  avgCycle?: number;
  avgPeriod?: number;
  minCycle?: number;
  maxCycle?: number;
}

export function stats(periods: Period[]): CycleStats {
  const ps = sortP(periods);
  const intervals: number[] = [];
  for (let i = 1; i < ps.length; i++) {
    const d = days(ps[i - 1].start, ps[i].start);
    if (d >= 18 && d <= 60) intervals.push(d);
  }
  const durations = ps.filter((p) => p.end).map((p) => days(p.start, p.end!) + 1).filter((d) => d >= 2 && d <= 12) // <2 días: probable toque accidental;
  const mean = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : undefined);
  const recent = intervals.slice(-6);
  return {
    intervals,
    durations,
    avgCycle: mean(recent),
    avgPeriod: mean(durations.slice(-6)),
    minCycle: recent.length ? Math.min(...recent) : undefined,
    maxCycle: recent.length ? Math.max(...recent) : undefined,
  };
}

/**
 * Ajustes efectivos: última regla real + duraciones aprendidas de su historial.
 * Con pocos datos se mezcla con lo que escribió al empezar (n / (n + 2)).
 */
export function effective(base: CycleSettings, periods: Period[]): CycleSettings {
  const ps = sortP(periods);
  const st = stats(ps);
  const blend = (avg: number | undefined, n: number, fallback: number) =>
    avg === undefined ? fallback : (n * avg + 2 * fallback) / (n + 2);
  return {
    ...base,
    lastPeriodStart: ps.length ? ps[ps.length - 1].start : base.lastPeriodStart,
    cycleLength: Math.max(21, Math.min(45, Math.round(blend(st.avgCycle, Math.min(6, st.intervals.length), base.cycleLength)))),
    periodLength: Math.max(2, Math.min(8, Math.round(blend(st.avgPeriod, Math.min(6, st.durations.length), base.periodLength)))),
  };
}

export function startPeriod(periods: Period[], date: string, avgPeriod: number): Period[] {
  if (periods.some((p) => p.start === date)) return periods;
  const ps = sortP(periods).map((p, i, arr) => {
    // si la anterior quedó abierta, se cierra al empezar la nueva
    if (i === arr.length - 1 && !p.end && p.start < date) {
      const guess = addDays(p.start, Math.max(1, Math.round(avgPeriod)) - 1);
      return { ...p, end: guess < date ? guess : addDays(date, -1) };
    }
    return p;
  });
  return sortP([...ps, { start: date }]);
}

export function endPeriod(periods: Period[], date: string): Period[] {
  const ps = sortP(periods);
  const idx = [...ps].reverse().findIndex((p) => p.start <= date);
  if (idx < 0) return periods;
  const k = ps.length - 1 - idx;
  return ps.map((p, i) => (i === k ? { ...p, end: date } : p));
}

export const removePeriod = (periods: Period[], start: string) => periods.filter((p) => p.start !== start);

/** Días de regla (registrados o en curso) para pintar en el calendario. */
export function periodDays(periods: Period[], today: string, avg: number): Set<string> {
  const out = new Set<string>();
  for (const p of periods) {
    const last = p.end ?? (addDays(p.start, Math.max(1, Math.round(avg)) - 1) < today ? addDays(p.start, Math.max(1, Math.round(avg)) - 1) : today);
    for (let d = p.start; d <= last; d = addDays(d, 1)) out.add(d);
  }
  return out;
}

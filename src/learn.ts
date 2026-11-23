import type { PhaseId } from './cycle';

export interface LogEntry {
  f: number; // sensación 1-10
  p: PhaseId; // fase en el momento del registro
  c?: string; // inicio del ciclo al que pertenece (YYYY-MM-DD)
}
export type Log = Record<string, LogEntry>;

export interface PhaseStat {
  n: number; // registros usados
  mean: number; // sensación media en la fase
  w: number; // peso del aprendizaje (0..1), crece con los datos
}

export interface Learned {
  cycles: number; // ciclos con datos suficientes
  needed: number;
  active: boolean;
  total: number; // registros totales
  phases: Partial<Record<PhaseId, PhaseStat>>;
  best?: { phase: PhaseId; mean: number };
  dBest: number; // descuento (≤0) equivalente a la sensación media de su mejor fase
}

export const NEED_CYCLES = 2; // ciclos completos con datos antes de empezar a aprender
const MIN_ENTRIES_CYCLE = 7; // registros mínimos para que un ciclo cuente
const MIN_PHASE = 4; // registros mínimos por fase
const K = 6; // suavizado: w = n / (n + K)

const ALL: PhaseId[] = ['menstrual', 'follicular', 'ovulatory', 'earlyLuteal', 'lateLuteal'];

export function learn(log: Log): Learned {
  const entries = Object.values(log);
  const perCycle = new Map<string, number>();
  entries.forEach((e) => e.c && perCycle.set(e.c, (perCycle.get(e.c) ?? 0) + 1));
  const valid = new Set([...perCycle].filter(([, n]) => n >= MIN_ENTRIES_CYCLE).map(([c]) => c));
  const active = valid.size >= NEED_CYCLES;

  const phases: Learned['phases'] = {};
  let best: Learned['best'];
  if (active) {
    for (const ph of ALL) {
      const xs = entries.filter((e) => e.p === ph && e.c && valid.has(e.c)).map((e) => e.f);
      if (xs.length >= MIN_PHASE) {
        const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
        phases[ph] = { n: xs.length, mean, w: xs.length / (xs.length + K) };
        if (!best || mean > best.mean) best = { phase: ph, mean };
      }
    }
  }
  const dBest = best ? -((10 - best.mean) * 10) / 9 : 0;
  return { cycles: valid.size, needed: NEED_CYCLES, active, total: entries.length, phases, best, dBest };
}

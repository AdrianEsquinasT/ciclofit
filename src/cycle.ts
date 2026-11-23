export type PhaseId = 'menstrual' | 'follicular' | 'ovulatory' | 'earlyLuteal' | 'lateLuteal';

export interface CycleSettings {
  lastPeriodStart: string; // YYYY-MM-DD (primer día de sangrado)
  cycleLength: number; // 21-40
  periodLength: number; // 2-8
  sensitivity?: 0 | 1 | 2; // 0 = ignorar fase, 1 = estándar, 2 = alta
  hormonal?: boolean; // anticonceptivo hormonal: sin patrón de fases
}

export interface PhaseRange {
  id: PhaseId;
  start: number;
  end: number;
}

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (iso: string, n: number) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

const diffDays = (a: string, b: string) => {
  const A = fromISO(a);
  const B = fromISO(b);
  return Math.round((Date.UTC(A.getFullYear(), A.getMonth(), A.getDate()) - Date.UTC(B.getFullYear(), B.getMonth(), B.getDate())) / 86400000);
};

/** Días desde el inicio de la última regla (negativo si la fecha es anterior). */
export const daysSince = (s: CycleSettings, iso: string) => diffDays(iso, s.lastPeriodStart);

/**
 * Día del ciclo (1..cycleLength). Si la regla se retrasa, se queda en el último día
 * (hasta 7 días de margen) en vez de reiniciar; pasado ese margen se asume un ciclo nuevo.
 */
export function cycleDay(s: CycleSettings, iso: string): number {
  const diff = diffDays(iso, s.lastPeriodStart);
  const L = s.cycleLength;
  if (diff >= 0 && diff < L) return diff + 1;
  if (diff >= L && diff < L + 7) return L;
  return ((diff % L) + L) % L + 1;
}

export const isLate = (s: CycleSettings, iso: string) => {
  const diff = diffDays(iso, s.lastPeriodStart);
  return diff >= s.cycleLength && diff < s.cycleLength + 7;
};

/** Fase lútea ≈ 13 días (los estudios dan 12–14 según el método; la folicular es la más variable). */
export function phaseRanges(s: CycleSettings): PhaseRange[] {
  const L = s.cycleLength;
  const p = s.periodLength;
  const ov = Math.max(L - 13, p + 3);
  return [
    { id: 'menstrual', start: 1, end: p },
    { id: 'follicular', start: p + 1, end: ov - 2 },
    { id: 'ovulatory', start: ov - 1, end: ov + 1 },
    { id: 'earlyLuteal', start: ov + 2, end: L - 5 },
    { id: 'lateLuteal', start: L - 4, end: L },
  ];
}

export function phaseOf(s: CycleSettings, day: number) {
  const ranges = phaseRanges(s);
  const r = ranges.find((x) => day >= x.start && day <= x.end) ?? ranges[ranges.length - 1];
  return { ...r, dayInPhase: day - r.start + 1, daysLeft: r.end - day + 1 };
}

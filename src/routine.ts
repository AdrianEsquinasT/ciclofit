import { Mode } from './guidance';

export type Unit = 'reps' | 'm';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  repsMin: number; // o metros
  repsMax: number;
  weight: number; // kg, 0 = peso corporal / sin carga
  inc: number; // incremento mínimo (kg)
  unit: Unit;
}

export interface Workout {
  id: string;
  name: string;
  mode: Mode;
  exercises: Exercise[];
}

const KEY = 'ciclofit.routine.v1';
export const uid = () => Math.random().toString(36).slice(2, 9);

export const loadRoutine = (): Workout[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Workout[]) : [];
  } catch {
    return [];
  }
};
export const saveRoutine = (w: Workout[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(w));
  } catch {
    /* sin almacenamiento */
  }
};

export interface Adjusted {
  sets: number;
  repsMin: number;
  repsMax: number;
  weight: number;
  rir: string;
  note: string;
}

const roundTo = (x: number, step: number) => (step > 0 ? Math.round(x / step) * step : x);
export const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

/** Devuelve la sesión del día a partir del peso/reps "de día pico". */
export function adjust(ex: Exercise, mode: Mode, pct: number): Adjusted {
  const f = pct / 100;
  const noChange = pct >= 100;
  let weight = ex.weight;
  let sets = ex.sets;
  let repsMin = ex.repsMin;
  let repsMax = ex.repsMax;
  const notes: string[] = [];

  if (!noChange) {
    if (ex.weight > 0) {
      const w = Math.min(ex.weight, roundTo(ex.weight * f, ex.inc));
      weight = w;
    }
    if (ex.unit === 'm') {
      const k = Math.max(0.6, 1 - 1.5 * (1 - f));
      repsMin = Math.max(5, Math.round((ex.repsMin * k) / 5) * 5);
      repsMax = Math.max(repsMin, Math.round((ex.repsMax * k) / 5) * 5);
      if (repsMin !== ex.repsMin) notes.push('menos distancia');
    } else if (weight === ex.weight && ex.weight > 0 && pct <= 97) {
      // el redondeo absorbe el descuento: mismo peso, 1 rep menos
      repsMin = Math.max(1, ex.repsMin - 1);
      repsMax = Math.max(repsMin, ex.repsMax - 1);
      notes.push('mismo peso, −1 rep');
    }
    if (pct <= 90 && ex.sets >= 4) {
      sets = ex.sets - 1;
      notes.push('−1 serie');
    } else if (pct <= 85 && ex.sets === 3) {
      sets = 2;
      notes.push('−1 serie');
    }
  }
  const rir = pct >= 98 ? '1–2' : pct >= 93 ? '2' : '2–3';
  return { sets, repsMin, repsMax, weight, rir, note: notes.join(' · ') };
}

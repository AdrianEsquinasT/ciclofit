import { Mode } from './guidance';

export type Unit = 'reps' | 'm';
export type Goal = 'strength' | 'volume';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  repsMin: number; // o metros
  repsMax: number;
  weight: number; // kg, 0 = peso corporal / sin carga
  inc: number; // incremento mínimo (kg)
  unit: Unit;
  goal?: Goal; // fuerza (pesado, pocas reps) o volumen/músculo; por defecto según las reps
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

export const goalOf = (ex: Exercise): Goal => ex.goal ?? (ex.repsMax <= 5 ? 'strength' : 'volume');

/** Repeticiones posibles con el mismo peso si la capacidad de hoy es f × la del pico (Epley, RIR de referencia 2). */
const repsAtSameWeight = (reps: number, f: number) => Math.max(1, Math.min(reps, Math.round(30 * ((1 + (reps + 2) / 30) * f - 1) - 2)));

/**
 * Devuelve la sesión del día a partir del peso/reps "de día pico", manteniendo el MISMO esfuerzo (RIR):
 *  - Fuerza (≤5 reps por defecto): se mantiene el peso (la carga alta es lo que más importa para la fuerza máxima)
 *    y bajan las repeticiones; si bajan 2 o más, se añade una serie para conservar el volumen.
 *  - Volumen/músculo: se baja el peso y se mantienen reps y series (la hipertrofia es similar en un amplio rango de cargas).
 *  - Hyrox por metros: menos distancia por serie.
 * Si con el mismo peso quedarían menos de 3 repeticiones, se baja el peso. Las series solo se recortan en días muy bajos (≤80%) y con 4 o más series.
 */
export function adjust(ex: Exercise, mode: Mode, pct: number): Adjusted {
  const f = Math.min(1, pct / 100);
  let weight = ex.weight;
  let sets = ex.sets;
  let repsMin = ex.repsMin;
  let repsMax = ex.repsMax;
  const notes: string[] = [];

  if (f < 1) {
    if (ex.unit === 'm') {
      const k = Math.max(0.6, 1 - 1.5 * (1 - f));
      if (ex.weight > 0) weight = Math.min(ex.weight, roundTo(ex.weight * f, ex.inc));
      repsMin = Math.max(5, Math.round((ex.repsMin * k) / 5) * 5);
      repsMax = Math.max(repsMin, Math.round((ex.repsMax * k) / 5) * 5);
      if (repsMin !== ex.repsMin) notes.push('menos distancia');
    } else if (ex.weight > 0 && goalOf(ex) === 'strength' && pct < 97 && repsAtSameWeight(ex.repsMin, f) >= 3) {
      repsMin = repsAtSameWeight(ex.repsMin, f);
      repsMax = Math.max(repsMin, repsAtSameWeight(ex.repsMax, f));
      notes.push('mismo peso, menos reps');
      if (ex.repsMin - repsMin >= 2 && sets < 6) {
        sets += 1;
        notes.push('+1 serie para mantener el volumen');
      }
    } else {
      if (ex.weight > 0) weight = Math.min(ex.weight, roundTo(ex.weight * f, ex.inc));
      if (ex.weight > 0 && weight === ex.weight && pct <= 97) {
        repsMin = Math.max(1, ex.repsMin - 1);
        repsMax = Math.max(repsMin, ex.repsMax - 1);
        notes.push('mismo peso, −1 rep');
      }
    }
    if (pct <= 80 && sets >= 4 && !notes.some((n) => n.includes('+1 serie'))) {
      sets -= 1;
      notes.push('−1 serie');
    }
  }
  const rir = pct >= 95 ? '1–2' : '1–3';
  return { sets, repsMin, repsMax, weight, rir, note: notes.join(' · ') };
}

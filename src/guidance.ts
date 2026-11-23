import { CycleSettings, PhaseId } from './cycle';
import type { Learned } from './learn';

export type Mode = 'strength' | 'hyrox';
export type Feeling = number; // 1 (fatal) .. 10 (genial)

export interface ModeGuide {
  prior: number; // puntos porcentuales respecto al pico (≤ 0): "prior" poblacional, pequeño
  firstDays?: number; // ajuste extra los 2 primeros días de la fase
  heat?: number; // ajuste extra si hace calor/humedad (solo Hyrox, fase lútea)
  load: string;
  volume: string;
  effort: string;
  rest: string;
  tips: string[];
  mindset: string;
}

export interface PhaseInfo {
  id: PhaseId;
  name: string;
  color: string;
  hormones: string;
  why: string;
  watch: string;
  modes: Record<Mode, ModeGuide>;
}

export const MODE_LABEL: Record<Mode, string> = { strength: 'Pesas', hyrox: 'Hyrox' };
export const DEFAULT_FEELING = 8; // si no se registra, se asume un día normal (descuento −2)
export const toScore = (f: unknown): number => {
  if (typeof f === 'number' && f >= 1 && f <= 10) return Math.round(f);
  const legacy: Record<string, number> = { great: 9, ok: 8, low: 5, bad: 2 }; // registros antiguos
  return typeof f === 'string' && f in legacy ? legacy[f] : DEFAULT_FEELING;
};
/** 10 = sin descuento; cada punto menos resta ≈1,1 puntos (1 → −10). */
export const feelDelta = (s: number) => -Math.round(((10 - s) * 10) / 9);
export const feelLabel = (s: number) =>
  s >= 10 ? 'Genial' : s >= 8 ? 'Bien' : s >= 6 ? 'Normal-baja' : s >= 4 ? 'Floja' : 'Muy mal';

export const SENS_LABEL = ['Ignorar fase', 'Estándar', 'Alta'];

export const PHASES: Record<PhaseId, PhaseInfo> = {
  menstrual: {
    id: 'menstrual',
    name: 'Menstrual',
    color: '#ff5d6c',
    hormones: 'Estrógeno y progesterona bajos.',
    why:
      'Un metaanálisis (McNulty 2020, 78 estudios) halla una posible bajada de rendimiento en la fase folicular temprana, pero trivial (≈ −0,06 desviaciones estándar) y de evidencia baja. Otras revisiones recientes de fuerza no encuentran diferencias consistentes entre fases; una revisión halló un VO2max algo menor en esta fase (certeza baja). Lo más frecuente son los síntomas: ≈32% de las deportistas refiere dismenorrea (rango 8–86%) y los síntomas se concentran en los primeros días. Por eso el ajuste se apoya sobre todo en tu energía de hoy.',
    watch: 'Dolor intenso, sangrado muy abundante o mareos: baja el ritmo y consúltalo con un profesional.',
    modes: {
      strength: {
        prior: -2, firstDays: -3,
        load: 'Casi las mismas cargas. Solo si ves que la barra va lenta o hay molestias, baja un escalón.',
        volume: 'Mantén el plan; si hay dolor, quita una serie de accesorios.',
        effort: 'Mismo esfuerzo que siempre (1–3 repeticiones en reserva): se ajusta el peso o las repeticiones, no el esfuerzo.',
        rest: 'Descansos algo más largos si los necesitas.',
        tips: [
          'Si hay cólicos, sustituye variantes pesadas de bisagra/sentadilla por prensa, hip thrust o unilaterales.',
          'Calor local y movilidad antes de empezar suelen ayudar con las molestias.',
        ],
        mindset: 'Que hoy cueste más no significa que pierdas nivel: mantener la rutina ya cuenta.',
      },
      hyrox: {
        prior: -2, firstDays: -3,
        load: 'Pesos de estaciones iguales si se mueven fluidos; si no, baja un escalón.',
        volume: 'Algo menos de volumen si hay molestias o mucho cansancio.',
        effort: 'Mismo esfuerzo percibido de siempre; el ritmo se adapta a tu energía (guíate por RPE o pulsaciones).',
        rest: 'Transiciones algo más largas.',
        tips: [
          'Z2 continua y técnica de estaciones rinden bien con poco desgaste.',
          'Con dolor abdominal, evita series máximas de burpee broad jumps los días 1–2.',
        ],
        mindset: 'Hoy suma calidad, no marcas. Constancia > día heroico.',
      },
    },
  },
  follicular: {
    id: 'follicular',
    name: 'Folicular',
    color: '#ffb340',
    hormones: 'El estrógeno sube; progesterona baja.',
    why:
      'En el metaanálisis, la fase folicular tardía y las siguientes no se distinguen entre sí en rendimiento. Muchas mujeres refieren más energía y mejor ánimo, así que es un buen sitio para intentar progresar, pero no hay evidencia sólida de que entrenar “sincronizada” produzca más fuerza o músculo (Colenso-Semple 2023: concluye que es prematuro afirmarlo).',
    watch: 'Aprovecha para progresar, sin saltarte el calentamiento.',
    modes: {
      strength: {
        prior: 0,
        load: 'Cargas completas. Buen momento para intentar subir peso o repeticiones.',
        volume: 'Volumen completo.',
        effort: 'Mismo esfuerzo que siempre (1–3 repeticiones en reserva): se ajusta el peso o las repeticiones, no el esfuerzo.',
        rest: 'Descansos normales.',
        tips: ['Ideal para tests, series pesadas y nuevos bloques de progresión.'],
        mindset: 'Día de empujar: apunta a superarte con técnica limpia.',
      },
      hyrox: {
        prior: 0,
        load: 'Pesos de competición.',
        volume: 'Volumen completo; buen día para simulacros o umbral.',
        effort: 'Mismo esfuerzo percibido de siempre; el ritmo se adapta a tu energía (guíate por RPE o pulsaciones).',
        rest: 'Según plan.',
        tips: ['Haz aquí tus tests de 1 km o estaciones.'],
        mindset: 'Tu ventana para marcas personales.',
      },
    },
  },
  ovulatory: {
    id: 'ovulatory',
    name: 'Ovulación',
    color: '#4ade80',
    hormones: 'Pico de estrógeno y subida de LH.',
    why:
      'Sin penalización de rendimiento demostrada. Un metaanálisis (2017) halló mayor laxitud de rodilla en la ovulación frente a la fase folicular, pero la relación con lesiones de LCA no está demostrada: una revisión de 2022 concluye que es inconcluyente. Por prudencia, calentamiento algo más largo y control en saltos y cambios de dirección.',
    watch: 'Cuida rodillas en aterrizajes, saltos y giros bruscos.',
    modes: {
      strength: {
        prior: 0,
        load: 'Cargas completas con técnica estricta.',
        volume: 'Volumen completo.',
        effort: 'Mismo esfuerzo que siempre (1–3 repeticiones en reserva): se ajusta el peso o las repeticiones, no el esfuerzo.',
        rest: 'Descansos normales.',
        tips: ['Activación de glúteo/core antes de sentadilla y peso muerto.', 'Aterrizajes controlados en pliometría.'],
        mindset: 'Estás fuerte; calidad de movimiento primero.',
      },
      hyrox: {
        prior: 0,
        load: 'Pesos de competición con buen calentamiento de rodillas y cadera.',
        volume: 'Volumen completo.',
        effort: 'Mismo esfuerzo percibido de siempre; el ritmo se adapta a tu energía (guíate por RPE o pulsaciones).',
        rest: 'Descansos normales.',
        tips: ['Control de rodillas en burpee broad jumps, lunges y wall balls.'],
        mindset: 'Buen día para rendir, con cabeza en las articulaciones.',
      },
    },
  },
  earlyLuteal: {
    id: 'earlyLuteal',
    name: 'Lútea inicial',
    color: '#38bdf8',
    hormones: 'La progesterona sube.',
    why:
      'La progesterona eleva la temperatura central ≈0,3–0,5 °C. En ambiente templado no se observa diferencia de rendimiento; en calor y humedad, un estudio (Janse de Jonge 2012) halló menor tiempo hasta el agotamiento y más pulsaciones y esfuerzo percibido en la fase lútea, aunque otros estudios más recientes no lo replican. Para pesas casi no hay efecto.',
    watch: 'Más sudor y fatiga con calor: hidratación y carbohidratos suficientes.',
    modes: {
      strength: {
        prior: 0,
        load: 'Cargas completas.',
        volume: 'Volumen completo; vigila la recuperación semanal.',
        effort: 'Mismo esfuerzo que siempre (1–3 repeticiones en reserva): se ajusta el peso o las repeticiones, no el esfuerzo.',
        rest: 'Descansos normales.',
        tips: ['Buena fase para acumular volumen de hipertrofia.'],
        mindset: 'Casi sin cambios: si un día no sale, no es pérdida de nivel.',
      },
      hyrox: {
        prior: -1, heat: -3,
        load: 'Pesos habituales; si hace calor, baja un escalón en trineo.',
        volume: 'Volumen completo, o algo menos si la sesión es muy larga.',
        effort: 'Mismo esfuerzo percibido de siempre; el ritmo se adapta a tu energía (guíate por RPE o pulsaciones).',
        rest: 'Más recuperación entre bloques con calor.',
        tips: ['Hidratación con electrolitos y horas frescas si es posible.'],
        mindset: 'Mismo esfuerzo con ritmo algo más lento puede ser solo termorregulación.',
      },
    },
  },
  lateLuteal: {
    id: 'lateLuteal',
    name: 'Premenstrual',
    color: '#a78bfa',
    hormones: 'Progesterona y estrógeno caen antes de la regla.',
    why:
      'Los síntomas premenstruales (ánimo, fatiga) son frecuentes: ≈41–44% de las deportistas dicen que afectan a su rendimiento, aunque casi todo son autoinformes. Una revisión halló más fatiga y peor sueño en la fase lútea que en la folicular, sin diferencias en el esfuerzo percibido. El descuento por fase es pequeño; manda cómo estés hoy.',
    watch: 'Sueño y estrés pesan mucho ahora: escucha más al cuerpo que al plan.',
    modes: {
      strength: {
        prior: -2,
        load: 'Casi las mismas cargas; baja un escalón si el día va mal.',
        volume: 'Mantén los básicos; recorta accesorios si hace falta.',
        effort: 'Mismo esfuerzo que siempre (1–3 repeticiones en reserva): se ajusta el peso o las repeticiones, no el esfuerzo.',
        rest: 'Un poco más de descanso.',
        tips: [
          'La retención de líquidos puede subir el peso en la báscula: es normal y temporal.',
          'Come suficientes carbohidratos y proteína.',
        ],
        mindset: 'El peso de hoy no mide tu progreso real; lo mide el mes completo.',
      },
      hyrox: {
        prior: -3, heat: -3,
        load: 'Un escalón menos en trineo/farmers si no se mueven fluidos.',
        volume: 'Sesiones algo más cortas e intensas, mejor que largas.',
        effort: 'Mismo esfuerzo percibido de siempre; el ritmo se adapta a tu energía (guíate por RPE o pulsaciones).',
        rest: 'Más descanso entre bloques.',
        tips: ['Cuida sueño e hidratación; evita entrenar con mucho calor.'],
        mindset: 'Terminar la sesión ya es progreso.',
      },
    },
  },
};

export interface Intensity {
  point: number;
  phasePart: number; // puntos aportados por fase (+calor)
  feelPart: number; // puntos aportados por sensación
  w: number; // peso del aprendizaje personal aplicado (0..1)
}

/**
 * Intensidad objetivo (% del pico).
 * - Sin aprendizaje: prior poblacional por fase + sensación (registrada, o 8 si no hay registro).
 * - Con aprendizaje (≥2 ciclos con datos): el prior se sustituye gradualmente (peso w) por el patrón
 *   personal: la mejor fase de ella pasa a ser su "pico", y si no ha registrado hoy se usa su media de la fase.
 */
export function intensity(
  s: CycleSettings,
  phaseId: PhaseId,
  mode: Mode,
  dayInPhase: number,
  logged: number | undefined,
  hot: boolean,
  learned?: Learned,
): Intensity {
  const g = PHASES[phaseId].modes[mode];
  const sens = s.hormonal ? 0 : s.sensitivity ?? 1;
  let prior = g.prior;
  if (dayInPhase <= 2 && g.firstDays) prior += g.firstDays;

  const st = !s.hormonal && learned?.active ? learned.phases[phaseId] : undefined;
  const w = st?.w ?? 0;
  const fUsed = logged ?? (st ? st.mean : DEFAULT_FEELING);

  let phasePart = (1 - w) * prior * sens;
  if (hot && g.heat && !s.hormonal) phasePart += g.heat;
  const feelPart = feelDelta(fUsed) - w * (learned?.dBest ?? 0);
  const point = Math.max(70, Math.min(100, Math.round(100 + phasePart + feelPart)));
  return { point, phasePart: Math.round(phasePart), feelPart: Math.round(feelPart), w };
}

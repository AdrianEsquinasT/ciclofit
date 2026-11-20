import { PhaseId } from './cycle';

export type Mode = 'strength' | 'hyrox';
export type Feeling = 'great' | 'ok' | 'bad';

export interface ModeGuide {
  base: number; // % del rendimiento pico
  firstDays?: number; // ajuste (pts) en los 2 primeros días de la fase
  lastDays?: number; // ajuste (pts) en los 2 últimos días de la fase
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
export const FEELING_LABEL: Record<Feeling, string> = { great: 'Genial', ok: 'Normal', bad: 'Floja' };
export const FEELING_DELTA: Record<Feeling, number> = { great: 3, ok: 0, bad: -7 };

export const PHASES: Record<PhaseId, PhaseInfo> = {
  menstrual: {
    id: 'menstrual',
    name: 'Menstrual',
    color: '#ff5d6c',
    hormones: 'Estrógeno y progesterona en su punto más bajo.',
    why:
      'Con las hormonas bajas, el cuerpo tiene menos “empuje” y la percepción del esfuerzo suele subir. Los primeros 1–2 días se suman cólicos (prostaglandinas), posible pérdida de hierro y peor sueño. Tu capacidad real de fuerza se mantiene en gran parte: lo que cae sobre todo es cómo se siente el esfuerzo.',
    watch: 'Dolor intenso, sangrado muy abundante o mareos: baja el ritmo y consúltalo con un profesional.',
    modes: {
      strength: {
        base: 90, firstDays: -3, lastDays: +3,
        load: 'Cargas al 87–93% de tus pesos pico. Mismas barras, un pelín menos peso.',
        volume: 'Mantén los ejercicios principales; quita 1 serie en los accesorios los días 1–2.',
        effort: 'RPE 7–8: terminas cada serie con 2–3 repeticiones en reserva.',
        rest: 'Añade 30–60 s de descanso si lo necesitas.',
        tips: [
          'Prioriza técnica y control del tempo: es buen momento para series lentas y pausadas.',
          'Si hay molestia de cólicos, cambia sentadilla/peso muerto pesados por prensa, hip thrust o unilaterales.',
          'Movilidad y calor local antes de empezar suelen ayudar con las molestias.',
        ],
        mindset: 'Hoy mantienes la adaptación. Una sesión al 90% bien hecha no te hace retroceder.',
      },
      hyrox: {
        base: 88, firstDays: -3, lastDays: +3,
        load: 'Trineo, farmers y wall balls con el peso de siempre solo si va fluido; si no, baja 1 escalón.',
        volume: 'Reduce un 10–20% el volumen total del WOD (menos rondas o menos metros).',
        effort: 'Guíate por RPE/pulsaciones, no por ritmo: ritmos un 8–12% más lentos de tu pico.',
        rest: 'Transiciones algo más largas; no busques récords en estaciones.',
        tips: [
          'Z2 continua y técnica de estaciones (SkiErg, remo) rinden mucho y desgastan poco.',
          'Hidratación y sales; si sangrado abundante, cuida el hierro (consúltalo con un médico).',
          'Evita series máximas de burpee broad jumps los días 1–2 si hay dolor abdominal.',
        ],
        mindset: 'Hoy el objetivo es acumular calidad, no batir marcas. Constancia > un día heroico.',
      },
    },
  },
  follicular: {
    id: 'follicular',
    name: 'Folicular',
    color: '#ffb340',
    hormones: 'El estrógeno sube de forma sostenida; progesterona baja.',
    why:
      'El estrógeno ayuda a la recuperación, la tolerancia al esfuerzo y la sensación de energía. Suele ser la fase en la que mejor se rinde y se tolera el volumen, aunque hay mucha variación individual.',
    watch: 'Aprovecha, pero sin tirar el calentamiento: entrenar “genial” no es excusa para saltarse la progresión.',
    modes: {
      strength: {
        base: 100,
        load: 'Cargas al 97–100%: buen momento para intentar subir peso o buscar récords personales.',
        volume: 'Volumen completo; tolera bien series extra y trabajo cerca del fallo.',
        effort: 'RPE 8–9 en principales, 1–2 repeticiones en reserva.',
        rest: 'Descansos normales (2–3 min en básicos).',
        tips: [
          'Ideal para tests de fuerza, series pesadas y nuevos bloques de progresión.',
          'Aprovecha para trabajar velocidad de barra y ejercicios técnicos.',
        ],
        mindset: 'Día de empujar. Apunta a superarte, siempre con técnica limpia.',
      },
      hyrox: {
        base: 100,
        load: 'Pesos oficiales o de competición en trineo, farmers y wall balls.',
        volume: 'Volumen completo; buen momento para simulacros y sesiones de umbral.',
        effort: 'RPE 8–9; intervalos duros y trabajo a ritmo de carrera.',
        rest: 'Descansos según plan.',
        tips: [
          'Haz aquí tus simulacros largos o tests de 1 km / estaciones.',
          'Buen momento para intervalos de umbral y VO2.',
        ],
        mindset: 'Tu ventana para marcas. Compara con tus mejores días, no con los de otras fases.',
      },
    },
  },
  ovulatory: {
    id: 'ovulatory',
    name: 'Ovulación',
    color: '#4ade80',
    hormones: 'Pico de estrógeno y subida de LH.',
    why:
      'Rendimiento generalmente alto. Algunos estudios sugieren mayor laxitud de ligamentos alrededor de la ovulación; la evidencia es mixta, pero invita a ser cuidadosa en acciones explosivas y cambios de dirección.',
    watch: 'Calentamiento algo más largo y control en saltos, aterrizajes y cargas muy pesadas con mal tempo.',
    modes: {
      strength: {
        base: 98,
        load: 'Cargas al 95–100%. Muy buen día para pesados, con técnica estricta.',
        volume: 'Volumen completo.',
        effort: 'RPE 8–9; no hace falta ir al fallo.',
        rest: 'Descansos normales.',
        tips: [
          'Calentamiento progresivo y activación de glúteo/core antes de sentadilla y peso muerto.',
          'Cuida rodillas en aterrizajes de pliometría y saltos.',
        ],
        mindset: 'Estás fuerte, pero no corras: calidad de movimiento primero.',
      },
      hyrox: {
        base: 97,
        load: 'Pesos de competición, sí; con buen calentamiento de rodillas y cadera.',
        volume: 'Volumen completo, vigilando el calor.',
        effort: 'RPE 8–9; ritmos al 95–100% de tu pico.',
        rest: 'Descansos normales.',
        tips: [
          'Atención en burpee broad jumps, lunges con saco y wall balls: control de rodillas.',
          'Hidratación reforzada si hace calor: la temperatura corporal empieza a subir.',
        ],
        mindset: 'Buen día para rendir, con cabeza en las articulaciones.',
      },
    },
  },
  earlyLuteal: {
    id: 'earlyLuteal',
    name: 'Lútea inicial',
    color: '#38bdf8',
    hormones: 'La progesterona sube; el estrógeno baja y vuelve a subir.',
    why:
      'La progesterona eleva la temperatura corporal basal (≈0,3–0,5 °C) y puede aumentar ligeramente pulsaciones y sensación de esfuerzo, sobre todo con calor. La fuerza se mantiene, pero el trabajo aeróbico intenso cuesta un poco más.',
    watch: 'Mayor sudoración y fatiga: hidratación y carbohidratos suficientes.',
    modes: {
      strength: {
        base: 96,
        load: 'Cargas al 93–98%. Casi todo se mantiene.',
        volume: 'Volumen completo; recuperas algo más lento, vigila el volumen acumulado semanal.',
        effort: 'RPE 8, con 2 repeticiones en reserva.',
        rest: 'Descansos normales o +15–30 s.',
        tips: [
          'Buena fase para acumular volumen y trabajo de hipertrofia.',
          'Evita acumular muchas series al fallo seguidas.',
        ],
        mindset: 'Casi a tope: si el último día no sale, no es pérdida de nivel, es fase.',
      },
      hyrox: {
        base: 94,
        load: 'Pesos de siempre; si el calor aprieta, baja un escalón en trineo.',
        volume: 'Volumen completo, o −10% si la sesión es muy larga.',
        effort: 'RPE 8 máx.; con pulsaciones 3–5 lpm más altas a igual ritmo, no te frustres.',
        rest: 'Más tiempo de recuperación entre bloques.',
        tips: [
          'Guíate por RPE o zona cardíaca, no solo por ritmo.',
          'Hidratación con electrolitos; entrena fresquita (ventilación, horas frescas).',
        ],
        mindset: 'Mismo esfuerzo, ritmos ~5% más lentos: es termorregulación, no nivel.',
      },
    },
  },
  lateLuteal: {
    id: 'lateLuteal',
    name: 'Premenstrual',
    color: '#a78bfa',
    hormones: 'Progesterona y estrógeno caen antes de la regla.',
    why:
      'Es cuando más aparecen síntomas premenstruales: fatiga, peor sueño, retención de líquidos, irritabilidad y sensación de esfuerzo aumentada. La temperatura sigue elevada. El rendimiento puede bajar y variar mucho de un día a otro.',
    watch: 'Sueño y estrés cuentan mucho ahora. Escucha el cuerpo más que el plan.',
    modes: {
      strength: {
        base: 91, lastDays: -3,
        load: 'Cargas al 88–94%. Si un día va mal, baja otro 5% sin culpa.',
        volume: 'Reduce 1 serie en accesorios; mantén los básicos.',
        effort: 'RPE 7–8, 2–3 repeticiones en reserva.',
        rest: 'Descansos un poco más largos.',
        tips: [
          'Prioriza la técnica y la ejecución controlada; es buena fase para hipertrofia ligera.',
          'Come suficiente carbohidratos y proteína; la retención de líquidos puede subir el peso en la báscula (es normal).',
        ],
        mindset: 'El peso en la barra hoy no mide tu progreso real. Lo mide el mes completo.',
      },
      hyrox: {
        base: 88, lastDays: -3,
        load: 'Pesos de trineo y farmers un escalón por debajo si no se mueven fluidos.',
        volume: 'Reduce 10–20% el volumen; sesiones más cortas e intensas, mejor que largas.',
        effort: 'RPE 7–8; ritmos 8–12% más lentos de tu pico.',
        rest: 'Más descanso entre bloques.',
        tips: [
          'Mejor sesiones de calidad cortas que simulacros largos.',
          'Cuida sueño e hidratación; evita entrenar con mucho calor.',
        ],
        mindset: 'Terminar la sesión en vez de “ganarla”: eso ya es progreso.',
      },
    },
  },
};

export interface Intensity {
  point: number;
  min: number;
  max: number;
}

export function intensity(
  phaseId: PhaseId,
  mode: Mode,
  dayInPhase: number,
  daysLeft: number,
  feeling: Feeling,
): Intensity {
  const g = PHASES[phaseId].modes[mode];
  let v = g.base;
  if (dayInPhase <= 2 && g.firstDays) v += g.firstDays;
  if (daysLeft <= 2 && g.lastDays) v += g.lastDays;
  v += FEELING_DELTA[feeling];
  v = Math.max(70, Math.min(100, v));
  return { point: Math.round(v), min: Math.max(0, Math.round(v) - 3), max: Math.min(100, Math.round(v) + 2) };
}

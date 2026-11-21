import { useState } from 'react';
import { Exercise, Workout, adjust, fmt, uid } from './routine';
import { Feeling, MODE_LABEL, Mode, Intensity } from './guidance';

interface Props {
  workouts: Workout[];
  onChange: (w: Workout[]) => void;
  today: (mode: Mode) => Intensity;
  phaseName: string;
  feeling: Feeling;
}

const blank = (mode: Mode): Exercise => ({
  id: uid(), name: '', sets: 3, repsMin: 8, repsMax: 10, weight: 20, inc: 2.5, unit: mode === 'hyrox' ? 'm' : 'reps',
});

export default function Routine({ workouts, onChange, today, phaseName, feeling }: Props) {
  const [selId, setSelId] = useState<string>(() => workouts[0]?.id ?? '');
  const [editing, setEditing] = useState<string | null>(null); // id de ejercicio o 'new'

  const commit = onChange;
  const sel = workouts.find((w) => w.id === selId) ?? workouts[0];
  const patch = (fn: (w: Workout) => Workout) => commit(workouts.map((w) => (w.id === sel.id ? fn(w) : w)));

  const addWorkout = () => {
    const name = window.prompt('Nombre de la sesión (p. ej. Pierna, Empuje, Hyrox A)');
    if (!name?.trim()) return;
    const w: Workout = { id: uid(), name: name.trim(), mode: 'strength', exercises: [] };
    commit([...workouts, w]);
    setSelId(w.id);
  };

  if (!sel) {
    return (
      <div className="stack">
        <h2>Rutina</h2>
        <section className="card">
          <p>Añade tu rutina con los pesos y repeticiones de tu <b>día pico</b>. La app te devolverá la sesión ajustada al día de hoy.</p>
          <button className="primary" onClick={addWorkout}>Crear primera sesión</button>
        </section>
      </div>
    );
  }

  const it = today(sel.mode);
  const progressDay = it.point >= 98 && (feeling === 'great' || feeling === 'ok');

  return (
    <div className="stack">
      <h2>Rutina</h2>
      <div className="chips">
        {workouts.map((w) => (
          <button key={w.id} className={w.id === sel.id ? 'chip on' : 'chip'} onClick={() => { setSelId(w.id); setEditing(null); }}>
            {w.name}
          </button>
        ))}
        <button className="chip" onClick={addWorkout}>+ Nueva</button>
      </div>

      <section className="card banner">
        <div className="banner-top">
          <div>
            <div className="muted small">Hoy · {phaseName}</div>
            <div className="big">{it.point}% <span className="muted small">de tu pico</span></div>
          </div>
          <div className="seg mini">
            {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
              <button key={m} className={sel.mode === m ? 'on' : ''} onClick={() => patch((w) => ({ ...w, mode: m }))}>{MODE_LABEL[m]}</button>
            ))}
          </div>
        </div>
        <p className="small" style={{ marginTop: 10 }}>
          {progressDay
            ? 'Día de progresión: si llegas al máximo de reps con buena técnica, sube de peso.'
            : it.point >= 98
              ? 'Capacidad completa, pero hoy te sientes por debajo: mantén el plan sin forzar.'
              : 'Día de mantenimiento: cumple el plan ajustado. El progreso se mide en tus días buenos.'}
        </p>
      </section>

      {sel.exercises.map((ex) =>
        editing === ex.id ? (
          <ExerciseForm
            key={ex.id}
            init={ex}
            mode={sel.mode}
            onCancel={() => setEditing(null)}
            onSave={(e) => { patch((w) => ({ ...w, exercises: w.exercises.map((x) => (x.id === ex.id ? e : x)) })); setEditing(null); }}
            onDelete={() => { patch((w) => ({ ...w, exercises: w.exercises.filter((x) => x.id !== ex.id) })); setEditing(null); }}
          />
        ) : (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            mode={sel.mode}
            pct={it.point}
            progressDay={progressDay}
            onEdit={() => setEditing(ex.id)}
            onProgress={() => patch((w) => ({ ...w, exercises: w.exercises.map((x) => (x.id === ex.id ? progress(x) : x)) }))}
          />
        ),
      )}

      {editing === 'new' ? (
        <ExerciseForm
          init={blank(sel.mode)}
          mode={sel.mode}
          onCancel={() => setEditing(null)}
          onSave={(e) => { patch((w) => ({ ...w, exercises: [...w.exercises, e] })); setEditing(null); }}
        />
      ) : (
        <button className="primary" onClick={() => setEditing('new')}>+ Añadir ejercicio</button>
      )}

      <button className="link danger" onClick={() => { if (window.confirm(`¿Borrar la sesión "${sel.name}"?`)) { const rest = workouts.filter((w) => w.id !== sel.id); commit(rest); setSelId(rest[0]?.id ?? ''); } }}>
        Borrar esta sesión
      </button>
      <p className="foot">
        Los pesos que guardas son los de tu <b>día pico</b>. La app nunca modifica tu plan salvo que pulses “Subir”. Las recomendaciones de RIR son orientativas.
      </p>
    </div>
  );
}

function progress(x: Exercise): Exercise {
  if (x.weight > 0) return { ...x, weight: Math.round((x.weight + x.inc) * 100) / 100, repsMin: Math.max(1, x.repsMin) };
  return { ...x, repsMin: x.repsMin + 1, repsMax: x.repsMax + 1 };
}

function ExerciseCard({ ex, mode, pct, progressDay, onEdit, onProgress }: { ex: Exercise; mode: Mode; pct: number; progressDay: boolean; onEdit: () => void; onProgress: () => void }) {
  const a = adjust(ex, mode, pct);
  const u = ex.unit === 'm' ? ' m' : '';
  const range = (lo: number, hi: number) => (lo === hi ? `${lo}` : `${lo}–${hi}`);
  const line = (sets: number, lo: number, hi: number, w: number) => `${sets}×${range(lo, hi)}${u}${w > 0 ? ` @ ${fmt(w)} kg` : ''}`;
  return (
    <section className="card ex">
      <div className="ex-top">
        <b>{ex.name || 'Ejercicio'}</b>
        <button className="link" onClick={onEdit}>Editar</button>
      </div>
      <div className="ex-grid">
        <div>
          <div className="muted small">Plan (pico)</div>
          <div>{line(ex.sets, ex.repsMin, ex.repsMax, ex.weight)}</div>
        </div>
        <div className="today">
          <div className="small" style={{ color: 'var(--accent)' }}>Hoy</div>
          <div className="today-v">{line(a.sets, a.repsMin, a.repsMax, a.weight)}</div>
        </div>
      </div>
      <div className="muted small">RIR objetivo: {a.rir}{a.note ? ` · ${a.note}` : ''}</div>
      {progressDay && (
        <button className="chip up" onClick={onProgress}>
          ✓ Logré el máximo de reps → subir {ex.weight > 0 ? `+${fmt(ex.inc)} kg` : '+1 rep'}
        </button>
      )}
    </section>
  );
}

function ExerciseForm({ init, mode, onSave, onCancel, onDelete }: { init: Exercise; mode: Mode; onSave: (e: Exercise) => void; onCancel: () => void; onDelete?: () => void }) {
  const [f, setF] = useState({
    name: init.name, sets: String(init.sets), repsMin: String(init.repsMin), repsMax: String(init.repsMax),
    weight: String(init.weight), inc: String(init.inc), unit: init.unit,
  });
  const [err, setErr] = useState('');
  const num = (s: string) => parseFloat(s.replace(',', '.'));
  const set = (k: string, v: string) => setF({ ...f, [k]: v });

  const submit = () => {
    const sets = Math.round(num(f.sets));
    const lo = Math.round(num(f.repsMin));
    const hi = Math.round(num(f.repsMax));
    const weight = num(f.weight);
    const inc = num(f.inc);
    if (!f.name.trim()) return setErr('Pon un nombre.');
    if (!(sets >= 1 && sets <= 20)) return setErr('Series: entre 1 y 20.');
    if (!(lo >= 1 && hi >= lo)) return setErr('Reps: mínimo ≥ 1 y máximo ≥ mínimo.');
    if (!(weight >= 0)) return setErr('Peso: 0 o más.');
    if (!(inc > 0)) return setErr('El incremento debe ser mayor que 0.');
    onSave({ id: init.id, name: f.name.trim(), sets, repsMin: lo, repsMax: hi, weight, inc, unit: f.unit });
  };

  return (
    <section className="card">
      <label className="field"><span>Ejercicio</span><input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder={mode === 'hyrox' ? 'Sled push' : 'Sentadilla'} /></label>
      <div className="two">
        <label className="field"><span>Series</span><input inputMode="numeric" value={f.sets} onChange={(e) => set('sets', e.target.value)} /></label>
        <label className="field"><span>Peso pico (kg)</span><input inputMode="decimal" value={f.weight} onChange={(e) => set('weight', e.target.value)} /></label>
      </div>
      <div className="two">
        <label className="field"><span>{f.unit === 'm' ? 'Metros mín.' : 'Reps mín.'}</span><input inputMode="numeric" value={f.repsMin} onChange={(e) => set('repsMin', e.target.value)} /></label>
        <label className="field"><span>{f.unit === 'm' ? 'Metros máx.' : 'Reps máx.'}</span><input inputMode="numeric" value={f.repsMax} onChange={(e) => set('repsMax', e.target.value)} /></label>
      </div>
      <div className="two">
        <label className="field"><span>Incremento (kg)</span><input inputMode="decimal" value={f.inc} onChange={(e) => set('inc', e.target.value)} /></label>
        <label className="field"><span>Unidad</span>
          <select value={f.unit} onChange={(e) => set('unit', e.target.value)}>
            <option value="reps">Repeticiones</option>
            <option value="m">Metros</option>
          </select>
        </label>
      </div>
      {err && <p className="error">{err}</p>}
      <div className="row-btns">
        <button className="primary" onClick={submit}>Guardar</button>
        <button className="ghost" onClick={onCancel}>Cancelar</button>
      </div>
      {onDelete && <button className="link danger" onClick={onDelete}>Borrar ejercicio</button>}
    </section>
  );
}

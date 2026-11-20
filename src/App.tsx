import { useEffect, useMemo, useState } from 'react';
import { CycleSettings, addDays, cycleDay, fromISO, phaseOf, phaseRanges, toISO } from './cycle';
import { FEELING_LABEL, Feeling, MODE_LABEL, Mode, PHASES, intensity } from './guidance';

type Tab = 'today' | 'cycle' | 'settings';

const KEY = 'ciclofit.settings.v1';
const load = (): CycleSettings | null => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CycleSettings) : null;
  } catch {
    return null;
  }
};
const save = (s: CycleSettings) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* sin almacenamiento */
  }
};

const fmtDate = (iso: string) =>
  fromISO(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export default function App() {
  const [settings, setSettings] = useState<CycleSettings | null>(load);
  const [tab, setTab] = useState<Tab>(settings ? 'today' : 'settings');
  const [mode, setMode] = useState<Mode>('strength');
  const [feeling, setFeeling] = useState<Feeling>('ok');
  const [date, setDate] = useState(toISO(new Date()));

  const update = (s: CycleSettings) => {
    setSettings(s);
    save(s);
    setTab('today');
  };

  return (
    <div className="app">
      <main>
        {tab === 'today' && settings && (
          <Today s={settings} date={date} setDate={setDate} mode={mode} setMode={setMode} feeling={feeling} setFeeling={setFeeling} />
        )}
        {tab === 'cycle' && settings && <CycleView s={settings} date={date} mode={mode} setMode={setMode} setDate={setDate} goToday={() => setTab('today')} />}
        {tab === 'settings' && <Settings initial={settings} onSave={update} />}
        {!settings && tab !== 'settings' && <p className="muted">Configura tu ciclo primero.</p>}
      </main>
      <nav className="tabs">
        {([
          ['today', 'Hoy'],
          ['cycle', 'Ciclo'],
          ['settings', 'Ajustes'],
        ] as [Tab, string][]).map(([t, l]) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)} disabled={!settings && t !== 'settings'}>
            {l}
          </button>
        ))}
      </nav>
    </div>
  );
}

function ModeSwitch({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <div className="seg">
      {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
        <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
          {MODE_LABEL[m]}
        </button>
      ))}
    </div>
  );
}

function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 78;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 200 200" className="ring" aria-label={`${pct}% de intensidad`}>
      <circle cx="100" cy="100" r={r} className="ring-bg" />
      <circle
        cx="100"
        cy="100"
        r={r}
        className="ring-fg"
        stroke={color}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        transform="rotate(-90 100 100)"
      />
      <text x="100" y="104" textAnchor="middle" className="ring-num">
        {pct}%
      </text>
      <text x="100" y="132" textAnchor="middle" className="ring-sub">
        de tu día pico
      </text>
    </svg>
  );
}

function Today(p: {
  s: CycleSettings;
  date: string;
  setDate: (d: string) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  feeling: Feeling;
  setFeeling: (f: Feeling) => void;
}) {
  const day = cycleDay(p.s, p.date);
  const ph = phaseOf(p.s, day);
  const info = PHASES[ph.id];
  const g = info.modes[p.mode];
  const it = intensity(ph.id, p.mode, ph.dayInPhase, ph.daysLeft, p.feeling);
  const isToday = p.date === toISO(new Date());

  return (
    <div className="stack" style={{ ['--accent' as string]: info.color }}>
      <header className="hero">
        <div className="datebar">
          <button aria-label="Día anterior" onClick={() => p.setDate(addDays(p.date, -1))}>‹</button>
          <div>
            <div className="date">{isToday ? 'Hoy' : fmtDate(p.date)}</div>
            {isToday && <div className="muted small">{fmtDate(p.date)}</div>}
          </div>
          <button aria-label="Día siguiente" onClick={() => p.setDate(addDays(p.date, 1))}>›</button>
        </div>
        <div className="phase-chip">
          <span className="dot" /> Día {day} · {info.name}
        </div>
        <Ring pct={it.point} color={info.color} />
        <div className="range">
          Objetivo hoy: <b>{it.min}–{it.max}%</b> · <b>−{100 - it.point}%</b> vs. tu pico
        </div>
        <ModeSwitch mode={p.mode} setMode={p.setMode} />
      </header>

      <section className="card">
        <h3>¿Cómo te sientes hoy?</h3>
        <div className="seg">
          {(Object.keys(FEELING_LABEL) as Feeling[]).map((f) => (
            <button key={f} className={p.feeling === f ? 'on' : ''} onClick={() => p.setFeeling(f)}>
              {FEELING_LABEL[f]}
            </button>
          ))}
        </div>
        <p className="muted small">
          Ajusta el objetivo según energía y sueño reales (Genial +3, Floja −7 puntos). El ciclo es una guía; tu cuerpo manda.
        </p>
      </section>

      <section className="card mindset">
        <h3>Mentalidad de hoy</h3>
        <p>{g.mindset}</p>
      </section>

      <section className="card">
        <h3>Cómo adaptar la sesión · {MODE_LABEL[p.mode]}</h3>
        <dl>
          <dt>Cargas</dt><dd>{g.load}</dd>
          <dt>Volumen</dt><dd>{g.volume}</dd>
          <dt>Esfuerzo</dt><dd>{g.effort}</dd>
          <dt>Descanso</dt><dd>{g.rest}</dd>
        </dl>
        <ul className="tips">
          {g.tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <Calculator mode={p.mode} pct={it.point} />

      <section className="card">
        <h3>Por qué te sientes así</h3>
        <p className="muted small">{info.hormones}</p>
        <p>{info.why}</p>
        <p className="watch">{info.watch}</p>
      </section>

      <p className="foot">
        Los porcentajes son estimaciones orientativas. La evidencia científica sobre el ciclo y el rendimiento es limitada, de calidad baja y muy variable entre mujeres
        (la mayor diferencia media se describe en la fase folicular temprana, y es pequeña). Úsalo como punto de partida y compáralo con vuestro registro real.
      </p>
    </div>
  );
}

function Calculator({ mode, pct }: { mode: Mode; pct: number }) {
  const [val, setVal] = useState('');
  const out = useMemo(() => {
    const f = pct / 100;
    if (mode === 'strength') {
      const w = parseFloat(val.replace(',', '.'));
      if (!isFinite(w) || w <= 0) return null;
      return `${(Math.round(w * f * 2) / 2).toString().replace('.', ',')} kg`;
    }
    const m = val.match(/^(\d{1,2})[:.,](\d{1,2})$/);
    if (!m) return null;
    const secs = (+m[1] * 60 + +m[2]) / f;
    return `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')} /km`;
  }, [val, mode, pct]);

  return (
    <section className="card">
      <h3>Calculadora rápida</h3>
      <label className="field">
        <span>{mode === 'strength' ? 'Tu peso pico en el ejercicio (kg)' : 'Tu ritmo pico (min:seg por km)'}</span>
        <input inputMode={mode === 'strength' ? 'decimal' : 'text'} placeholder={mode === 'strength' ? '60' : '5:00'} value={val} onChange={(e) => setVal(e.target.value)} />
      </label>
      <div className="calc-out">{out ? <>Hoy: <b>{out}</b></> : <span className="muted">Introduce un valor</span>}</div>
      {mode === 'hyrox' && <p className="muted small">Aproximación: ritmo = ritmo pico ÷ % objetivo.</p>}
    </section>
  );
}

function CycleView(p: { s: CycleSettings; date: string; setDate: (d: string) => void; mode: Mode; setMode: (m: Mode) => void; goToday: () => void }) {
  const day = cycleDay(p.s, p.date);
  const days = Array.from({ length: p.s.cycleLength }, (_, i) => i + 1);
  const vals = days.map((d) => {
    const ph = phaseOf(p.s, d);
    return intensity(ph.id, p.mode, ph.dayInPhase, ph.daysLeft, 'ok').point;
  });
  const W = 340, H = 120, padX = 8, padY = 12;
  const x = (i: number) => padX + (i * (W - 2 * padX)) / (days.length - 1);
  const y = (v: number) => padY + ((100 - v) / 30) * (H - 2 * padY);
  const path = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const ranges = phaseRanges(p.s);

  return (
    <div className="stack">
      <h2>Tu ciclo</h2>
      <ModeSwitch mode={p.mode} setMode={p.setMode} />
      <section className="card">
        <h3>Intensidad objetivo por día · {MODE_LABEL[p.mode]}</h3>
        <svg viewBox={`0 0 ${W} ${H}`} className="chart">
          {ranges.map((r) => (
            <rect key={r.id} x={x(r.start - 1) - 2} y="0" width={x(r.end - 1) - x(r.start - 1) + 4} height={H} fill={PHASES[r.id].color} opacity="0.14" />
          ))}
          <path d={path} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx={x(day - 1)} cy={y(vals[day - 1])} r="5" fill="#fff" stroke={PHASES[phaseOf(p.s, day).id].color} strokeWidth="3" />
          <text x="4" y="10" className="axis">100%</text>
          <text x="4" y={H - 2} className="axis">70%</text>
        </svg>
        <p className="muted small">Día {day} de {p.s.cycleLength}. Toca una fase para ver el detalle en “Hoy”.</p>
      </section>

      {ranges.map((r) => {
        const info = PHASES[r.id];
        const g = info.modes[p.mode];
        const startDate = addDays(p.s.lastPeriodStart, r.start - 1 + Math.floor((daysFromStart(p.s, p.date) / p.s.cycleLength)) * p.s.cycleLength);
        return (
          <button
            key={r.id}
            className="card phase-row"
            style={{ ['--accent' as string]: info.color }}
            onClick={() => {
              p.setDate(startDate);
              p.goToday();
            }}
          >
            <div className="row-top">
              <span className="dot" /> <b>{info.name}</b>
              <span className="muted small">días {r.start}–{r.end}</span>
              <span className="pill">~{g.base}%</span>
            </div>
            <p className="muted small">{info.hormones}</p>
          </button>
        );
      })}
    </div>
  );
}

const daysFromStart = (s: CycleSettings, iso: string) => Math.round((fromISO(iso).getTime() - fromISO(s.lastPeriodStart).getTime()) / 86400000);

function Settings({ initial, onSave }: { initial: CycleSettings | null; onSave: (s: CycleSettings) => void }) {
  const [last, setLast] = useState(initial?.lastPeriodStart ?? '');
  const [cl, setCl] = useState(String(initial?.cycleLength ?? 28));
  const [pl, setPl] = useState(String(initial?.periodLength ?? 5));
  const [err, setErr] = useState('');

  useEffect(() => setErr(''), [last, cl, pl]);

  const submit = () => {
    if (!last) return setErr('Indica el primer día de tu última regla.');
    if (last > toISO(new Date())) return setErr('La fecha no puede ser futura.');
    const c = parseInt(cl, 10);
    const per = parseInt(pl, 10);
    if (!(c >= 21 && c <= 40)) return setErr('La duración del ciclo debe estar entre 21 y 40 días.');
    if (!(per >= 2 && per <= 8)) return setErr('La duración de la regla debe estar entre 2 y 8 días.');
    onSave({ lastPeriodStart: last, cycleLength: clamp(c, 21, 40), periodLength: clamp(per, 2, 8) });
  };

  return (
    <div className="stack">
      <h2>{initial ? 'Ajustes' : 'Bienvenidos a CicloFit'}</h2>
      {!initial && <p className="muted">Introduce los datos de su ciclo. Se guardan solo en este dispositivo.</p>}
      <section className="card">
        <label className="field">
          <span>Primer día de la última regla</span>
          <input type="date" value={last} max={toISO(new Date())} onChange={(e) => setLast(e.target.value)} />
        </label>
        <label className="field">
          <span>Duración del ciclo (días)</span>
          <input inputMode="numeric" value={cl} onChange={(e) => setCl(e.target.value)} />
        </label>
        <label className="field">
          <span>Duración de la regla (días)</span>
          <input inputMode="numeric" value={pl} onChange={(e) => setPl(e.target.value)} />
        </label>
        {err && <p className="error">{err}</p>}
        <button className="primary" onClick={submit}>Guardar</button>
      </section>
      <p className="foot">
        La ovulación se estima ≈14 días antes del siguiente periodo. Si el ciclo es irregular, actualiza la fecha de inicio cada vez que empiece la regla.
        No es una herramienta médica ni anticonceptiva.
      </p>
    </div>
  );
}

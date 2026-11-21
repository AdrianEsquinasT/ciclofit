import { useEffect, useMemo, useState } from 'react';
import { CycleSettings, PhaseId, addDays, cycleDay, fromISO, phaseOf, phaseRanges, toISO } from './cycle';
import { FEELING_LABEL, FEELING_SCORE, Feeling, MODE_LABEL, Mode, PHASES, SENS_LABEL, intensity } from './guidance';
import Routine from './Routine';
import { Log, Status, useStore } from './store';
import { cloudEnabled } from './cloud';

type Tab = 'today' | 'routine' | 'cycle' | 'settings';

const fmtDate = (iso: string) => fromISO(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export default function App() {
  const store = useStore();
  const settings = store.docs.settings;
  const log = store.docs.log;
  const [tab, setTab] = useState<Tab>(settings ? 'today' : 'settings');
  const [mode, setMode] = useState<Mode>('strength');
  const [hot, setHot] = useState(false);
  const [date, setDate] = useState(toISO(new Date()));

  const feeling: Feeling = log[date]?.f ?? 'ok';
  const phaseNow = settings ? phaseOf(settings, cycleDay(settings, date)) : null;

  const setFeeling = (f: Feeling) => {
    if (!phaseNow) return;
    store.commit('log', { ...log, [date]: { f, p: phaseNow.id } });
  };
  const update = (s: CycleSettings) => {
    store.commit('settings', s);
    setTab('today');
  };
  const todayFor = (m: Mode) =>
    intensity(settings!, phaseNow!.id, m, phaseNow!.dayInPhase, feeling, hot);

  return (
    <div className="app">
      <main>
        {tab === 'today' && settings && phaseNow && (
          <Today s={settings} date={date} setDate={setDate} mode={mode} setMode={setMode} feeling={feeling} setFeeling={setFeeling} hot={hot} setHot={setHot} />
        )}
        {tab === 'routine' && settings && phaseNow && <Routine workouts={store.docs.routine} onChange={(w) => store.commit('routine', w)} today={todayFor} phaseName={PHASES[phaseNow.id].name} feeling={feeling} />}
        {tab === 'cycle' && settings && <CycleView s={settings} date={date} mode={mode} setMode={setMode} setDate={setDate} goToday={() => setTab('today')} log={log} hot={hot} />}
        {tab === 'settings' && <Settings initial={settings} onSave={update} store={store} />}
      </main>
      <nav className="tabs">
        {([
          ['today', 'Hoy'],
          ['routine', 'Rutina'],
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
      <circle cx="100" cy="100" r={r} className="ring-fg" stroke={color} strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 100 100)" />
      <text x="100" y="104" textAnchor="middle" className="ring-num">{pct}%</text>
      <text x="100" y="132" textAnchor="middle" className="ring-sub">de tu día pico</text>
    </svg>
  );
}

function Today(p: {
  s: CycleSettings; date: string; setDate: (d: string) => void; mode: Mode; setMode: (m: Mode) => void;
  feeling: Feeling; setFeeling: (f: Feeling) => void; hot: boolean; setHot: (b: boolean) => void;
}) {
  const day = cycleDay(p.s, p.date);
  const ph = phaseOf(p.s, day);
  const info = PHASES[ph.id];
  const g = info.modes[p.mode];
  const it = intensity(p.s, ph.id, p.mode, ph.dayInPhase, p.feeling, p.hot);
  const isToday = p.date === toISO(new Date());
  const drop = 100 - it.point;

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
        <div className="phase-chip"><span className="dot" /> Día {day} · {info.name}</div>
        <Ring pct={it.point} color={info.color} />
        <div className="range">
          {drop === 0 ? <b>Capacidad completa</b> : <>Baja <b>{drop}%</b> respecto a tu pico</>}
          <div className="muted small">Fase {it.phasePart === 0 ? '0' : it.phasePart}% · sensación {it.feelPart === 0 ? '0' : it.feelPart}%</div>
        </div>
        <ModeSwitch mode={p.mode} setMode={p.setMode} />
      </header>

      <section className="card">
        <h3>¿Cómo te sientes hoy?</h3>
        <div className="seg">
          {(Object.keys(FEELING_LABEL) as Feeling[]).map((f) => (
            <button key={f} className={p.feeling === f ? 'on' : ''} onClick={() => p.setFeeling(f)}>{FEELING_LABEL[f]}</button>
          ))}
        </div>
        <p className="muted small">
          Es el factor que más pesa: la evidencia muestra que la fase explica poco y los síntomas explican más. Floja −5, Mal −10. Se guarda para ver tu patrón personal en “Ciclo”.
        </p>
        {p.mode === 'hyrox' && (
          <label className="check">
            <input type="checkbox" checked={p.hot} onChange={(e) => p.setHot(e.target.checked)} /> Hace calor / humedad (afecta más en fase lútea)
          </label>
        )}
      </section>

      <section className="card mindset"><h3>Mentalidad de hoy</h3><p>{g.mindset}</p></section>

      <section className="card">
        <h3>Cómo adaptar la sesión · {MODE_LABEL[p.mode]}</h3>
        <dl>
          <dt>Cargas</dt><dd>{g.load}</dd>
          <dt>Volumen</dt><dd>{g.volume}</dd>
          <dt>Esfuerzo</dt><dd>{g.effort}</dd>
          <dt>Descanso</dt><dd>{g.rest}</dd>
        </dl>
        <ul className="tips">{g.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="muted small">Tu rutina concreta, ya ajustada a hoy, está en la pestaña “Rutina”.</p>
      </section>

      <Calculator mode={p.mode} pct={it.point} />

      <section className="card">
        <h3>Qué dice la evidencia</h3>
        <p className="muted small">{info.hormones}</p>
        <p>{info.why}</p>
        <p className="watch">{info.watch}</p>
      </section>
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
    </section>
  );
}

function CycleView(p: { s: CycleSettings; date: string; setDate: (d: string) => void; mode: Mode; setMode: (m: Mode) => void; goToday: () => void; log: Log; hot: boolean }) {
  const day = cycleDay(p.s, p.date);
  const days = Array.from({ length: p.s.cycleLength }, (_, i) => i + 1);
  const vals = days.map((d) => {
    const ph = phaseOf(p.s, d);
    return intensity(p.s, ph.id, p.mode, ph.dayInPhase, 'ok', p.hot).point;
  });
  const W = 340, H = 120, padX = 8, padY = 14, LO = 85;
  const x = (i: number) => padX + (i * (W - 2 * padX)) / (days.length - 1);
  const y = (v: number) => padY + ((100 - v) / (100 - LO)) * (H - 2 * padY);
  const path = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const ranges = phaseRanges(p.s);
  const offset = Math.floor(Math.round((fromISO(p.date).getTime() - fromISO(p.s.lastPeriodStart).getTime()) / 86400000) / p.s.cycleLength) * p.s.cycleLength;

  const stats = ranges.map((r) => {
    const entries = Object.values(p.log).filter((e) => e.p === r.id);
    const avg = entries.length ? entries.reduce((a, e) => a + FEELING_SCORE[e.f], 0) / entries.length : null;
    return { id: r.id, n: entries.length, avg };
  });

  return (
    <div className="stack">
      <h2>Tu ciclo</h2>
      <ModeSwitch mode={p.mode} setMode={p.setMode} />
      <section className="card">
        <h3>Objetivo por día (sensación “Normal”) · {MODE_LABEL[p.mode]}</h3>
        <svg viewBox={`0 0 ${W} ${H}`} className="chart">
          {ranges.map((r) => (
            <rect key={r.id} x={x(r.start - 1) - 2} y="0" width={x(r.end - 1) - x(r.start - 1) + 4} height={H} fill={PHASES[r.id].color} opacity="0.14" />
          ))}
          <path d={path} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx={x(day - 1)} cy={y(vals[day - 1])} r="5" fill="#fff" stroke={PHASES[phaseOf(p.s, day).id].color} strokeWidth="3" />
          <text x="4" y="10" className="axis">100%</text>
          <text x="4" y={H - 2} className="axis">{LO}%</text>
        </svg>
        <p className="muted small">Día {day} de {p.s.cycleLength}. Las variaciones por fase son pequeñas a propósito: la evidencia poblacional es débil.</p>
      </section>

      <section className="card">
        <h3>Tu patrón personal</h3>
        {stats.every((s) => s.n === 0) ? (
          <p className="muted small">Registra cómo te sientes cada día en “Hoy”. Con unas semanas verás en qué fases rinde mejor o peor, que es la forma más fiable de personalizar.</p>
        ) : (
          stats.map((s) => (
            <div key={s.id} className="pat">
              <span className="dot" style={{ background: PHASES[s.id].color }} />
              <span className="pat-n">{PHASES[s.id].name}</span>
              <div className="bar"><div style={{ width: `${s.avg === null ? 0 : (s.avg / 3) * 100}%`, background: PHASES[s.id].color }} /></div>
              <span className="muted small">{s.n} d</span>
            </div>
          ))
        )}
      </section>

      {ranges.map((r) => {
        const info = PHASES[r.id];
        return (
          <button
            key={r.id}
            className="card phase-row"
            style={{ ['--accent' as string]: info.color }}
            onClick={() => { p.setDate(addDays(p.s.lastPeriodStart, r.start - 1 + offset)); p.goToday(); }}
          >
            <div className="row-top">
              <span className="dot" /> <b>{info.name}</b>
              <span className="muted small">días {r.start}–{r.end}</span>
            </div>
            <p className="muted small">{info.hormones}</p>
          </button>
        );
      })}
    </div>
  );
}

function Settings({ initial, onSave, store }: { initial: CycleSettings | null; onSave: (s: CycleSettings) => void; store: ReturnType<typeof useStore> }) {
  const [last, setLast] = useState(initial?.lastPeriodStart ?? '');
  const [cl, setCl] = useState(String(initial?.cycleLength ?? 28));
  const [pl, setPl] = useState(String(initial?.periodLength ?? 5));
  const [sens, setSens] = useState<0 | 1 | 2>(initial?.sensitivity ?? 1);
  const [hormonal, setHormonal] = useState(initial?.hormonal ?? false);
  const [err, setErr] = useState('');
  useEffect(() => setErr(''), [last, cl, pl]);

  const submit = () => {
    if (!last) return setErr('Indica el primer día de tu última regla.');
    if (last > toISO(new Date())) return setErr('La fecha no puede ser futura.');
    const c = parseInt(cl, 10);
    const per = parseInt(pl, 10);
    if (!(c >= 21 && c <= 40)) return setErr('La duración del ciclo debe estar entre 21 y 40 días.');
    if (!(per >= 2 && per <= 8)) return setErr('La duración de la regla debe estar entre 2 y 8 días.');
    onSave({ lastPeriodStart: last, cycleLength: clamp(c, 21, 40), periodLength: clamp(per, 2, 8), sensitivity: sens, hormonal });
  };

  return (
    <div className="stack">
      <h2>{initial ? 'Ajustes' : 'Bienvenidos a CicloFit'}</h2>
      {!initial && <p className="muted">Introduce los datos del ciclo. Se guardan solo en este dispositivo.</p>}
      <section className="card">
        <label className="field"><span>Primer día de la última regla</span><input type="date" value={last} max={toISO(new Date())} onChange={(e) => setLast(e.target.value)} /></label>
        <label className="field"><span>Duración del ciclo (días)</span><input inputMode="numeric" value={cl} onChange={(e) => setCl(e.target.value)} /></label>
        <label className="field"><span>Duración de la regla (días)</span><input inputMode="numeric" value={pl} onChange={(e) => setPl(e.target.value)} /></label>
        <div className="field">
          <span>Sensibilidad a la fase</span>
          <div className="seg">
            {SENS_LABEL.map((l, i) => (
              <button key={l} className={sens === i ? 'on' : ''} onClick={() => setSens(i as 0 | 1 | 2)}>{l}</button>
            ))}
          </div>
          <span className="small muted">“Alta” duplica el descuento por fase; úsala si ella nota claros bajones en ciertas fases. “Ignorar” deja solo la sensación diaria.</span>
        </div>
        <label className="check"><input type="checkbox" checked={hormonal} onChange={(e) => setHormonal(e.target.checked)} /> Usa anticonceptivo hormonal (sin patrón de fases)</label>
        {err && <p className="error">{err}</p>}
        <button className="primary" onClick={submit}>Guardar</button>
      </section>

      <Account store={store} />

      <section className="card">
        <h3>Fuentes</h3>
        <ul className="tips src">
          <li><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC7497427/" target="_blank" rel="noreferrer">McNulty 2020 – metaanálisis de rendimiento por fase (Sports Med)</a></li>
          <li><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10076834" target="_blank" rel="noreferrer">Colenso-Semple 2023 – fuerza e hipertrofia (Front Sports Act Living)</a></li>
          <li><a href="https://pubmed.ncbi.nlm.nih.gov/22776870/" target="_blank" rel="noreferrer">Janse de Jonge 2012 – ejercicio en calor por fase</a></li>
          <li><a href="https://pubmed.ncbi.nlm.nih.gov/28795075/" target="_blank" rel="noreferrer">Laxidad y lesiones de LCA por fase – metaanálisis 2017</a></li>
          <li><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC9879429" target="_blank" rel="noreferrer">Revisión 2022 – LCA y fase (inconcluyente)</a></li>
          <li><a href="https://bjsm.bmj.com/content/55/8/438.full.pdf" target="_blank" rel="noreferrer">Encuesta de síntomas en mujeres que entrenan (BJSM)</a></li>
        </ul>
      </section>
      <p className="foot">
        Los descuentos son pequeños porque la evidencia poblacional lo es: efecto trivial, calidad baja y gran variación individual. Lo más fiable es personalizar con vuestro registro.
        Ovulación ≈14 días antes del siguiente periodo. No es herramienta médica ni anticonceptiva.
      </p>
    </div>
  );
}

const STATUS_TXT: Record<Status, string> = {
  off: 'Nube no configurada',
  local: 'Sin sesión: los datos solo están en este móvil',
  syncing: 'Sincronizando…',
  ok: 'Sincronizado',
  error: 'Error de sincronización',
};

function Account({ store }: { store: ReturnType<typeof useStore> }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  if (!cloudEnabled) {
    return (
      <section className="card">
        <h3>Cuenta y sincronización</h3>
        <p className="muted small">{STATUS_TXT.off}. Los datos se guardan solo en este dispositivo.</p>
      </section>
    );
  }
  const login = async () => {
    setBusy(true);
    setMsg(await store.signIn(email.trim(), pw));
    setBusy(false);
  };
  return (
    <section className="card">
      <h3>Cuenta y sincronización</h3>
      {store.session ? (
        <>
          <p className="small">{store.session.user.email}</p>
          <p className={store.status === 'error' ? 'error small' : 'muted small'}>{STATUS_TXT[store.status]}{store.errMsg ? `: ${store.errMsg}` : ''}</p>
          <div className="row-btns">
            <button className="ghost" onClick={store.syncAll}>Sincronizar ahora</button>
            <button className="ghost" onClick={store.signOut}>Cerrar sesión</button>
          </div>
        </>
      ) : (
        <>
          <p className="muted small">Inicia sesión para compartir rutina, ciclo y registros entre móviles.</p>
          <label className="field"><span>Correo</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="field"><span>Contraseña</span><input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
          {msg && <p className="error">{msg}</p>}
          <button className="primary" onClick={login} disabled={busy || !email || !pw}>Entrar</button>
        </>
      )}
    </section>
  );
}

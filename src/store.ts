import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { CycleSettings, PhaseId } from './cycle';
import { Feeling, toScore } from './guidance';
import { Workout } from './routine';
import { DocKey, Row, cloudEnabled, getSpaceId, pullAll, pushDoc, sb, ts } from './cloud';

export type Log = Record<string, { f: Feeling; p: PhaseId }>;
const normLog = (raw: unknown): Log =>
  Object.fromEntries(Object.entries((raw ?? {}) as Record<string, { f: unknown; p: PhaseId }>).map(([d, e]) => [d, { f: toScore(e.f), p: e.p }]));
export interface Docs {
  settings: CycleSettings | null;
  routine: Workout[];
  log: Log;
}
export type Status = 'off' | 'local' | 'syncing' | 'ok' | 'error';

const LS: Record<DocKey, string> = { settings: 'ciclofit.settings.v1', routine: 'ciclofit.routine.v1', log: 'ciclofit.log.v1' };
const META = 'ciclofit.meta.v1';
const OWNER = 'ciclofit.owner.v1';
const EPOCH1 = '1970-01-01T00:00:01.000Z'; // datos locales previos: pierden frente a la nube si ya existe

const read = <T,>(k: string): T | null => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* sin almacenamiento */
  }
};

export function useStore() {
  const [docs, setDocs] = useState<Docs>(() => ({
    settings: read<CycleSettings>(LS.settings),
    routine: read<Workout[]>(LS.routine) ?? [],
    log: normLog(read<Log>(LS.log)),
  }));
  const docsRef = useRef(docs);
  docsRef.current = docs;

  const metaRef = useRef<Partial<Record<DocKey, string>>>(
    (() => {
      const m = read<Partial<Record<DocKey, string>>>(META) ?? {};
      // migración: datos previos sin marca de tiempo
      (['settings', 'routine', 'log'] as DocKey[]).forEach((k) => {
        if (!m[k] && localStorage.getItem(LS[k])) m[k] = EPOCH1;
      });
      return m;
    })(),
  );

  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status>(cloudEnabled ? 'local' : 'off');
  const [errMsg, setErrMsg] = useState('');
  const [ready, setReady] = useState(!cloudEnabled);
  const timers = useRef<Partial<Record<DocKey, number>>>({});
  const spaceRef = useRef<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  const setDoc = useCallback(<K extends DocKey>(key: K, value: Docs[K]) => {
    setDocs((d) => ({ ...d, [key]: value }));
    docsRef.current = { ...docsRef.current, [key]: value };
  }, []);

  const adopt = useCallback((key: DocKey, value: unknown, updated_at: string) => {
    if (key === 'log') value = normLog(value);
    write(LS[key], value);
    metaRef.current = { ...metaRef.current, [key]: updated_at };
    write(META, metaRef.current);
    setDoc(key, value as never);
  }, [setDoc]);

  const push = useCallback(async (key: DocKey) => {
    if (!sessionRef.current || !spaceRef.current) return;
    try {
      setStatus('syncing');
      await pushDoc(spaceRef.current, key, docsRef.current[key], metaRef.current[key] ?? new Date().toISOString());
      setStatus('ok');
      setErrMsg('');
    } catch (e) {
      setStatus('error');
      setErrMsg((e as Error).message);
    }
  }, []);

  /** Cambio local: guarda, marca tiempo y sube (con pequeña espera). */
  const commit = useCallback(<K extends DocKey>(key: K, value: Docs[K]) => {
    const now = new Date().toISOString();
    write(LS[key], value);
    metaRef.current = { ...metaRef.current, [key]: now };
    write(META, metaRef.current);
    setDoc(key, value);
    window.clearTimeout(timers.current[key]);
    timers.current[key] = window.setTimeout(() => push(key), 600);
  }, [push, setDoc]);

  const syncAll = useCallback(async () => {
    if (!sessionRef.current || !spaceRef.current) return;
    const sp = spaceRef.current;
    try {
      setStatus('syncing');
      const rows = await pullAll(sp);
      for (const key of ['settings', 'routine', 'log'] as DocKey[]) {
        const remote = rows.find((r: Row) => r.key === key);
        const localHas = key === 'settings' ? docsRef.current.settings !== null : key === 'routine' ? docsRef.current.routine.length > 0 : Object.keys(docsRef.current.log).length > 0;
        const lt = ts(metaRef.current[key]);
        const rt = ts(remote?.updated_at);
        if (!remote) {
          if (localHas) await pushDoc(sp, key, docsRef.current[key], metaRef.current[key] ?? new Date().toISOString());
        } else if (key === 'log') {
          // el registro se fusiona por día; gana el lado más reciente en caso de choque
          const local = docsRef.current.log;
          const rv = normLog(remote.value);
          const merged = rt >= lt ? { ...local, ...rv } : { ...rv, ...local };
          const changedLocal = JSON.stringify(merged) !== JSON.stringify(local);
          const changedRemote = JSON.stringify(merged) !== JSON.stringify(rv);
          if (changedLocal) adopt('log', merged, new Date().toISOString());
          if (changedRemote) await pushDoc(sp, 'log', merged, metaRef.current.log ?? new Date().toISOString());
        } else if (rt > lt) {
          adopt(key, remote.value, remote.updated_at);
        } else if (lt > rt && localHas) {
          await pushDoc(sp, key, docsRef.current[key], metaRef.current[key]!);
        }
      }
      setStatus('ok');
      setErrMsg('');
    } catch (e) {
      setStatus('error');
      setErrMsg((e as Error).message);
    }
  }, [adopt]);

  // sesión
  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); }).catch(() => setReady(true));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // sincronizar al entrar, al volver a la app y en tiempo real
  useEffect(() => {
    if (!sb || !session) {
      spaceRef.current = null;
      return;
    }
    let cancelled = false;
    let cleanup = () => {};
    (async () => {
      try {
        // si entra otra cuenta distinta en este móvil, se descartan los datos locales de la anterior
        const owner = localStorage.getItem(OWNER);
        if (owner && owner !== session.user.id) {
          (Object.values(LS) as string[]).concat(META).forEach((k) => localStorage.removeItem(k));
          metaRef.current = {};
          setDocs({ settings: null, routine: [], log: {} });
          docsRef.current = { settings: null, routine: [], log: {} };
        }
        try { localStorage.setItem(OWNER, session.user.id); } catch { /* sin almacenamiento */ }
        spaceRef.current = await getSpaceId();
        if (cancelled) return;
        await syncAll();
        const onVis = () => document.visibilityState === 'visible' && syncAll();
        document.addEventListener('visibilitychange', onVis);
        const ch = sb!
          .channel('app_state_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'app_state' }, (payload) => {
            const row = payload.new as Row | undefined;
            if (row && row.key && row.space_id === spaceRef.current && ts(row.updated_at) > ts(metaRef.current[row.key])) adopt(row.key, row.value, row.updated_at);
          })
          .subscribe();
        cleanup = () => {
          document.removeEventListener('visibilitychange', onVis);
          sb!.removeChannel(ch);
        };
      } catch (e) {
        setStatus('error');
        setErrMsg((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [session?.user.id, syncAll, adopt]);

  const signIn = async (email: string, password: string) => {
    const { error } = await sb!.auth.signInWithPassword({ email, password });
    return error?.message ?? '';
  };
  const signOut = async () => {
    await sb!.auth.signOut();
    setStatus('local');
  };

  return { docs, commit, session, ready, status, errMsg, syncAll, signIn, signOut };
}

/* Data layer — offline-first.
   Every screen reads from a copy kept on this device (IndexedDB), so the app works without internet.
   Changes are saved locally at once and queued; when the internet is available the queue is sent to
   Supabase and fresh data from other devices is pulled in. */
(function () {
  const cfg = window.KPE_CONFIG;
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  /* ------------------------------ IndexedDB ------------------------------ */
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('kpe-billing', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      ['bills', 'customers', 'products'].forEach((n) => d.createObjectStore(n, { keyPath: 'id' }));
      d.createObjectStore('kv');
      d.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const req = (store, mode, fn) => open().then((d) => new Promise((res, rej) => {
    const t = d.transaction(store, mode), s = t.objectStore(store);
    let out; const q = fn(s);
    if (q) q.onsuccess = () => { out = q.result; };
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  }));
  const L = {
    all: (s) => req(s, 'readonly', (st) => st.getAll()),
    get: (s, k) => req(s, 'readonly', (st) => st.get(k)),
    put: (s, v, k) => req(s, 'readwrite', (st) => (k === undefined ? st.put(v) : st.put(v, k))),
    del: (s, k) => req(s, 'readwrite', (st) => st.delete(k)),
    replaceAll: (s, rows) => req(s, 'readwrite', (st) => { st.clear(); rows.forEach((r) => st.put(r)); }),
    putMany: (s, rows) => req(s, 'readwrite', (st) => { rows.forEach((r) => st.put(r)); }),
    delMany: (s, keys) => req(s, 'readwrite', (st) => { keys.forEach((k) => st.delete(k)); }),
  };
  const kvGet = (k) => L.get('kv', k);
  const kvSet = (k, v) => L.put('kv', v, k);

  /* ------------------------------ helpers ------------------------------ */
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }));
  const isNet = (e) => {
    const m = String((e && (e.message || e.error_description || e.details)) || e || '');
    return !navigator.onLine || /failed to fetch|networkerror|network request|load failed|fetch failed|timed out|timeout|err_internet|err_network/i.test(m) || e?.status === 0;
  };
  const timeout = (p, ms = 9000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  const must = ({ data, error }) => { if (error) throw Object.assign(new Error(error.message || String(error)), { code: error.code, status: error.status }); return data; };
  const server = (p, ms) => timeout(Promise.resolve(p), ms).then(must);
  const offlineErr = (what) => new Error(`${what} needs an internet connection. Please connect and try again.`);

  /* ------------------------------ status ------------------------------ */
  const status = { online: navigator.onLine, syncing: false, pending: 0, lastSync: null, lastError: null };
  const emit = () => window.dispatchEvent(new CustomEvent('kpe-sync', { detail: { ...status } }));
  const countPending = async () => { status.pending = (await L.all('outbox')).length; emit(); return status.pending; };

  /* ------------------------------ outbox ------------------------------ */
  const queue = async (op) => { await L.put('outbox', { ...op, at: Date.now() }); await countPending(); syncSoon(); };
  const clean = (t, row) => {
    const r = { ...row };
    delete r.updated_at; delete r._local;
    if (t === 'bills') delete r.customers;
    return r;
  };

  async function runOp(op) {
    if (op.k === 'upsert') {
      let row = clean(op.t, op.row);
      try { await server(sb.from(op.t).upsert(row, { onConflict: 'id' })); }
      catch (e) {
        if (isNet(e)) throw e;
        // a customer that failed to sync -> keep the bill, just unlink it
        if (op.t === 'bills' && /foreign key/i.test(e.message) && row.customer_id) { row = { ...row, customer_id: null }; await server(sb.from('bills').upsert(row, { onConflict: 'id' })); return; }
        // same customer / product already exists on the server -> nothing to do
        if ((op.t === 'customers' || op.t === 'products') && /duplicate key/i.test(e.message)) return;
        throw e;
      }
    } else if (op.k === 'patch') {
      await server(sb.from(op.t).update(clean(op.t, op.patch)).eq('id', op.id));
    } else if (op.k === 'delete') {
      await server(sb.from(op.t).delete().eq('id', op.id));
    } else if (op.k === 'settings') {
      await server(sb.from('company_settings').update(op.patch).eq('id', 1));
    }
  }

  async function flush() {
    const ops = (await L.all('outbox')).sort((a, b) => a.seq - b.seq);
    for (const op of ops) {
      try { await runOp(op); await L.del('outbox', op.seq); }
      catch (e) {
        if (isNet(e)) throw e;
        // login expired / not allowed right now: keep everything queued until the user logs in again
        if (/jwt|401|403|unauthori|not authenticated|permission denied|row-level security/i.test(e.message + ' ' + (e.code || '') + ' ' + (e.status || ''))) throw Object.assign(new Error('Please log in again to finish syncing'), { status: 0 });
        // server refused this change (e.g. duplicate bill number): keep a record, don't block the queue
        const failed = (await kvGet('failed')) || [];
        failed.push({ ...op, error: e.message, failedAt: Date.now() });
        await kvSet('failed', failed.slice(-50));
        await L.del('outbox', op.seq);
        status.lastError = (op.t === 'bills' && /duplicate key.*bill_no/i.test(e.message))
          ? `Bill ${op.row?.bill_no} could not be saved online: that bill number already exists.`
          : `A change could not be saved online: ${e.message}`;
        window.dispatchEvent(new CustomEvent('kpe-sync-error', { detail: status.lastError }));
      }
      await countPending();
    }
  }

  /* ------------------------------ pull ------------------------------ */
  async function pull() {
    const pendingIds = new Set((await L.all('outbox')).map((o) => o.id || o.row?.id).filter(Boolean));
    const [settings, products, customers, role, ids] = await Promise.all([
      server(sb.from('company_settings').select('*').eq('id', 1).maybeSingle()),
      server(sb.from('products').select('*').order('name')),
      server(sb.from('customers').select('*').order('name')),
      server(sb.rpc('my_role')),
      server(sb.from('bills').select('id,updated_at'), 20000),
    ]);
    if (settings) await kvSet('settings', settings);
    await kvSet('role', role || null);
    const keepLocal = async (store, rows) => {
      const local = (await L.all(store)).filter((r) => pendingIds.has(r.id));
      await L.replaceAll(store, rows.concat(local.filter((l) => !rows.some((r) => r.id === l.id))));
    };
    await keepLocal('products', products);
    await keepLocal('customers', customers);

    // bills: fetch only the ones that are new or changed
    const local = await L.all('bills');
    const localMap = new Map(local.map((b) => [b.id, b]));
    const serverIds = new Set(ids.map((r) => r.id));
    const changed = ids.filter((r) => { const l = localMap.get(r.id); return !l || !l.updated_at || l.updated_at !== r.updated_at; }).map((r) => r.id);
    for (let i = 0; i < changed.length; i += 200) {
      const rows = await server(sb.from('bills').select('*').in('id', changed.slice(i, i + 200)), 20000);
      await L.putMany('bills', rows.filter((r) => !pendingIds.has(r.id)));
    }
    const gone = local.filter((b) => !serverIds.has(b.id) && !pendingIds.has(b.id) && !b._local).map((b) => b.id);
    if (gone.length) await L.delMany('bills', gone);
    return { changed: changed.length, removed: gone.length };
  }

  /* ------------------------------ sync loop ------------------------------ */
  let syncing = null, syncTimer = null;
  function sync() {
    if (syncing) return syncing;
    syncing = (async () => {
      status.syncing = true; emit();
      try {
        const s = await timeout(sb.auth.getSession(), 6000).then((r) => r.data.session).catch(() => null);
        if (!s) throw new Error('timeout');
        await flush();
        const res = await pull();
        status.online = true; status.lastSync = Date.now(); await kvSet('lastSync', status.lastSync);
        window.dispatchEvent(new CustomEvent('kpe-data', { detail: res }));
        return true;
      } catch (e) {
        if (isNet(e)) status.online = false; else console.warn('sync', e);
        return false;
      } finally {
        status.syncing = false; syncing = null; await countPending();
      }
    })();
    return syncing;
  }
  const syncSoon = () => { clearTimeout(syncTimer); syncTimer = setTimeout(sync, 600); };
  window.addEventListener('online', () => { status.online = true; emit(); sync(); });
  window.addEventListener('offline', () => { status.online = false; emit(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  setInterval(() => { if (!document.hidden) sync(); }, 60000);

  /* ------------------------------ bill numbers ------------------------------ */
  async function ensureDevice() {
    let code = await kvGet('device');
    if (!code) {
      code = await server(sb.rpc('register_device', { agent: navigator.userAgent }), 6000);
      await kvSet('device', code); await kvSet('offSeq', 0);
    }
    return code;
  }

  /* ------------------------------ public API ------------------------------ */
  const DB = {
    sb,
    status: () => ({ ...status }),
    sync,

    // ---------- auth ----------
    session: async () => timeout(sb.auth.getSession(), 5000).then((r) => r.data.session).catch(() => null),
    cachedUser: () => kvGet('user'),
    login: async (email, password) => {
      if (!navigator.onLine) throw new Error("You're offline. The first login on a device needs internet — after that the app also works offline.");
      const data = await server(sb.auth.signInWithPassword({ email, password }), 15000);
      return data;
    },
    afterLogin: async (user) => {
      await kvSet('user', { email: user.email, id: user.id });
      ensureDevice().catch(() => null);
    },
    logout: async () => { await kvSet('user', null); try { await timeout(sb.auth.signOut(), 4000); } catch (_) { /* offline: local sign-out only */ } },
    resetPassword: (email) => server(sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })),
    changePassword: async (password) => { if (!navigator.onLine) throw offlineErr('Changing the password'); return server(sb.auth.updateUser({ password })); },
    onAuth: (cb) => sb.auth.onAuthStateChange(cb),
    isAllowed: async () => {
      try { const ok = !!(await server(sb.rpc('is_allowed'), 6000)); await kvSet('allowed', ok); return ok; }
      catch (e) { if (isNet(e)) return !!(await kvGet('allowed')); throw e; }
    },
    myRole: async () => {
      try { const r = await server(sb.rpc('my_role'), 6000); await kvSet('role', r || null); return r; }
      catch (e) { return (await kvGet('role')) || 'staff'; }
    },
    pendingCount: countPending,
    failedChanges: async () => (await kvGet('failed')) || [],

    // ---------- team (admin, online only) ----------
    team: async (action, payload = {}) => {
      if (!navigator.onLine) throw offlineErr('Managing the team');
      const { data, error } = await timeout(sb.functions.invoke('manage-users', { body: { action, ...payload } }), 20000);
      if (error) {
        let msg = error.message;
        try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch (_) { /* generic */ }
        throw new Error(isNet(error) ? 'Managing the team needs an internet connection.' : msg);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },

    // ---------- settings ----------
    getSettings: async () => {
      let s = await kvGet('settings');
      if (!s) { try { s = await server(sb.from('company_settings').select('*').eq('id', 1).maybeSingle(), 8000); if (s) await kvSet('settings', s); } catch (_) { s = {}; } }
      return s || {};
    },
    saveSettings: async (patch) => {
      const s = { ...(await kvGet('settings')), ...patch };
      await kvSet('settings', s);
      await queue({ k: 'settings', patch });
      return s;
    },

    // ---------- products ----------
    products: async () => (await L.all('products')).sort((a, b) => a.name.localeCompare(b.name)),
    saveProduct: async (p) => {
      const list = await L.all('products');
      if (list.some((x) => x.id !== p.id && x.name.trim().toLowerCase() === String(p.name).trim().toLowerCase())) throw new Error('duplicate key: a product with this name already exists');
      const row = { ...(p.id ? list.find((x) => x.id === p.id) : {}), id: p.id || uuid(), name: p.name, hsn: p.hsn || null, unit: p.unit, price: p.price, gst_rate: p.gst_rate, price_incl_tax: p.price_incl_tax };
      await L.put('products', row);
      await queue({ k: 'upsert', t: 'products', id: row.id, row: { id: row.id, name: row.name, hsn: row.hsn, unit: row.unit, price: row.price, gst_rate: row.gst_rate, price_incl_tax: row.price_incl_tax } });
      return row;
    },
    deleteProduct: async (id) => { await L.del('products', id); await queue({ k: 'delete', t: 'products', id }); },
    addMissingProducts: async (rows) => {
      const have = new Set((await L.all('products')).map((p) => p.name.trim().toLowerCase()));
      for (const r of rows) if (!have.has(r.name.trim().toLowerCase())) { await DB.saveProduct(r); have.add(r.name.trim().toLowerCase()); }
    },

    // ---------- customers ----------
    customers: async () => (await L.all('customers')).sort((a, b) => a.name.localeCompare(b.name)),
    saveCustomer: async (c) => {
      const list = await L.all('customers');
      const row = { ...(c.id ? list.find((x) => x.id === c.id) : {}), id: c.id || uuid(), name: c.name, address: c.address || null, phone: c.phone || null, gstin: c.gstin || null, state: c.state || null };
      await L.put('customers', row);
      await queue({ k: 'upsert', t: 'customers', id: row.id, row: { id: row.id, name: row.name, address: row.address, phone: row.phone, gstin: row.gstin, state: row.state } });
      return row;
    },
    deleteCustomer: async (id) => { await L.del('customers', id); await queue({ k: 'delete', t: 'customers', id }); },

    // ---------- bills ----------
    bills: async ({ q, from, to, status: st, limit } = {}) => {
      let list = await L.all('bills');
      if (from) list = list.filter((b) => b.bill_date >= from);
      if (to) list = list.filter((b) => b.bill_date <= to);
      if (st === 'paid') list = list.filter((b) => Number(b.balance) <= 0);
      if (st === 'due') list = list.filter((b) => Number(b.balance) > 0);
      if (q && q.trim()) { const s = q.trim().toLowerCase(); list = list.filter((b) => [b.customer_name, b.bill_no, b.customer_phone].some((v) => String(v || '').toLowerCase().includes(s))); }
      list.sort((a, b) => String(b.bill_date).localeCompare(String(a.bill_date)) || String(b.created_at || '').localeCompare(String(a.created_at || '')));
      return limit ? list.slice(0, limit) : list;
    },
    bill: async (id) => {
      let b = await L.get('bills', id);
      if (!b) { b = await server(sb.from('bills').select('*').eq('id', id).single(), 8000); await L.put('bills', b); }
      return b;
    },
    // Online: the normal series (KPE/0001…). Offline: this device's own series (KPE/D1-001…)
    nextBillNo: async () => {
      if (navigator.onLine) { try { return await server(sb.rpc('next_bill_no'), 5000); } catch (e) { if (!isNet(e)) throw e; } }
      const code = await kvGet('device');
      if (!code) throw new Error('This device has not been set up for offline bills yet — connect to the internet once, then try again.');
      const n = ((await kvGet('offSeq')) || 0) + 1; await kvSet('offSeq', n);
      const prefix = ((await kvGet('settings')) || {}).bill_prefix || '';
      return `${prefix}${code}-${String(n).padStart(3, '0')}`;
    },
    saveBill: async (b) => {
      const existing = b.id ? await L.get('bills', b.id) : null;
      const isNew = !existing;
      if (isNew) {
        const all = await L.all('bills');
        if (b.bill_no && all.some((x) => x.bill_no === b.bill_no)) throw new Error('duplicate key bill_no: that bill number already exists');
      } else if (b.bill_no && b.bill_no !== existing.bill_no) {
        const all = await L.all('bills');
        if (all.some((x) => x.id !== b.id && x.bill_no === b.bill_no)) throw new Error('duplicate key bill_no: that bill number already exists');
      }
      const user = await kvGet('user');
      const row = { ...(existing || {}), ...b, id: b.id || uuid() };
      if (isNew) { row.created_at = row.created_at || new Date().toISOString(); row.created_by = row.created_by || user?.email || null; }
      row._local = true;
      await L.put('bills', row);
      const full = 'bill_no' in b;
      await queue(full || isNew ? { k: 'upsert', t: 'bills', id: row.id, row } : { k: 'patch', t: 'bills', id: row.id, patch: b });
      return row;
    },
    deleteBill: async (id) => { await L.del('bills', id); await queue({ k: 'delete', t: 'bills', id }); },
  };

  countPending();
  window.DB = DB;
})();

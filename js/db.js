/* Supabase data layer */
(function () {
  const cfg = window.KPE_CONFIG;
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  const must = ({ data, error }) => { if (error) throw new Error(error.message || String(error)); return data; };

  const DB = {
    sb,
    // ---------- auth ----------
    session: async () => (await sb.auth.getSession()).data.session,
    login: (email, password) => sb.auth.signInWithPassword({ email, password }).then(must),
    logout: () => sb.auth.signOut(),
    resetPassword: (email) => sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }).then(must),
    changePassword: (password) => sb.auth.updateUser({ password }).then(must),
    onAuth: (cb) => sb.auth.onAuthStateChange(cb),
    isAllowed: async () => !!must(await sb.rpc('is_allowed')),

    // ---------- settings ----------
    getSettings: async () => must(await sb.from('company_settings').select('*').eq('id', 1).maybeSingle()) || {},
    saveSettings: async (patch) => must(await sb.from('company_settings').update(patch).eq('id', 1).select().single()),

    // ---------- products ----------
    products: async () => must(await sb.from('products').select('*').order('name')),
    saveProduct: async (p) => {
      const row = { name: p.name, hsn: p.hsn || null, unit: p.unit, price: p.price, gst_rate: p.gst_rate, price_incl_tax: p.price_incl_tax };
      return p.id ? must(await sb.from('products').update(row).eq('id', p.id).select().single())
                  : must(await sb.from('products').insert(row).select().single());
    },
    deleteProduct: async (id) => must(await sb.from('products').delete().eq('id', id)),
    addMissingProducts: async (rows) => {
      if (!rows.length) return;
      await sb.from('products').upsert(rows, { onConflict: 'name', ignoreDuplicates: true });
    },

    // ---------- customers ----------
    customers: async () => must(await sb.from('customers').select('*').order('name')),
    saveCustomer: async (c) => {
      const row = { name: c.name, address: c.address || null, phone: c.phone || null, gstin: c.gstin || null, state: c.state || null };
      return c.id ? must(await sb.from('customers').update(row).eq('id', c.id).select().single())
                  : must(await sb.from('customers').insert(row).select().single());
    },
    deleteCustomer: async (id) => must(await sb.from('customers').delete().eq('id', id)),

    // ---------- bills ----------
    bills: async ({ q, from, to, status, limit } = {}) => {
      let qry = sb.from('bills').select('id,bill_no,bill_date,customer_name,customer_phone,customer_id,grand_total,paid,balance,total_qty,created_at')
        .order('bill_date', { ascending: false }).order('created_at', { ascending: false });
      if (from) qry = qry.gte('bill_date', from);
      if (to) qry = qry.lte('bill_date', to);
      if (status === 'paid') qry = qry.lte('balance', 0);
      if (status === 'due') qry = qry.gt('balance', 0);
      if (q) {
        const s = q.replace(/[%,()]/g, ' ').trim();
        if (s) qry = qry.or(`customer_name.ilike.%${s}%,bill_no.ilike.%${s}%,customer_phone.ilike.%${s}%`);
      }
      if (limit) qry = qry.limit(limit);
      return must(await qry);
    },
    bill: async (id) => must(await sb.from('bills').select('*').eq('id', id).single()),
    nextBillNo: async () => must(await sb.rpc('next_bill_no')),
    saveBill: async (b) => {
      const { id, ...row } = b;
      return id ? must(await sb.from('bills').update(row).eq('id', id).select().single())
                : must(await sb.from('bills').insert(row).select().single());
    },
    deleteBill: async (id) => must(await sb.from('bills').delete().eq('id', id)),
  };

  window.DB = DB;
})();

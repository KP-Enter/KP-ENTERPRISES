/* K.P. ENTERPRISES — Billing app controller */
(function () {
  const { esc, money, moneyShort, num, r2, dmy, today, calcBill, calcLine, rateFromAmount, guessHsn, STATES, UNITS, GST_RATES } = window.U;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const S = { settings: {}, products: [], customers: [], user: null, inApp: false };

  /* =========================== UI helpers =========================== */
  function toast(msg, err = false) {
    const t = document.createElement('div');
    t.className = 'toast' + (err ? ' err' : '');
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 3200);
    setTimeout(() => t.remove(), 3600);
  }
  const fail = (e) => { console.error(e); toast(e.message || String(e), true); };

  function openModal(html, cls = '') {
    const m = $('#modal'), box = $('#modal-box');
    box.className = 'modal-box ' + cls;
    box.innerHTML = html;
    m.hidden = false;
    document.body.style.overflow = 'hidden';
    return box;
  }
  function closeModal() { $('#modal').hidden = true; $('#modal-box').innerHTML = ''; document.body.style.overflow = ''; }
  $('#modal').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

  function confirmBox(title, msg, okLabel = 'Delete', danger = true) {
    return new Promise((res) => {
      const box = openModal(`
        <div class="modal-h"><h3>${esc(title)}</h3></div>
        <p class="muted" style="margin:0 0 18px">${esc(msg)}</p>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn" data-a="no">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-a="yes">${esc(okLabel)}</button>
        </div>`, 'sm');
      box.addEventListener('click', (e) => {
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (a) { closeModal(); res(a === 'yes'); }
      });
    });
  }

  const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const icon = {
    print: '<svg viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z"/></svg>',
    pdf: '<svg viewBox="0 0 24 24"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v3h16v-3"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    share: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
    save: '<svg viewBox="0 0 24 24"><path d="M5 3h11l3 3v15H5zM8 3v6h8V3M8 21v-7h8v7"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    rupee: '<svg viewBox="0 0 24 24"><path d="M6 4h12M6 9h12M6 4h3a5 5 0 0 1 0 10H6l8 7"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6zM14 3.5V8h4.5M9 12h8M9 16h8"/></svg>',
  };

  /* =========================== LOGIN =========================== */
  function showLogin() {
    S.inApp = false;
    $('#app-view').hidden = true;
    $('#login-view').hidden = false;
    $('#login-error').textContent = '';
    setTimeout(() => $('#login-email').focus(), 600);
  }

  (function setupLogin() {
    $('#yr').textContent = new Date().getFullYear();
    const card = $('#login-card'), view = $('#login-view');
    // Lite mode on slower computers (few CPU cores / little memory) or when asked with ?lite
    const softwareGpu = (() => { // no graphics acceleration (old/blocked GPU driver) -> lite
      try {
        const gl = document.createElement('canvas').getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
        return /swiftshader|basic render|llvmpipe|software/i.test(r);
      } catch (_) { return true; }
    })();
    const weak = softwareGpu || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 || /[?&]lite\b/.test(location.search);
    try { if (weak || localStorage.getItem('kpe-lite') === '1') document.documentElement.classList.add('lite'); } catch (_) { if (weak) document.documentElement.classList.add('lite'); }
    let tiltQueued = false;
    view.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || tiltQueued || document.documentElement.classList.contains('lite')) return;
      tiltQueued = true;
      requestAnimationFrame(() => { tiltQueued = false; });
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      card.style.setProperty('--ry', (x * 18).toFixed(2) + 'deg');
      card.style.setProperty('--rx', (-y * 14 + 2).toFixed(2) + 'deg');
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
    view.addEventListener('pointerleave', () => { card.style.removeProperty('--rx'); card.style.removeProperty('--ry'); });

    $('#toggle-pass').addEventListener('click', (e) => {
      const p = $('#login-password'); const show = p.type === 'password';
      p.type = show ? 'text' : 'password'; e.currentTarget.classList.toggle('on', show);
    });

    const errEl = $('#login-error');
    const shake = () => { view.classList.remove('shake'); void view.offsetWidth; view.classList.add('shake'); };

    $('#forgot-link').addEventListener('click', async (e) => {
      e.preventDefault();
      const email = $('#login-email').value.trim();
      errEl.className = 'login-error';
      if (!email) { errEl.textContent = 'Enter your email above, then click "Forgot password?"'; shake(); return; }
      try { await DB.resetPassword(email); errEl.className = 'login-error ok'; errEl.textContent = 'Password reset link sent to ' + email; }
      catch (er) { errEl.textContent = er.message; }
    });

    $('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#login-btn'), top = btn.querySelector('.btn3d-top');
      errEl.className = 'login-error'; errEl.textContent = '';
      btn.disabled = true; top.innerHTML = '<span class="spin"></span>';
      try {
        const res = await DB.login($('#login-email').value.trim(), $('#login-password').value);
        if (!(await DB.isAllowed())) { await DB.logout(); throw new Error('This account is not authorised for K.P. Enterprises billing.'); }
        await DB.afterLogin(res.user || res.session?.user || (await DB.session())?.user);
        $('#login-password').value = '';
        await enterApp();
      } catch (er) {
        errEl.textContent = /invalid login/i.test(er.message) ? 'Wrong email or password.' : er.message;
        shake();
      } finally { btn.disabled = false; top.textContent = 'Login'; }
    });
  })();

  /* =========================== APP SHELL =========================== */
  async function enterApp() {
    const sess = await DB.session();
    S.user = sess?.user || (await DB.cachedUser());
    $('#user-email').textContent = S.user?.email || '';
    $('#user-avatar').textContent = (S.user?.email || 'K')[0].toUpperCase();
    $('#login-view').hidden = true;
    $('#app-view').hidden = false;
    S.inApp = true;
    setTimeout(() => hsnReady(), 1500); // load the HSN directory quietly in the background
    S.role = await DB.myRole().catch(() => 'staff');
    S.isAdmin = S.role === 'admin';
    document.body.classList.toggle('is-admin', S.isAdmin);
    $('#user-role').textContent = S.isAdmin ? 'Administrator' : 'Staff';
    // first time on this device: download everything once so it also works offline
    if (!DB.status().lastSync && !(await DB.products()).length && navigator.onLine) {
      $('#page').innerHTML = '<div class="card loading-row"><span class="spinner"></span><p class="muted">Getting your bills ready on this device…</p></div>';
      await DB.sync();
    } else DB.sync();
    try {
      [S.settings, S.products, S.customers] = await Promise.all([DB.getSettings(), DB.products(), DB.customers()]);
    } catch (e) { fail(e); }
    if (!location.hash || location.hash === '#') location.hash = '#/dashboard'; else route();
  }

  $('#logout-btn').addEventListener('click', async () => {
    const n = await DB.pendingCount();
    if (n && !(await confirmBox('Log out?', `${n} change${n > 1 ? 's are' : ' is'} still waiting for internet. They stay safely on this computer and will be sent to the records the next time someone logs in here.`, 'Log out', false))) return;
    await DB.logout(); location.hash = ''; showLogin();
  });

  /* ---------- online / sync badge ---------- */
  const badge = document.createElement('button');
  badge.className = 'sync-badge'; badge.type = 'button'; badge.title = 'Click to sync now';
  $('.topbar-actions').prepend(badge);
  const ago = (t) => { if (!t) return ''; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : Math.round(m / 60) + ' h ago'; };
  function drawBadge(st = DB.status()) {
    const off = !st.online || !navigator.onLine;
    badge.className = 'sync-badge ' + (st.syncing ? 'busy' : off ? 'off' : st.pending ? 'wait' : 'ok');
    badge.innerHTML = `<i></i><span>${st.syncing ? 'Syncing…' : off ? (st.pending ? `Offline · ${st.pending} to sync` : 'Offline — working on this device') : st.pending ? `${st.pending} waiting to sync` : 'All saved · ' + ago(st.lastSync)}</span>`;
  }
  badge.addEventListener('click', () => DB.sync());
  window.addEventListener('kpe-sync', (e) => drawBadge(e.detail));
  setInterval(() => drawBadge(), 30000);
  drawBadge();
  window.addEventListener('kpe-sync-error', (e) => toast(e.detail, true));
  // new data from other devices -> refresh lists and the page being viewed (never while editing a bill)
  window.addEventListener('kpe-data', async (e) => {
    if (!S.inApp) return;
    [S.settings, S.products, S.customers] = await Promise.all([DB.getSettings(), DB.products(), DB.customers()]);
    const page = location.hash.replace(/^#\/?/, '').split('/')[0] || 'dashboard';
    if ((e.detail?.changed || e.detail?.removed) && ['dashboard', 'bills', 'customers', 'products'].includes(page) && $('#modal').hidden) route();
  });
  $('#menu-btn').addEventListener('click', () => $('#app-view').classList.toggle('nav-open'));
  $('#side-backdrop').addEventListener('click', () => $('#app-view').classList.remove('nav-open'));

  const refreshLists = async () => { try { [S.products, S.customers] = await Promise.all([DB.products(), DB.customers()]); } catch (e) { /* non fatal */ } };

  /* =========================== ROUTER =========================== */
  const TITLES = { dashboard: 'Dashboard', new: 'New Bill', edit: 'Edit Bill', bills: 'All Bills', customers: 'Customers', products: 'Products', team: 'Team', settings: 'Settings' };
  let leaveGuard = null;

  function route() {
    if (!S.inApp) return;
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    let name = TITLES[parts[0]] ? parts[0] : 'dashboard';
    if (name === 'team' && !S.isAdmin) name = 'dashboard';
    $('#page-title').textContent = name === 'settings' && !S.isAdmin ? 'My account' : TITLES[name];
    $$('.side-nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === (name === 'edit' ? 'bills' : name)));
    $('#app-view').classList.remove('nav-open');
    leaveGuard = null;
    const page = $('#page');
    page.innerHTML = '<div class="loading-row"><span class="spinner"></span></div>';
    window.scrollTo(0, 0);
    const fn = { dashboard: pageDashboard, new: pageEditor, edit: pageEditor, bills: pageBills, customers: pageCustomers, products: pageProducts, team: pageTeam, settings: pageSettings }[name];
    Promise.resolve(fn(page, parts.slice(1))).catch((e) => { page.innerHTML = `<div class="card empty">${esc(e.message)}</div>`; fail(e); });
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', (e) => { if (leaveGuard && leaveGuard()) { e.preventDefault(); e.returnValue = ''; } });

  /* =========================== PRINT / PDF / SHARE =========================== */
  const waitImages = (root) => Promise.all($$('img', root).map((im) => im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; })));

  async function printBill(bill, opts) {
    const area = $('#print-area');
    area.innerHTML = renderInvoice(bill, S.settings, opts);
    await waitImages(area);
    if (document.fonts?.ready) await document.fonts.ready;
    const prevTitle = document.title;
    document.title = pdfName(bill).replace(/\.pdf$/, '');
    window.print();
    document.title = prevTitle;
  }

  const pdfName = (b) => `${(b.bill_no || 'Bill').replace(/[\\/]+/g, '-')}_${(b.customer_name || '').replace(/[^\w]+/g, '_').slice(0, 30)}.pdf`;

  async function pdfWorker(bill, opts) {
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-10000px;top:0;';
    holder.innerHTML = renderInvoice(bill, S.settings, opts);
    document.body.appendChild(holder);
    const el = holder.firstElementChild;
    el.style.minHeight = '296.5mm';
    await waitImages(holder);
    if (document.fonts?.ready) await document.fonts.ready;
    const worker = html2pdf().set({
      margin: 0, filename: pdfName(bill),
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    }).from(el);
    return { worker, done: () => holder.remove() };
  }

  async function downloadPdf(bill, opts) {
    toast('Preparing PDF…');
    const { worker, done } = await pdfWorker(bill, opts);
    try { await worker.save(); } finally { done(); }
  }

  async function shareBill(bill, opts) {
    const c = calcBill(bill.items || [], { companyState: S.settings.state, placeOfSupply: bill.place_of_supply, roundOff: S.settings.round_off !== false, paid: bill.paid });
    const text = `${S.settings.name || 'K.P. ENTERPRISES'}\nBill ${bill.bill_no || ''} dated ${dmy(bill.bill_date)}\nCustomer: ${bill.customer_name}\nTotal: ${money(c.grand)}\nPaid: ${money(c.paid)}\nBalance: ${money(c.balance)}\nThank you!`;
    try {
      const { worker, done } = await pdfWorker(bill, opts);
      const blob = await worker.outputPdf('blob'); done();
      const file = new File([blob], pdfName(bill), { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: bill.bill_no, text }); return; }
    } catch (e) { if (e.name === 'AbortError') return; }
    const phone = String(bill.customer_phone || '').replace(/\D/g, '');
    const to = phone.length === 10 ? '91' + phone : phone;
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(text)}`, '_blank');
  }

  /* Scaled live A4 preview inside a container */
  function mountPreview(shell, html) {
    shell.innerHTML = `<div class="preview-scale">${html}</div>`;
    const sc = shell.firstElementChild, inv = sc.firstElementChild;
    const fit = () => {
      const w = shell.clientWidth - 32; const s = Math.min(1, w / inv.offsetWidth);
      sc.style.transform = `scale(${s})`; sc.style.height = inv.offsetHeight * s + 'px'; sc.style.width = inv.offsetWidth + 'px';
      shell.style.height = inv.offsetHeight * s + 32 + 'px';
    };
    fit();
    $$('img', inv).forEach((im) => im.addEventListener('load', fit));
    if (!shell._ro) { shell._ro = new ResizeObserver(() => { const s = shell.firstElementChild; if (s) { const i = s.firstElementChild; const k = Math.min(1, (shell.clientWidth - 32) / i.offsetWidth); s.style.transform = `scale(${k})`; s.style.height = i.offsetHeight * k + 'px'; shell.style.height = i.offsetHeight * k + 32 + 'px'; } }); shell._ro.observe(shell); }
  }

  const signOpts = (root) => ({ sign: $('[name=opt-sign]', root)?.checked, stamp: $('[name=opt-stamp]', root)?.checked });
  const signToggles = () => `
    <div class="print-opts">
      <label class="check"><input type="checkbox" name="opt-sign" ${S.settings.show_sign !== false ? 'checked' : ''}> Signature</label>
      <label class="check"><input type="checkbox" name="opt-stamp" ${S.settings.show_stamp !== false ? 'checked' : ''}> Stamp</label>
      ${!S.settings.signature ? '<a href="#/settings" class="muted" style="font-size:12px">Add your signature in Settings →</a>' : ''}
    </div>`;

  /* =========================== DASHBOARD =========================== */
  async function pageDashboard(page) {
    const bills = await DB.bills({ limit: 5000 });
    const now = new Date(); const ym = today().slice(0, 7);
    const total = bills.reduce((s, b) => s + num(b.grand_total), 0);
    const month = bills.filter((b) => String(b.bill_date).startsWith(ym));
    const monthTotal = month.reduce((s, b) => s + num(b.grand_total), 0);
    const due = bills.reduce((s, b) => s + Math.max(0, num(b.balance)), 0);
    const dueCount = bills.filter((b) => num(b.balance) > 0).length;

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: d.toLocaleString('en-IN', { month: 'short' }), v: bills.filter((b) => String(b.bill_date).startsWith(key)).reduce((s, b) => s + num(b.grand_total), 0) });
    }
    const max = Math.max(1, ...months.map((m) => m.v));

    const dues = {};
    bills.filter((b) => num(b.balance) > 0).forEach((b) => { dues[b.customer_name] = (dues[b.customer_name] || 0) + num(b.balance); });
    const topDues = Object.entries(dues).sort((a, b) => b[1] - a[1]).slice(0, 6);

    page.innerHTML = `
      <div class="stats">
        <div class="stat s1"><small>Total sales</small><b>${money(total)}</b><em>${bills.length} bills</em></div>
        <div class="stat s2"><small>This month</small><b>${money(monthTotal)}</b><em>${month.length} bills</em></div>
        <div class="stat s3"><small>Received</small><b>${money(total - due)}</b><em>all time</em></div>
        <div class="stat s4"><small>Outstanding</small><b>${money(due)}</b><em>${dueCount} unpaid bills</em></div>
      </div>
      <div class="dash-grid">
        <div class="card">
          <div class="card-h"><h3>Sales — last 6 months</h3></div>
          <div class="chart">${months.map((m) => `<div class="bar"><b>${m.v ? moneyShort(m.v) : ''}</b><i style="height:${(m.v / max) * 82}%"></i><span>${m.label}</span></div>`).join('')}</div>
        </div>
        <div class="card">
          <div class="card-h"><h3>Pending payments</h3><a href="#/bills" class="muted" style="font-size:12px">View bills →</a></div>
          ${topDues.length ? `<table class="tbl">${topDues.map(([n, v]) => `<tr><td>${esc(n)}</td><td class="num" style="color:#b3261e;font-weight:600">${money(v)}</td></tr>`).join('')}</table>`
            : '<div class="empty">No pending payments 🎉</div>'}
        </div>
      </div>
      <div class="card" style="margin-top:18px">
        <div class="card-h"><h3>Recent bills</h3><a href="#/new" class="btn btn-primary btn-sm">${icon.plus}New Bill</a></div>
        ${billsTable(bills.slice(0, 8))}
      </div>`;
    wireBillsTable(page, () => route());
  }

  /* =========================== BILLS TABLE (shared) =========================== */
  function statusPill(b) {
    const bal = num(b.balance), paid = num(b.paid);
    if (bal <= 0) return '<span class="pill paid">Paid</span>';
    if (paid > 0) return '<span class="pill part">Partial</span>';
    return '<span class="pill due">Unpaid</span>';
  }
  function billsTable(bills) {
    if (!bills.length) return `<div class="empty">${icon.doc}No bills yet. <a href="#/new">Create your first bill</a></div>`;
    return `<div class="table-wrap"><table class="tbl">
      <thead><tr><th>Bill No.</th><th>Date</th><th>Customer</th><th class="num">Amount</th><th class="num">Balance</th><th>Status</th><th></th></tr></thead>
      <tbody>${bills.map((b) => `
        <tr class="click" data-id="${b.id}">
          <td><b>${esc(b.bill_no)}</b>${b.created_by ? `<br><span class="by">by ${esc(String(b.created_by).split('@')[0])}</span>` : ''}</td><td>${dmy(b.bill_date)}</td>
          <td>${esc(b.customer_name)}${b.customer_phone ? `<br><small class="muted">${esc(b.customer_phone)}</small>` : ''}</td>
          <td class="num">${money(b.grand_total)}</td><td class="num">${money(b.balance)}</td><td>${statusPill(b)}</td>
          <td class="acts">
            <button class="icon-btn" data-act="print" title="Print">${icon.print}</button>
            <button class="icon-btn" data-act="pdf" title="Download PDF">${icon.pdf}</button>
            <button class="icon-btn" data-act="edit" title="Edit">${icon.edit}</button>
            <button class="icon-btn admin-only" data-act="del" title="Delete" style="color:#b3261e">${icon.del}</button>
          </td>
        </tr>`).join('')}</tbody></table></div>`;
  }
  function wireBillsTable(root, reload) {
    root.addEventListener('click', async (e) => {
      const tr = e.target.closest('tr[data-id]'); if (!tr) return;
      const id = tr.dataset.id, act = e.target.closest('[data-act]')?.dataset.act;
      try {
        if (act === 'edit') { location.hash = '#/edit/' + id; return; }
        if (act === 'del') {
          if (await confirmBox('Delete bill?', 'This bill will be permanently removed from the records.')) { await DB.deleteBill(id); toast('Bill deleted'); reload(); }
          return;
        }
        const bill = await DB.bill(id);
        if (act === 'print') return printBill(bill, {});
        if (act === 'pdf') return downloadPdf(bill, {});
        viewBill(bill, reload);
      } catch (er) { fail(er); }
    });
  }

  function viewBill(bill, reload) {
    const box = openModal(`
      <div class="modal-h"><h3>Bill ${esc(bill.bill_no)} · ${esc(bill.customer_name)}</h3><button class="icon-btn" data-close>✕</button></div>
      <div class="actionbar" style="margin:0 0 6px">
        <button class="btn btn-dark btn-sm" data-a="print">${icon.print}Print</button>
        <button class="btn btn-gold btn-sm" data-a="pdf">${icon.pdf}Download PDF</button>
        <button class="btn btn-sm" data-a="share">${icon.share}Share</button>
        <button class="btn btn-sm" data-a="pay">${icon.rupee}Record payment</button>
        <button class="btn btn-sm" data-a="edit">${icon.edit}Edit</button>
        <button class="btn btn-sm btn-danger admin-only" data-a="del">${icon.del}Delete</button>
      </div>
      ${signToggles()}
      <div class="preview-shell" style="margin-top:12px"></div>`);
    const shell = $('.preview-shell', box);
    const draw = () => mountPreview(shell, renderInvoice(bill, S.settings, signOpts(box)));
    draw();
    box.addEventListener('change', (e) => { if (e.target.name?.startsWith('opt-')) draw(); });
    box.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
      try {
        if (a === 'print') printBill(bill, signOpts(box));
        if (a === 'pdf') downloadPdf(bill, signOpts(box));
        if (a === 'share') shareBill(bill, signOpts(box));
        if (a === 'edit') { closeModal(); location.hash = '#/edit/' + bill.id; }
        if (a === 'del' && await confirmBox('Delete bill?', 'This bill will be permanently removed.')) { await DB.deleteBill(bill.id); closeModal(); toast('Bill deleted'); reload(); }
        if (a === 'pay') recordPayment(bill, reload);
      } catch (er) { fail(er); }
    });
  }

  function recordPayment(bill, reload) {
    const box = openModal(`
      <div class="modal-h"><h3>Record payment · ${esc(bill.bill_no)}</h3><button class="icon-btn" data-close>✕</button></div>
      <p class="muted" style="margin:0 0 14px">Total ${money(bill.grand_total)} · Paid ${money(bill.paid)} · <b style="color:#b3261e">Balance ${money(bill.balance)}</b></p>
      <form class="grid">
        <label class="fld"><span>Amount received (₹)</span><input class="input" name="amt" type="number" step="0.01" min="0" value="${r2(Math.max(0, bill.balance))}" required></label>
        <div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary">Save payment</button></div>
      </form>`, 'sm');
    $('form', box).addEventListener('submit', async (e) => {
      e.preventDefault();
      const paid = r2(num(bill.paid) + num(e.target.amt.value));
      try { await DB.saveBill({ id: bill.id, paid, balance: r2(num(bill.grand_total) - paid) }); closeModal(); toast('Payment recorded'); reload(); }
      catch (er) { fail(er); }
    });
  }

  /* =========================== ALL BILLS =========================== */
  async function pageBills(page) {
    page.innerHTML = `
      <div class="card">
        <div class="toolbar">
          <label class="fld grow"><span>Search</span><input class="input" id="f-q" placeholder="Customer, bill no. or phone"></label>
          <label class="fld"><span>From</span><input class="input" type="date" id="f-from"></label>
          <label class="fld"><span>To</span><input class="input" type="date" id="f-to"></label>
          <label class="fld"><span>Status</span><select class="select input" id="f-st"><option value="">All</option><option value="due">Unpaid / partial</option><option value="paid">Paid</option></select></label>
          <button class="btn" id="f-csv">${icon.pdf}Export CSV</button>
        </div>
        <div id="bills-sum" class="muted" style="font-size:12.5px;margin:-4px 0 8px"></div>
        <div id="bills-list"><div class="loading-row"><span class="spinner"></span></div></div>
      </div>`;
    let current = [];
    const load = async () => {
      current = await DB.bills({ q: $('#f-q').value, from: $('#f-from').value, to: $('#f-to').value, status: $('#f-st').value });
      $('#bills-list').innerHTML = billsTable(current);
      const t = current.reduce((s, b) => s + num(b.grand_total), 0), d = current.reduce((s, b) => s + Math.max(0, num(b.balance)), 0);
      $('#bills-sum').textContent = `${current.length} bills · Total ${money(t)} · Outstanding ${money(d)}`;
    };
    const dl = debounce(() => load().catch(fail), 250);
    $$('#f-q,#f-from,#f-to,#f-st').forEach((el) => el.addEventListener('input', dl));
    $('#f-csv').addEventListener('click', () => {
      const rows = [['Bill No', 'Date', 'Customer', 'Phone', 'Qty', 'Total', 'Paid', 'Balance'], ...current.map((b) => [b.bill_no, dmy(b.bill_date), b.customer_name, b.customer_phone || '', b.total_qty, b.grand_total, b.paid, b.balance])];
      const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = `KPE_bills_${today()}.csv`; a.click();
    });
    wireBillsTable($('#bills-list'), () => load().catch(fail));
    await load();
  }

  /* =========================== HSN helpers =========================== */
  // Best HSN for a product name: checked solar list first, then the full HSN/SAC directory.
  function hsnSuggestions(name, limit = 4) {
    const out = [];
    const cur = guessHsn(name);
    const hits = window.HSN?.ready && String(name || '').trim().length > 1 ? HSN.search(name, { limit: 8 }) : [];
    // a short family code (e.g. 8536) is upgraded to the exact 8-digit item when the directory finds one in that family
    const exact = cur && cur.length <= 4 && !cur.startsWith('99') ? hits.find((r) => r.code.length === 8 && r.code.startsWith(cur)) : null;
    if (exact) out.push({ code: exact.code, label: HSN.shortDesc(exact.desc), desc: exact.desc });
    if (cur) out.push({ code: cur, label: exact ? 'Family code' : 'Recommended' });
    if (hits.length) {
      for (const r of hits) {
        if (out.some((x) => x.code === r.code)) { const x = out.find((y) => y.code === r.code); x.label = HSN.shortDesc(r.desc); continue; }
        out.push({ code: r.code, label: HSN.shortDesc(r.desc), desc: r.desc });
        if (out.length >= limit) break;
      }
    }
    return out.slice(0, limit);
  }
  const hsnReady = () => (window.HSN ? HSN.load().catch(() => null) : Promise.resolve(null));

  function openHsnSearch(query, onPick) {
    const box = openModal(`
      <div class="modal-h"><h3>Find HSN / SAC code</h3><button class="icon-btn" data-close>✕</button></div>
      <input class="input" id="hsn-q" placeholder="Type the product or service, e.g. solar panel, PVC pipe, installation" autocomplete="off">
      <p class="muted" style="font-size:12px;margin:8px 2px">Searches the official HSN directory (12,600+ goods) and SAC list (services).</p>
      <div class="hsn-results" id="hsn-res"><div class="loading-row"><span class="spinner"></span></div></div>`, 'sm');
    const q = $('#hsn-q', box), res = $('#hsn-res', box);
    q.value = query || '';
    const draw = () => {
      if (!HSN.ready) return;
      const list = String(q.value).trim() ? HSN.search(q.value, { limit: 25 }) : [];
      const cur = guessHsn(q.value);
      if (cur && !list.some((r) => r.code === cur)) list.unshift({ code: cur, desc: 'Recommended for this item', kind: cur.length <= 6 && cur.startsWith('99') ? 'SAC' : 'HSN' });
      res.innerHTML = list.length ? list.map((r) => `<button type="button" class="hsn-hit" data-code="${esc(r.code)}" title="${esc(r.desc)}">
          <b>${esc(r.code)}</b><span class="k ${r.kind}">${r.kind}</span><span class="t">${esc(HSN.shortDesc(r.desc))}</span><small>${esc(r.desc.length > 160 ? r.desc.slice(0, 160) + '…' : r.desc)}</small></button>`).join('')
        : `<div class="empty" style="padding:20px">${q.value.trim() ? 'No match — try a simpler word (e.g. "pump", "pipe", "fan")' : 'Type to search'}</div>`;
    };
    hsnReady().then(() => { if (!HSN.ready) { res.innerHTML = '<div class="empty">Could not load the HSN directory. Check your internet and try again.</div>'; return; } draw(); });
    q.addEventListener('input', debounce(draw, 180));
    res.addEventListener('click', (e) => { const b = e.target.closest('[data-code]'); if (b) { closeModal(); onPick(b.dataset.code); } });
    setTimeout(() => { q.focus(); q.select(); }, 50);
  }

  /* =========================== BILL EDITOR =========================== */
  const blankItem = () => ({ name: '', hsn: '', qty: 1, unit: 'Pcs', rate: '', gst: 0, incl: true });

  async function pageEditor(page, args) {
    let d;
    if (args[0] && location.hash.startsWith('#/edit')) {
      const b = await DB.bill(args[0]);
      d = { ...b, items: (b.items || []).map((i) => ({ ...blankItem(), ...i, hsnManual: !!i.hsn })) };
    } else {
      d = { bill_no: '', bill_date: today(), customer_id: null, customer_name: '', customer_address: '', customer_phone: '', customer_gstin: '', place_of_supply: S.settings.state || '09-Uttar Pradesh', items: [blankItem()], paid: 0, notes: '' };
      if (args[0] === 'c' && args[1]) {
        const c = S.customers.find((x) => x.id === args[1]);
        if (c) Object.assign(d, { customer_id: c.id, customer_name: c.name, customer_address: c.address || '', customer_phone: c.phone || '', customer_gstin: c.gstin || '', place_of_supply: c.state || d.place_of_supply });
      }
    }
    let dirty = false;
    leaveGuard = () => dirty;
    const isEdit = !!d.id;

    page.innerHTML = `
      <div class="editor">
        <div>
          <div class="card">
            <div class="card-h"><h3>Customer</h3><span class="muted" style="font-size:12px">${isEdit ? 'Editing ' + esc(d.bill_no) : 'Start typing to pick a saved customer'}</span></div>
            <div class="grid g2">
              <label class="fld span2"><span>Customer name *</span><input class="input" name="customer_name" list="dl-cust" autocomplete="off" required></label>
              <label class="fld"><span>Contact No.</span><input class="input" name="customer_phone" inputmode="tel"></label>
              <label class="fld"><span>GSTIN (optional)</span><input class="input" name="customer_gstin" style="text-transform:uppercase"></label>
              <label class="fld span2"><span>Address</span><input class="input" name="customer_address"></label>
            </div>
            <datalist id="dl-cust">${S.customers.map((c) => `<option value="${esc(c.name)}">${esc([c.phone, c.address].filter(Boolean).join(' · '))}</option>`).join('')}</datalist>
          </div>

          <div class="card">
            <div class="card-h"><h3>Bill details</h3></div>
            <div class="grid g3">
              <label class="fld"><span>Bill No.</span><input class="input" name="bill_no" placeholder="Auto (${esc(S.settings.bill_prefix || '')}0001…)"></label>
              <label class="fld"><span>Date</span><input class="input" type="date" name="bill_date" required></label>
              <label class="fld"><span>Place of supply</span><select class="select input" name="place_of_supply">${STATES.map((s) => `<option>${esc(s)}</option>`).join('')}</select></label>
            </div>
          </div>

          <div class="card">
            <div class="card-h"><h3>Items</h3><button class="btn btn-sm" id="add-item">${icon.plus}Add item</button></div>
            <div class="items-list" id="items"></div>
            <datalist id="dl-prod">${S.products.map((p) => `<option value="${esc(p.name)}">`).join('')}</datalist>
            <datalist id="dl-unit">${UNITS.map((u) => `<option value="${u}">`).join('')}</datalist>
          </div>

          <div class="card">
            <div class="grid g2">
              <div class="grid">
                <label class="fld"><span>Amount received (₹)</span>
                  <div style="display:flex;gap:8px"><input class="input" name="paid" type="number" step="0.01" min="0"><button type="button" class="btn" id="full-paid">Full</button></div></label>
                <label class="fld"><span>Notes (printed on bill)</span><textarea class="input" name="notes" rows="2" placeholder="e.g. Warranty 5 years on inverter"></textarea></label>
              </div>
              <div class="totals-box" id="totals"></div>
            </div>
          </div>

          <div class="sticky-save">
            <button class="btn" id="b-cancel">Cancel</button>
            <button class="btn btn-primary" id="b-save">${icon.save}${isEdit ? 'Update bill' : 'Save bill'}</button>
            <button class="btn btn-dark" id="b-save-print">${icon.print}Save &amp; Print</button>
            <button class="btn btn-gold" id="b-save-pdf">${icon.pdf}Save &amp; PDF</button>
          </div>
        </div>

        <div class="preview-col">
          <div class="card" style="padding:14px">
            <div class="card-h" style="margin-bottom:6px"><h3>Live preview</h3><span class="muted" style="font-size:12px">A4</span></div>
            ${signToggles()}
            <div class="preview-shell" id="preview" style="margin-top:12px"></div>
          </div>
        </div>
      </div>`;

    // ---- fill header fields ----
    ['customer_name', 'customer_phone', 'customer_gstin', 'customer_address', 'bill_no', 'bill_date', 'place_of_supply', 'notes'].forEach((k) => { const el = $(`[name=${k}]`, page); if (el) el.value = d[k] ?? ''; });
    $('[name=paid]', page).value = num(d.paid) ? r2(d.paid) : '';
    if (!STATES.includes(d.place_of_supply)) $('[name=place_of_supply]', page).insertAdjacentHTML('afterbegin', `<option selected>${esc(d.place_of_supply)}</option>`);

    const opts = () => ({ companyState: S.settings.state, placeOfSupply: d.place_of_supply, roundOff: S.settings.round_off !== false, paid: d.paid });

    const renderTotals = () => {
      const c = calcBill(d.items, opts());
      $('#totals').innerHTML = `
        <div><span>Sub Total</span><span>${money(c.subTotal)}</span></div>
        ${c.breakup.map((b) => `<div><span>${esc(b.label)}</span><span>${money(b.amount)}</span></div>`).join('')}
        ${c.roundOff ? `<div><span>Round off</span><span>${c.roundOff > 0 ? '+' : '−'} ${money(Math.abs(c.roundOff))}</span></div>` : ''}
        <div class="grand"><span>Total</span><span>${money(c.grand)}</span></div>
        <div><span>Paid</span><span>${money(c.paid)}</span></div>
        <div class="bal"><span>Balance</span><span>${money(c.balance)}</span></div>`;
      return c;
    };
    const renderPreview = debounce(() => mountPreview($('#preview'), renderInvoice(d, S.settings, signOpts(page))), 280);
    const refresh = () => { renderTotals(); renderPreview(); };

    const itemRow = (it, i) => {
      const l = calcLine(it);
      return `<div class="item-row" data-i="${i}">
        <div class="ir-top">
          <span class="ir-no">${i + 1}</span>
          <input class="input ir-name" data-k="name" list="dl-prod" value="${esc(it.name)}" placeholder="Item name (pick a saved product or type new)" autocomplete="off">
          <button class="icon-btn del" data-del title="Remove item">${icon.del}</button>
        </div>
        <div class="ir-fields">
          <label><span>HSN/SAC <button type="button" class="hsn-find" data-find title="Search all HSN / SAC codes">🔍</button></span><input class="input" data-k="hsn" value="${esc(it.hsn || '')}" placeholder="auto" title="Filled automatically from the item name — type to override"></label>
          <label><span>Qty</span><input class="input r" data-k="qty" type="number" step="any" min="0" value="${esc(it.qty)}"></label>
          <label><span>Unit</span><input class="input" data-k="unit" list="dl-unit" value="${esc(it.unit || '')}"></label>
          <label><span>Price / Unit</span><input class="input r" data-k="rate" type="number" step="any" min="0" value="${it.rate === '' ? '' : r2(it.rate)}"></label>
          <label><span>Tax in price</span><select class="select input" data-k="incl"><option value="1" ${it.incl ? 'selected' : ''}>Incl.</option><option value="0" ${!it.incl ? 'selected' : ''}>Excl.</option></select></label>
          <label><span>GST</span><select class="select input" data-k="gst">${GST_RATES.map((g) => `<option value="${g}" ${num(it.gst) === g ? 'selected' : ''}>${g}%</option>`).join('')}${!GST_RATES.includes(num(it.gst)) ? `<option selected value="${num(it.gst)}">${num(it.gst)}%</option>` : ''}</select></label>
          <label><span>Amount</span><input class="input r strong" data-k="amount" type="number" step="any" min="0" value="${it.rate === '' ? '' : r2(l.amount)}"></label>
        </div>
        <div class="ir-foot"><div class="hsn-sugg" data-sugg></div><div class="line-sub" data-sub>${l.tax ? 'incl. GST ' + money(l.tax) : ''}</div></div>
      </div>`;
    };
    const drawSugg = (tr, it) => {
      const box = $('[data-sugg]', tr); if (!box) return;
      const list = it.name && it.name.trim().length > 1 ? hsnSuggestions(it.name, 3) : [];
      box.innerHTML = list.length ? list.map((x) => `<button type="button" class="chip ${x.code === it.hsn ? 'on' : ''}" data-pick="${esc(x.code)}" title="${esc(x.desc || x.label)}"><b>${esc(x.code)}</b> ${esc(x.label.length > 24 ? x.label.slice(0, 24) + '…' : x.label)}</button>`).join('') : '';
    };
    const autoHsn = (tr, it) => {
      if (!tr || !tr.isConnected) tr = $(`#items .item-row[data-i="${d.items.indexOf(it)}"]`);
      if (!tr) return;
      if (!it.hsnManual) {
        const list = hsnSuggestions(it.name, 1);
        it.hsn = list[0]?.code || '';
        $('[data-k=hsn]', tr).value = it.hsn;
      }
      drawSugg(tr, it);
      renderPreview();
    };
    const autoTimers = new WeakMap();
    const autoHsnSoon = (tr, it) => {
      clearTimeout(autoTimers.get(it));
      if (!it.hsnManual) { it.hsn = guessHsn(it.name); $('[data-k=hsn]', tr).value = it.hsn; }
      const run = () => (HSN.ready ? autoHsn(tr, it) : hsnReady().then(() => autoHsn(null, it)));
      autoTimers.set(it, setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(run, { timeout: 800 }) : run()), 550));
    };
    const renderItems = () => {
      $('#items').innerHTML = d.items.map(itemRow).join('');
      $$('#items .item-row').forEach((tr) => drawSugg(tr, d.items[+tr.dataset.i]));
      refresh();
    };

    const syncRow = (tr, it, skip) => {
      const l = calcLine(it);
      if (skip !== 'amount') $('[data-k=amount]', tr).value = it.rate === '' ? '' : r2(l.amount);
      if (skip !== 'rate') $('[data-k=rate]', tr).value = it.rate === '' ? '' : r2(it.rate);
      $('[data-sub]', tr).textContent = l.tax ? 'incl. GST ' + money(l.tax) : '';
    };

    $('#items').addEventListener('input', (e) => {
      const tr = e.target.closest('.item-row'); if (!tr) return; const it = d.items[+tr.dataset.i]; const k = e.target.dataset.k; if (!k) return;
      dirty = true;
      const v = e.target.value;
      if (k === 'name') {
        it.name = v;
        const p = S.products.find((x) => x.name.toLowerCase() === v.trim().toLowerCase());
        if (p && !/^(insert|delete)(Text|Content)/.test(e.inputType || '')) {
          Object.assign(it, { name: p.name, hsn: p.hsn || guessHsn(p.name), hsnManual: !!p.hsn, unit: p.unit || it.unit, rate: num(p.price), gst: num(p.gst_rate), incl: p.price_incl_tax !== false });
          const i = +tr.dataset.i; tr.outerHTML = itemRow(it, i); const row = $(`#items .item-row[data-i="${i}"]`); if (it.hsn) drawSugg(row, it); else autoHsnSoon(row, it); refresh(); return;
        }
        // HSN follows the item name unless the user typed or picked their own
        autoHsnSoon(tr, it);
      } else if (k === 'amount') { it.rate = v === '' ? '' : rateFromAmount(v, it); syncRow(tr, it, 'amount'); }
      else if (k === 'rate') { it.rate = v === '' ? '' : num(v); syncRow(tr, it, 'rate'); }
      else if (k === 'incl') { const keep = calcLine(it).amount; it.incl = v === '1'; if (it.rate !== '') it.rate = rateFromAmount(keep, it); syncRow(tr, it, 'amount'); }
      else if (k === 'qty' || k === 'gst') { it[k] = v === '' ? 0 : num(v); syncRow(tr, it); }
      else if (k === 'hsn') { it.hsn = v; it.hsnManual = v.trim() !== ''; if (!it.hsnManual) autoHsn(tr, it); else drawSugg(tr, it); }
      else it[k] = v;
      refresh();
    });
    // typing a saved product's exact name then leaving the field also fills it in
    $('#items').addEventListener('change', (e) => {
      if (e.target.dataset.k !== 'name') return;
      const tr = e.target.closest('.item-row'), i = +tr.dataset.i, it = d.items[i];
      const p = S.products.find((x) => x.name.toLowerCase() === it.name.trim().toLowerCase());
      if (p && it.rate === '') { Object.assign(it, { name: p.name, hsn: p.hsn || guessHsn(p.name), hsnManual: !!p.hsn, unit: p.unit || it.unit, rate: num(p.price), gst: num(p.gst_rate), incl: p.price_incl_tax !== false }); tr.outerHTML = itemRow(it, i); refresh(); }
    });
    $('#items').addEventListener('click', (e) => {
      const tr = e.target.closest('.item-row');
      const pick = e.target.closest('[data-pick]');
      if (pick) { const it = d.items[+tr.dataset.i]; it.hsn = pick.dataset.pick; it.hsnManual = true; $('[data-k=hsn]', tr).value = it.hsn; dirty = true; drawSugg(tr, it); renderPreview(); return; }
      if (e.target.closest('[data-find]')) {
        e.preventDefault();
        const i = +tr.dataset.i, it = d.items[i];
        openHsnSearch(it.name, (code) => { it.hsn = code; it.hsnManual = true; dirty = true; const row = $(`#items .item-row[data-i="${i}"]`); if (row) { $('[data-k=hsn]', row).value = code; drawSugg(row, it); } renderPreview(); });
        return;
      }
      if (!e.target.closest('[data-del]')) return;
      const i = +e.target.closest('.item-row').dataset.i; d.items.splice(i, 1); if (!d.items.length) d.items.push(blankItem()); dirty = true; renderItems();
    });
    $('#add-item').addEventListener('click', () => { d.items.push(blankItem()); renderItems(); $$('#items .item-row:last-child [data-k=name]')[0]?.focus(); });

    page.addEventListener('input', (e) => {
      const n = e.target.name; if (!n || e.target.closest('#items')) return;
      if (n.startsWith('opt-')) return renderPreview();
      dirty = true;
      if (n === 'paid') d.paid = num(e.target.value);
      else d[n] = n === 'customer_gstin' ? e.target.value.toUpperCase() : e.target.value;
      if (n === 'customer_name') {
        const c = S.customers.find((x) => x.name.toLowerCase() === e.target.value.trim().toLowerCase());
        if (c && d.customer_id !== c.id) {
          Object.assign(d, { customer_id: c.id, customer_address: c.address || '', customer_phone: c.phone || '', customer_gstin: c.gstin || '', place_of_supply: c.state || d.place_of_supply });
          ['customer_phone', 'customer_gstin', 'customer_address', 'place_of_supply'].forEach((k) => { $(`[name=${k}]`, page).value = d[k]; });
        } else if (!c) d.customer_id = null;
      }
      refresh();
    });
    page.addEventListener('change', (e) => { if (e.target.name?.startsWith('opt-')) renderPreview(); });
    $('#full-paid').addEventListener('click', () => { const c = calcBill(d.items, { ...opts(), paid: 0 }); d.paid = c.grand; $('[name=paid]', page).value = c.grand; dirty = true; refresh(); });
    $('#b-cancel').addEventListener('click', () => history.length > 1 ? history.back() : (location.hash = '#/bills'));

    async function save(after) {
      const c = calcBill(d.items, opts());
      if (!d.customer_name.trim()) { toast('Enter the customer name', true); $('[name=customer_name]', page).focus(); return; }
      if (!c.lines.length) { toast('Add at least one item', true); return; }
      const bad = c.lines.find((l) => !String(l.name || '').trim());
      if (bad) { toast('Every item needs a name', true); return; }
      const btns = $$('.sticky-save .btn', page); btns.forEach((b) => (b.disabled = true));
      try {
        // customer record
        let cust = d.customer_id ? S.customers.find((x) => x.id === d.customer_id) : null;
        const cRow = { name: d.customer_name.trim(), address: d.customer_address, phone: d.customer_phone, gstin: d.customer_gstin, state: d.place_of_supply };
        if (!cust) cust = await DB.saveCustomer(cRow).catch(() => null);
        else if (cust.address !== cRow.address || cust.phone !== cRow.phone || cust.gstin !== cRow.gstin) await DB.saveCustomer({ id: cust.id, ...cRow }).catch(() => null);
        if (cust) d.customer_id = cust.id;

        const items = c.lines.map((l) => ({ name: l.name.trim(), hsn: l.hsn || '', qty: l.qty, unit: l.unit || '', rate: l.rate, gst: num(l.gst), incl: !!l.incl }));
        const row = {
          bill_no: (d.bill_no || '').trim() || await DB.nextBillNo(),
          bill_date: d.bill_date || today(), customer_id: d.customer_id || null,
          customer_name: d.customer_name.trim(), customer_address: d.customer_address || null, customer_phone: d.customer_phone || null, customer_gstin: d.customer_gstin || null,
          place_of_supply: d.place_of_supply, items, total_qty: c.totalQty, sub_total: c.subTotal, total_tax: c.totalTax, tax_breakup: c.breakup,
          round_off: c.roundOff, grand_total: c.grand, paid: c.paid, balance: c.balance, notes: d.notes || null,
        };
        if (d.id) row.id = d.id;
        const saved = await DB.saveBill(row);
        Object.assign(d, saved, { items: d.items });
        $('[name=bill_no]', page).value = saved.bill_no;
        dirty = false;
        // remember new products for next time
        const known = new Set(S.products.map((p) => p.name.toLowerCase()));
        await DB.addMissingProducts(items.filter((i) => !known.has(i.name.toLowerCase())).map((i) => ({ name: i.name, hsn: i.hsn || null, unit: i.unit, price: r2(i.rate), gst_rate: i.gst, price_incl_tax: i.incl })));
        refreshLists();
        toast(`Bill ${saved.bill_no} saved`);
        if (after === 'print') await printBill(saved, signOpts(page));
        if (after === 'pdf') await downloadPdf(saved, signOpts(page));
        if (!isEdit) history.replaceState(null, '', '#/edit/' + saved.id);
        $('#page-title').textContent = 'Edit Bill';
      } catch (e) {
        fail(/duplicate key.*bill_no/i.test(e.message) ? new Error('That bill number already exists — change it or leave it blank for auto.') : e);
      } finally { btns.forEach((b) => (b.disabled = false)); }
    }
    $('#b-save').addEventListener('click', () => save());
    $('#b-save-print').addEventListener('click', () => save('print'));
    $('#b-save-pdf').addEventListener('click', () => save('pdf'));

    renderItems();
    if (!isEdit && !d.customer_name) $('[name=customer_name]', page).focus();
  }

  /* =========================== CUSTOMERS =========================== */
  async function pageCustomers(page) {
    const [custs, bills] = await Promise.all([DB.customers(), DB.bills({ limit: 5000 })]);
    S.customers = custs;
    const agg = {};
    bills.forEach((b) => { const k = b.customer_id || 'n:' + b.customer_name.toLowerCase(); agg[k] = agg[k] || { n: 0, t: 0, d: 0 }; agg[k].n++; agg[k].t += num(b.grand_total); agg[k].d += Math.max(0, num(b.balance)); });
    page.innerHTML = `
      <div class="card">
        <div class="card-h"><input class="input" id="c-q" placeholder="Search customers" style="max-width:320px"><button class="btn btn-primary btn-sm" id="c-add">${icon.plus}Add customer</button></div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Contact</th><th>Address</th><th class="num">Bills</th><th class="num">Billed</th><th class="num">Balance</th><th></th></tr></thead>
        <tbody id="c-body"></tbody></table></div>
      </div>`;
    const draw = () => {
      const q = $('#c-q').value.toLowerCase();
      const list = custs.filter((c) => !q || [c.name, c.phone, c.address].join(' ').toLowerCase().includes(q));
      $('#c-body').innerHTML = list.length ? list.map((c) => { const a = agg[c.id] || agg['n:' + c.name.toLowerCase()] || { n: 0, t: 0, d: 0 }; return `
        <tr data-id="${c.id}"><td><b>${esc(c.name)}</b>${c.gstin ? `<br><small class="muted">${esc(c.gstin)}</small>` : ''}</td><td>${esc(c.phone || '')}</td><td>${esc(c.address || '')}</td>
        <td class="num">${a.n}</td><td class="num">${money(a.t)}</td><td class="num" style="${a.d > 0 ? 'color:#b3261e;font-weight:600' : ''}">${money(a.d)}</td>
        <td class="acts"><a class="btn btn-sm" href="#/new/c/${c.id}">${icon.plus}Bill</a> <button class="icon-btn" data-act="edit">${icon.edit}</button><button class="icon-btn" data-act="del" style="color:#b3261e">${icon.del}</button></td></tr>`; }).join('')
        : '<tr><td colspan="7" class="empty">No customers yet — they are added automatically when you save a bill.</td></tr>';
    };
    draw();
    $('#c-q').addEventListener('input', draw);
    $('#c-add').addEventListener('click', () => customerForm({}, () => route()));
    $('#c-body').addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act; if (!act) return;
      const c = custs.find((x) => x.id === e.target.closest('tr').dataset.id);
      if (act === 'edit') customerForm(c, () => route());
      if (act === 'del' && await confirmBox('Delete customer?', `${c.name} will be removed. Their existing bills are kept.`)) { try { await DB.deleteCustomer(c.id); toast('Customer deleted'); route(); } catch (er) { fail(er); } }
    });
  }
  function customerForm(c, done) {
    const box = openModal(`
      <div class="modal-h"><h3>${c.id ? 'Edit' : 'Add'} customer</h3><button class="icon-btn" data-close>✕</button></div>
      <form class="grid g2">
        <label class="fld span2"><span>Name *</span><input class="input" name="name" required value="${esc(c.name || '')}"></label>
        <label class="fld"><span>Contact No.</span><input class="input" name="phone" value="${esc(c.phone || '')}"></label>
        <label class="fld"><span>GSTIN</span><input class="input" name="gstin" value="${esc(c.gstin || '')}"></label>
        <label class="fld span2"><span>Address</span><input class="input" name="address" value="${esc(c.address || '')}"></label>
        <label class="fld span2"><span>State</span><select class="select input" name="state">${STATES.map((s) => `<option ${s === (c.state || S.settings.state) ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
        <div class="span2" style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary">Save</button></div>
      </form>`, 'sm');
    $('form', box).addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target;
      try { await DB.saveCustomer({ id: c.id, name: f.name.value.trim(), phone: f.phone.value.trim(), gstin: f.gstin.value.trim().toUpperCase(), address: f.address.value.trim(), state: f.state.value }); closeModal(); toast('Customer saved'); refreshLists(); done(); }
      catch (er) { fail(er); }
    });
  }

  /* =========================== PRODUCTS =========================== */
  async function pageProducts(page) {
    const list = await DB.products(); S.products = list;
    page.innerHTML = `
      <div class="card">
        <div class="card-h"><div><h3>Products &amp; services</h3><span class="muted" style="font-size:12px">Pick these while billing — prices & GST fill in automatically.</span></div><button class="btn btn-primary btn-sm" id="p-add">${icon.plus}Add product</button></div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>Name</th><th>HSN</th><th>Unit</th><th class="num">Price</th><th>GST</th><th></th></tr></thead>
        <tbody>${list.length ? list.map((p) => `<tr data-id="${p.id}"><td><b>${esc(p.name)}</b></td><td>${esc(p.hsn || '')}</td><td>${esc(p.unit || '')}</td>
          <td class="num">${money(p.price)}<br><small class="muted">${p.price_incl_tax ? 'incl. GST' : '+ GST'}</small></td><td>${num(p.gst_rate)}%</td>
          <td class="acts"><button class="icon-btn" data-act="edit">${icon.edit}</button><button class="icon-btn" data-act="del" style="color:#b3261e">${icon.del}</button></td></tr>`).join('')
          : '<tr><td colspan="6" class="empty">No products yet.</td></tr>'}</tbody></table></div>
      </div>`;
    $('#p-add').addEventListener('click', () => productForm({ unit: 'Pcs', gst_rate: 0, price_incl_tax: true }));
    page.addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act; if (!act) return;
      const p = list.find((x) => x.id === e.target.closest('tr').dataset.id);
      if (act === 'edit') productForm(p);
      if (act === 'del' && await confirmBox('Delete product?', `${p.name} will be removed from the list.`)) { try { await DB.deleteProduct(p.id); toast('Product deleted'); route(); } catch (er) { fail(er); } }
    });
  }
  function productForm(p) {
    const box = openModal(`
      <div class="modal-h"><h3>${p.id ? 'Edit' : 'Add'} product</h3><button class="icon-btn" data-close>✕</button></div>
      <form class="grid g2">
        <label class="fld span2"><span>Name *</span><input class="input" name="name" required value="${esc(p.name || '')}"></label>
        <label class="fld"><span>HSN / SAC</span><input class="input" name="hsn" value="${esc(p.hsn || '')}"></label>
        <label class="fld"><span>Unit</span><input class="input" name="unit" list="dl-unit2" value="${esc(p.unit || 'Pcs')}"><datalist id="dl-unit2">${UNITS.map((u) => `<option value="${u}">`).join('')}</datalist></label>
        <label class="fld"><span>Price (₹)</span><input class="input" name="price" type="number" step="0.01" min="0" value="${p.price ?? ''}"></label>
        <label class="fld"><span>GST</span><select class="select input" name="gst_rate">${GST_RATES.map((g) => `<option value="${g}" ${num(p.gst_rate) === g ? 'selected' : ''}>${g}%</option>`).join('')}</select></label>
        <label class="check span2"><input type="checkbox" name="incl" ${p.price_incl_tax !== false ? 'checked' : ''}> Price includes GST</label>
        <div class="span2" style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary">Save</button></div>
      </form>`, 'sm');
    const pf = $('form', box);
    let hsnAuto = !p.hsn;
    pf.hsn.placeholder = 'auto from name';
    pf.hsn.insertAdjacentHTML('afterend', '<div class="hsn-sugg" id="pf-sugg" style="margin-top:6px"></div>');
    const pfDraw = () => {
      const list = hsnSuggestions(pf.name.value);
      if (hsnAuto) pf.hsn.value = list[0]?.code || '';
      $('#pf-sugg', box).innerHTML = list.map((x) => `<button type="button" class="chip ${x.code === pf.hsn.value ? 'on' : ''}" data-pick="${esc(x.code)}" title="${esc(x.desc || x.label)}"><b>${esc(x.code)}</b> ${esc(x.label.length > 30 ? x.label.slice(0, 30) + '…' : x.label)}</button>`).join('');
    };
    const pfSoon = debounce(() => hsnReady().then(pfDraw), 300);
    pf.name.addEventListener('input', () => { if (hsnAuto) pf.hsn.value = guessHsn(pf.name.value); pfSoon(); });
    pf.hsn.addEventListener('input', () => { hsnAuto = pf.hsn.value.trim() === ''; pfSoon(); });
    box.addEventListener('click', (e) => { const b = e.target.closest('#pf-sugg [data-pick]'); if (b) { pf.hsn.value = b.dataset.pick; hsnAuto = false; pfDraw(); } });
    if (p.name) pfSoon();
    pf.addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target;
      try { await DB.saveProduct({ id: p.id, name: f.name.value.trim(), hsn: f.hsn.value.trim(), unit: f.unit.value.trim(), price: num(f.price.value), gst_rate: num(f.gst_rate.value), price_incl_tax: f.incl.checked }); closeModal(); toast('Product saved'); route(); }
      catch (er) { fail(/duplicate/i.test(er.message) ? new Error('A product with this name already exists') : er); }
    });
  }

  /* =========================== SETTINGS =========================== */
  // Load an uploaded image, scale it down and turn the white paper background transparent.
  function processImage(file, maxW = 700) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, maxW / img.width);
        const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, cv.width, cv.height);
        const px = cx.getImageData(0, 0, cv.width, cv.height), a = px.data;
        for (let i = 0; i < a.length; i += 4) {
          const lum = (a[i] + a[i + 1] + a[i + 2]) / 3;
          if (lum > 225) a[i + 3] = 0; else if (lum > 180) a[i + 3] = Math.round(a[i + 3] * (225 - lum) / 45);
        }
        cx.putImageData(px, 0, 0);
        res(trimCanvas(cv).toDataURL('image/png'));
      };
      img.onerror = () => rej(new Error('Could not read that image'));
      img.src = URL.createObjectURL(file);
    });
  }
  function trimCanvas(cv) {
    const cx = cv.getContext('2d'), { data } = cx.getImageData(0, 0, cv.width, cv.height);
    let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (data[(y * cv.width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return cv;
    const out = document.createElement('canvas'); out.width = x1 - x0 + 9; out.height = y1 - y0 + 9;
    out.getContext('2d').drawImage(cv, x0 - 4, y0 - 4, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  function passwordCard() {
    return `<div class="card" style="margin-top:18px">
        <div class="card-h"><h3>Change password</h3></div>
        <form id="pw-form" class="grid g3" style="align-items:end">
          <label class="fld"><span>New password</span><input class="input" type="password" name="p1" minlength="8" required autocomplete="new-password"></label>
          <label class="fld"><span>Confirm password</span><input class="input" type="password" name="p2" minlength="8" required autocomplete="new-password"></label>
          <button class="btn btn-dark">Update password</button>
        </form>
      </div>`;
  }
  function wirePassword() {
    $('#pw-form').addEventListener('submit', async (e) => {
      e.preventDefault(); const { p1, p2 } = e.target;
      if (p1.value !== p2.value) return toast('Passwords do not match', true);
      try { await DB.changePassword(p1.value); e.target.reset(); toast('Password updated'); } catch (er) { fail(er); }
    });
  }

  async function pageSettings(page) {
    if (!S.isAdmin) {
      page.innerHTML = `<div class="card"><div class="card-h"><h3>${esc(S.user?.email || '')}</h3><span class="role staff">Staff</span></div>
        <p class="muted" style="margin:0">You can create bills, record payments and manage customers and products. Company details, signature, stamp and team are managed by the admin.</p></div>${passwordCard()}`;
      wirePassword();
      return;
    }
    S.settings = await DB.getSettings();
    const st = S.settings;
    let signature = st.signature || null, stamp = st.stamp || null;

    page.innerHTML = `
      <form id="set-form">
        <div class="card">
          <div class="card-h"><h3>Company details</h3><span class="muted" style="font-size:12px">Printed at the top of every bill</span></div>
          <div class="grid g2">
            <label class="fld"><span>Business name</span><input class="input" name="name"></label>
            <label class="fld"><span>GSTIN</span><input class="input" name="gstin" style="text-transform:uppercase"></label>
            <label class="fld span2"><span>Address</span><input class="input" name="address"></label>
            <label class="fld"><span>Phone</span><input class="input" name="phone"></label>
            <label class="fld"><span>Email</span><input class="input" name="email" type="email"></label>
            <label class="fld"><span>State</span><select class="select input" name="state">${STATES.map((s) => `<option>${esc(s)}</option>`).join('')}</select></label>
          </div>
        </div>

        <div class="card">
          <div class="card-h"><h3>Bill format</h3></div>
          <div class="grid g4">
            <label class="fld"><span>Bill title</span><input class="input" name="doc_title" placeholder="Bill / Tax Invoice"></label>
            <label class="fld"><span>Customer heading</span><input class="input" name="party_label" placeholder="Bill To"></label>
            <label class="fld"><span>Bill no. prefix</span><input class="input" name="bill_prefix" placeholder="KPE/"></label>
            <label class="fld"><span>Accent colour</span><div style="display:flex;gap:8px"><input type="color" class="swatch" name="accent_color"><button type="button" class="btn btn-sm" data-col="#9893e6" style="background:#9893e6;color:#fff">Lavender</button><button type="button" class="btn btn-sm" data-col="#5f9441" style="background:#5f9441;color:#fff">Green</button></div></label>
          </div>
          <div class="print-opts" style="margin-top:14px">
            <label class="check"><input type="checkbox" name="round_off"> Round off total to nearest rupee</label>
            <label class="check"><input type="checkbox" name="show_sign"> Show signature by default</label>
            <label class="check"><input type="checkbox" name="show_stamp"> Show stamp by default</label>
            <label class="check"><input type="checkbox" name="show_watermark"> Logo watermark on bill</label>
          </div>
          <div class="grid g2" style="margin-top:14px">
            <label class="fld"><span>Bank details (optional, printed on bill)</span><textarea class="input" name="bank_details" rows="3" placeholder="Bank: …&#10;A/c No: …&#10;IFSC: …"></textarea></label>
            <label class="fld"><span>Terms &amp; conditions (optional)</span><textarea class="input" name="terms" rows="3"></textarea></label>
          </div>
        </div>

        <div class="grid g2" style="margin-top:18px">
          <div class="card" style="margin:0">
            <div class="card-h"><h3>Signature</h3><span class="muted" style="font-size:12px">Draw or upload</span></div>
            <div class="grid g2">
              <div><canvas class="sig-pad" id="sig-pad"></canvas>
                <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button type="button" class="btn btn-sm" id="sig-clear">Clear pad</button><button type="button" class="btn btn-sm btn-primary" id="sig-use">Use drawing</button></div></div>
              <div><div class="asset-box" id="sig-box"></div>
                <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><label class="btn btn-sm">Upload photo<input type="file" accept="image/*" id="sig-file" hidden></label><button type="button" class="btn btn-sm btn-danger" id="sig-remove">Remove</button></div></div>
            </div>
          </div>
          <div class="card" style="margin:0">
            <div class="card-h"><h3>Stamp</h3><span class="muted" style="font-size:12px">Upload your rubber stamp or use the generated one</span></div>
            <div class="grid g2">
              <div><div class="asset-box" id="stamp-box"></div>
                <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><label class="btn btn-sm">Upload stamp<input type="file" accept="image/*" id="stamp-file" hidden></label><button type="button" class="btn btn-sm" id="stamp-reset">Use generated</button></div></div>
              <div class="grid" style="align-content:start">
                <label class="fld"><span>Stamp place text</span><input class="input" id="stamp-place" value="SANDILA, HARDOI (U.P.)"></label>
                <label class="fld"><span>Ink colour</span><input type="color" class="swatch" id="stamp-ink" value="#1d3fa6"></label>
                <button type="button" class="btn btn-sm" id="stamp-gen">Generate stamp</button>
              </div>
            </div>
          </div>
        </div>

        <div class="sticky-save"><button class="btn btn-primary" id="set-save">${icon.save}Save settings</button></div>
      </form>

      ${passwordCard()}`;

    const f = $('#set-form');
    ['name', 'gstin', 'address', 'phone', 'email', 'state', 'doc_title', 'party_label', 'bill_prefix', 'accent_color', 'bank_details', 'terms'].forEach((k) => { if (f[k]) f[k].value = st[k] ?? ''; });
    if (!f.accent_color.value || f.accent_color.value === '#000000') f.accent_color.value = st.accent_color || '#9893e6';
    f.show_watermark.checked = st.show_watermark !== false; f.round_off.checked = st.round_off !== false; f.show_sign.checked = st.show_sign !== false; f.show_stamp.checked = st.show_stamp !== false;
    f.addEventListener('click', (e) => { const c = e.target.closest('[data-col]'); if (c) f.accent_color.value = c.dataset.col; });

    const showSig = () => { $('#sig-box').innerHTML = signature ? `<img src="${signature}" alt="signature">` : '<span class="muted">No signature yet</span>'; };
    const showStamp = () => { $('#stamp-box').innerHTML = `<img src="${stamp || U.makeStamp(f.name.value || 'K.P. ENTERPRISES', $('#stamp-place').value)}" alt="stamp" style="max-height:140px">`; };
    showSig(); showStamp();

    // signature pad
    const pad = $('#sig-pad'); const ctx = pad.getContext('2d'); let drawing = false, drawn = false, last = null;
    const sizePad = () => { const r = pad.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; pad.width = r.width * dpr; pad.height = r.height * dpr; ctx.scale(dpr, dpr); ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = '#0d2a7a'; ctx.lineWidth = 2.4; };
    sizePad();
    const pt = (e) => { const r = pad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    pad.addEventListener('pointerdown', (e) => { drawing = true; drawn = true; last = pt(e); pad.setPointerCapture(e.pointerId); });
    pad.addEventListener('pointermove', (e) => { if (!drawing) return; const p = pt(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); const mx = (last.x + p.x) / 2, my = (last.y + p.y) / 2; ctx.quadraticCurveTo(last.x, last.y, mx, my); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; });
    ['pointerup', 'pointercancel'].forEach((ev) => pad.addEventListener(ev, () => { drawing = false; }));
    $('#sig-clear').addEventListener('click', () => { ctx.clearRect(0, 0, pad.width, pad.height); drawn = false; });
    $('#sig-use').addEventListener('click', () => { if (!drawn) return toast('Draw your signature on the pad first', true); signature = trimCanvas(pad).toDataURL('image/png'); showSig(); toast('Signature ready — click Save settings'); });
    $('#sig-file').addEventListener('change', async (e) => { const file = e.target.files[0]; if (!file) return; try { signature = await processImage(file, 600); showSig(); toast('Signature uploaded — click Save settings'); } catch (er) { fail(er); } });
    $('#sig-remove').addEventListener('click', () => { signature = null; showSig(); });
    $('#stamp-file').addEventListener('change', async (e) => { const file = e.target.files[0]; if (!file) return; try { stamp = await processImage(file, 500); showStamp(); toast('Stamp uploaded — click Save settings'); } catch (er) { fail(er); } });
    $('#stamp-gen').addEventListener('click', () => { stamp = U.makeStamp(f.name.value || 'K.P. ENTERPRISES', $('#stamp-place').value, $('#stamp-ink').value); showStamp(); });
    $('#stamp-reset').addEventListener('click', () => { stamp = null; showStamp(); });

    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const patch = {};
      ['name', 'gstin', 'address', 'phone', 'email', 'state', 'doc_title', 'party_label', 'bill_prefix', 'accent_color', 'bank_details', 'terms'].forEach((k) => { patch[k] = f[k].value.trim(); });
      patch.gstin = patch.gstin.toUpperCase();
      Object.assign(patch, { show_watermark: f.show_watermark.checked, round_off: f.round_off.checked, show_sign: f.show_sign.checked, show_stamp: f.show_stamp.checked, signature, stamp });
      const btn = $('#set-save'); btn.disabled = true;
      try { S.settings = await DB.saveSettings(patch); toast('Settings saved'); } catch (er) { fail(er); } finally { btn.disabled = false; }
    });

    wirePassword();
  }

  /* =========================== TEAM (admin) =========================== */
  async function pageTeam(page) {
    const { users } = await DB.team('list');
    const appUrl = location.origin + location.pathname;
    page.innerHTML = `
      <div class="card">
        <div class="card-h"><div><h3>Team logins</h3><span class="muted" style="font-size:12px">Everyone here can log in from any phone or computer — their bills save to the same records.</span></div>
          <button class="btn btn-primary btn-sm" id="t-add">${icon.plus}Add person</button></div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last login</th><th></th></tr></thead>
        <tbody>${users.map((u) => `<tr data-email="${esc(u.email)}">
          <td><b>${esc(u.full_name || '—')}</b>${u.is_me ? ' <span class="muted" style="font-size:11px">(you)</span>' : ''}</td>
          <td>${esc(u.email)}</td>
          <td><span class="role ${u.role === 'admin' ? 'admin' : 'staff'}">${u.role === 'admin' ? 'Admin' : 'Staff'}</span></td>
          <td>${u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '<span class="muted">Never</span>'}</td>
          <td class="acts">
            <button class="btn btn-sm" data-act="pw">Reset password</button>
            ${u.is_me ? '' : `<button class="btn btn-sm" data-act="role">${u.role === 'admin' ? 'Make staff' : 'Make admin'}</button>
            <button class="icon-btn" data-act="del" title="Remove access" style="color:#b3261e">${icon.del}</button>`}
          </td></tr>`).join('')}</tbody></table></div>
      </div>
      <div class="card">
        <div class="card-h"><h3>How your team logs in</h3></div>
        <div class="info-box">
          1. Add the person above with their email and a starting password.<br>
          2. Send them the app link: <b>${esc(appUrl)}</b> <button class="btn btn-sm" id="t-copy" style="margin-left:6px">Copy link</button><br>
          3. They log in on their phone or computer. On a phone, use the browser menu → <b>Add to Home screen</b> to install it like an app.<br>
          4. Windows computer: <a href="download/KPE-Billing-Setup.exe" download><b>Download the KPE Billing installer</b></a> (170 KB) — adds a full-screen KPE Billing app to the desktop.<br><br>
          <b>Admin</b> can do everything. <b>Staff</b> can make and edit bills, record payments and manage customers &amp; products, but cannot delete bills or change company settings, signature, stamp or team.
        </div>
      </div>`;
    $('#t-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(appUrl); toast('Link copied'); } catch (_) { toast(appUrl); } });
    $('#t-add').addEventListener('click', () => {
      const pw = 'KPE@' + Math.floor(1000 + Math.random() * 9000) + String.fromCharCode(97 + Math.floor(Math.random() * 26)) + String.fromCharCode(97 + Math.floor(Math.random() * 26));
      const box = openModal(`
        <div class="modal-h"><h3>Add a person</h3><button class="icon-btn" data-close>✕</button></div>
        <form class="grid g2">
          <label class="fld span2"><span>Name</span><input class="input" name="full_name" placeholder="e.g. Rohit (counter)"></label>
          <label class="fld span2"><span>Email (used to log in) *</span><input class="input" name="email" type="email" required autocomplete="off"></label>
          <label class="fld"><span>Starting password *</span><input class="input" name="password" type="text" minlength="8" required autocomplete="off" value="${pw}"></label>
          <label class="fld"><span>Role</span><select class="select input" name="role"><option value="staff">Staff</option><option value="admin">Admin</option></select></label>
          <p class="muted span2" style="margin:0;font-size:12px">Share the email and password with them. They can change the password after logging in (My account).</p>
          <div class="span2" style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary">Create login</button></div>
        </form>`, 'sm');
      $('form', box).addEventListener('submit', async (e) => {
        e.preventDefault(); const f = e.target, btn = $('button.btn-primary', f); btn.disabled = true;
        try { await DB.team('create', { email: f.email.value, password: f.password.value, role: f.role.value, full_name: f.full_name.value.trim() }); closeModal(); toast(`Login created for ${f.email.value}`); route(); }
        catch (er) { fail(er); btn.disabled = false; }
      });
    });
    page.addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act; if (!act) return;
      const email = e.target.closest('tr').dataset.email, u = users.find((x) => x.email === email);
      try {
        if (act === 'del' && await confirmBox('Remove access?', `${email} will no longer be able to log in. Bills they made are kept.`, 'Remove')) { await DB.team('remove', { email }); toast('Access removed'); route(); }
        if (act === 'role') { await DB.team('set_role', { email, role: u.role === 'admin' ? 'staff' : 'admin' }); toast('Role updated'); route(); }
        if (act === 'pw') {
          const box = openModal(`
            <div class="modal-h"><h3>New password for ${esc(email)}</h3><button class="icon-btn" data-close>✕</button></div>
            <form class="grid"><label class="fld"><span>New password</span><input class="input" name="p" type="text" minlength="8" required autocomplete="off"></label>
            <div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary">Set password</button></div></form>`, 'sm');
          $('form', box).addEventListener('submit', async (ev) => {
            ev.preventDefault();
            try { await DB.team('set_password', { email, password: ev.target.p.value }); closeModal(); toast('Password updated'); } catch (er) { fail(er); }
          });
        }
      } catch (er) { fail(er); }
    });
  }

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  /* =========================== BOOT =========================== */
  function passwordRecovery() {
    const box = openModal(`
      <div class="modal-h"><h3>Set a new password</h3></div>
      <form class="grid"><label class="fld"><span>New password</span><input class="input" type="password" name="p" minlength="8" required></label>
      <button class="btn btn-primary">Save password</button></form>`, 'sm');
    $('form', box).addEventListener('submit', async (e) => { e.preventDefault(); try { await DB.changePassword(e.target.p.value); closeModal(); toast('Password updated'); } catch (er) { fail(er); } });
  }

  (async function boot() {
    DB.onAuth((event) => {
      if (event === 'PASSWORD_RECOVERY') { enterApp().then(passwordRecovery); }
      if (event === 'SIGNED_OUT' && S.inApp) showLogin();
    });
    try {
      const sess = await DB.session();
      const cached = await DB.cachedUser();
      if (sess && await DB.isAllowed().catch(() => false)) { await DB.afterLogin(sess.user); await enterApp(); }
      else if (cached && (!sess || !navigator.onLine)) await enterApp(); // offline (or session refresh pending): keep working on this device
      else showLogin();
    } catch (e) { showLogin(); }
    $('#boot').classList.add('done');
    setTimeout(() => $('#boot').remove(), 500);
  })();

  // exposed for testing
  window.KPE = { S, route, printBill, downloadPdf };
})();

/* Shared helpers: formatting, GST maths, amount in words, states, stamp generator */
(function (root) {
  const U = {};

  U.r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  U.num = (v) => { const n = parseFloat(String(v ?? '').replace(/,/g, '')); return isFinite(n) ? n : 0; };

  U.money = (n) => '₹ ' + U.r2(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  U.moneyShort = (n) => {
    n = U.num(n);
    if (Math.abs(n) >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr';
    if (Math.abs(n) >= 1e5) return '₹' + (n / 1e5).toFixed(2) + ' L';
    if (Math.abs(n) >= 1e3) return '₹' + (n / 1e3).toFixed(1) + 'K';
    return '₹' + n.toFixed(0);
  };
  U.qty = (n) => { n = U.num(n); return Number.isInteger(n) ? String(n) : String(U.r2(n)); };
  U.pct = (n) => { n = U.num(n); return (Number.isInteger(n) ? n : U.r2(n)) + '%'; };

  U.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  U.today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  U.dmy = (iso) => { if (!iso) return ''; const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${d}-${m}-${y}`; };

  /* ---------------- GST maths ----------------
     item: { qty, rate, gst, incl }  rate = price per unit as typed
     incl=true  -> rate already contains GST (like the sample bill)
     incl=false -> GST is added on top of rate                           */
  U.calcLine = (it) => {
    const qty = U.num(it.qty), rate = U.num(it.rate), g = U.num(it.gst) / 100;
    const unitBase = it.incl ? rate / (1 + g) : rate;
    const taxable = unitBase * qty;
    const amount = it.incl ? rate * qty : taxable * (1 + g);
    return { qty, unitBase, taxable, tax: amount - taxable, amount };
  };

  // When the user types the line Amount directly, back-solve the rate.
  U.rateFromAmount = (amount, it) => {
    const qty = U.num(it.qty) || 1, g = U.num(it.gst) / 100;
    return it.incl ? U.num(amount) / qty : U.num(amount) / (1 + g) / qty;
  };

  U.stateCode = (s) => { const m = String(s || '').match(/^\s*(\d{2})/); return m ? m[1] : ''; };

  U.calcBill = (items, opts = {}) => {
    const lines = items.filter((i) => (i.name || '').trim() || U.num(i.rate)).map((i) => ({ ...i, ...U.calcLine(i) }));
    const inter = opts.companyState && opts.placeOfSupply && U.stateCode(opts.companyState) !== U.stateCode(opts.placeOfSupply);
    let totalQty = 0, sub = 0, tax = 0, total = 0;
    const byRate = {};
    lines.forEach((l) => {
      totalQty += l.qty; sub += l.taxable; tax += l.tax; total += l.amount;
      const g = U.num(l.gst);
      if (g > 0) { byRate[g] = byRate[g] || { rate: g, taxable: 0, tax: 0 }; byRate[g].taxable += l.taxable; byRate[g].tax += l.tax; }
    });
    const breakup = [];
    Object.values(byRate).sort((a, b) => a.rate - b.rate).forEach((r) => {
      if (inter) breakup.push({ label: `IGST@${U.pct(r.rate)}`, amount: U.r2(r.tax) });
      else {
        const half = U.r2(r.tax / 2);
        breakup.push({ label: `SGST@${U.pct(r.rate / 2)}`, amount: half });
        breakup.push({ label: `CGST@${U.pct(r.rate / 2)}`, amount: U.r2(r.tax - half) });
      }
    });
    total = U.r2(total);
    const roundOff = opts.roundOff ? U.r2(Math.round(total) - total) : 0;
    const grand = U.r2(total + roundOff);
    const paid = U.r2(U.num(opts.paid));
    return {
      lines, inter, totalQty: U.r2(totalQty), subTotal: U.r2(sub), totalTax: U.r2(tax),
      breakup, roundOff, grand, paid, balance: U.r2(grand - paid),
    };
  };

  /* ---------------- Amount in words (Indian system) ---------------- */
  const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''));
  const three = (n) => { const h = Math.floor(n / 100), r = n % 100; return [h ? ONES[h] + ' Hundred' : '', r ? two(r) : ''].filter(Boolean).join(' '); };
  const intWords = (n) => {
    if (n === 0) return 'Zero';
    const parts = [];
    const crore = Math.floor(n / 1e7); n %= 1e7;
    const lakh = Math.floor(n / 1e5); n %= 1e5;
    const thou = Math.floor(n / 1e3); n %= 1e3;
    if (crore) parts.push(intWords(crore) + ' Crore');
    if (lakh) parts.push(two(lakh) + ' Lakh');
    if (thou) parts.push(two(thou) + ' Thousand');
    if (n) parts.push(three(n));
    return parts.join(' ');
  };
  U.amountInWords = (amt) => {
    amt = U.r2(Math.abs(U.num(amt)));
    const rupees = Math.floor(amt), paise = Math.round((amt - rupees) * 100);
    let s = intWords(rupees) + ' Rupees';
    if (paise) s += ' and ' + two(paise) + ' Paise';
    return s + ' only';
  };

  U.STATES = ['01-Jammu and Kashmir', '02-Himachal Pradesh', '03-Punjab', '04-Chandigarh', '05-Uttarakhand', '06-Haryana', '07-Delhi', '08-Rajasthan', '09-Uttar Pradesh', '10-Bihar', '11-Sikkim', '12-Arunachal Pradesh', '13-Nagaland', '14-Manipur', '15-Mizoram', '16-Tripura', '17-Meghalaya', '18-Assam', '19-West Bengal', '20-Jharkhand', '21-Odisha', '22-Chhattisgarh', '23-Madhya Pradesh', '24-Gujarat', '26-Dadra and Nagar Haveli and Daman and Diu', '27-Maharashtra', '29-Karnataka', '30-Goa', '31-Lakshadweep', '32-Kerala', '33-Tamil Nadu', '34-Puducherry', '35-Andaman and Nicobar Islands', '36-Telangana', '37-Andhra Pradesh', '38-Ladakh'];
  U.UNITS = ['Pcs', 'Nos', 'Unit', 'Set', 'Bdl', 'Box', 'Kg', 'Mtr', 'Ft', 'Ltr', 'Kw', 'Pair', 'Roll', 'Job'];
  U.GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];

  /* ---------------- HSN / SAC from item name ----------------
     First match wins, so the more specific rules come first.
     Spellings used on K.P. Enterprises bills (INVETER, PANAL, STRUCER) are included. */
  const HSN_RULES = [
    [/\b(install|installation|fitting|labour|labor|commissioning|service charge|services?)\b/, '9954'],      // SAC: installation / works
    [/\b(transport|freight|delivery|cartage)\b/, '9965'],                                                 // SAC: goods transport
    [/(lithium|li-?ion|lifepo|\blfp\b)/, '85076000'],                                                    // lithium-ion battery
    [/(battery|batt\b|batery|tubular)/, '85072000'],                                                     // lead-acid battery
    [/(panel|panal|pannel|module|\bpv\b|mono ?perc|bifacial|topcon|\bdcr\b|solar plate)/, '85414300'],   // solar PV modules
    [/(inverter|inveter|invertor|invertar|\bpcu\b|\bups\b|mppt|charge controller|controller)/, '85044090'], // static converters
    [/(alumin)/, '76109090'],                                                                             // aluminium structure
    [/(structure|strucer|structer|struc|mounting|\bmms\b|\bstand\b|gi pipe|channel|frame)/, '73089090'],     // steel structure
    [/(cable|wire|\bdc wire|\bac wire)/, '8544'],                                                         // cables & wires
    [/(acdb|dcdb|distribution box|\bdb\b|combiner|junction box|\bajb\b)/, '8537'],                       // distribution boxes
    [/(\bmcb\b|mccb|isolator|switch|fuse|\bspd\b|connector|\bmc4\b|\brccb\b)/, '8536'],                  // switchgear / connectors
    [/(lightning|arrester|arrestor|earthing|earth kit|\bla\b)/, '8535'],                                  // lightning arrester / earthing
    [/(net meter|meter)/, '9028'],                                                                        // electricity meter
    [/(pump)/, '8413'],                                                                                   // solar pump
    [/(water heater|geyser)/, '8419'],                                                                    // solar water heater
    [/(street ?light|light|lamp|lantern)/, '9405'],                                                       // solar lights
    [/(nut|bolt|screw|fastener|hardware|clamp|washer|anchor)/, '7318'],                                  // fasteners / hardware
  ];
  U.guessHsn = (name) => {
    const n = ' ' + String(name || '').toLowerCase() + ' ';
    for (const [re, code] of HSN_RULES) if (re.test(n)) return code;
    return '';
  };

  /* ---------------- Default round stamp (crisp SVG data URL) ---------------- */
  U.makeStamp = (company = 'K.P. ENTERPRISES', place = 'SANDILA, HARDOI (U.P.)', color = '#22389a') => {
    const c = U.esc(color);
    const rays = Array.from({ length: 12 }, (_, i) => {
      const a = (i * 30 - 90) * Math.PI / 180, r1 = 15, r2 = i % 2 ? 21 : 24;
      return `<line x1="${(110 + r1 * Math.cos(a)).toFixed(1)}" y1="${(100 + r1 * Math.sin(a)).toFixed(1)}" x2="${(110 + r2 * Math.cos(a)).toFixed(1)}" y2="${(100 + r2 * Math.sin(a)).toFixed(1)}"/>`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="440" height="440">
<defs>
<path id="top" d="M 30 110 A 80 80 0 0 1 190 110"/>
<path id="bot" d="M 24 110 A 86 86 0 0 0 196 110"/>
</defs>
<g fill="none" stroke="${c}" stroke-linecap="round">
<circle cx="110" cy="110" r="105" stroke-width="5"/>
<circle cx="110" cy="110" r="98.5" stroke-width="1.5"/>
<circle cx="110" cy="110" r="60" stroke-width="2"/>
<circle cx="110" cy="100" r="10" stroke-width="2.4"/>
<g stroke-width="2.4">${rays}</g>
</g>
<g fill="${c}" font-family="Arial, Helvetica, sans-serif" font-weight="700" text-anchor="middle">
<text font-size="20.5" letter-spacing="1.6"><textPath href="#top" startOffset="50%">${U.esc(company.toUpperCase())}</textPath></text>
<text font-size="13.5" letter-spacing="1.4" dominant-baseline="hanging"><textPath href="#bot" startOffset="50%">${U.esc(place.toUpperCase())}</textPath></text>
<text x="38" y="116" font-size="15">★</text><text x="182" y="116" font-size="15">★</text>
<text x="110" y="140" font-size="10.5" letter-spacing=".8">SOLAR ENERGY</text>
</g>
</svg>`;
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  };

  root.U = U;
  if (typeof module !== 'undefined') module.exports = U;
})(typeof window !== 'undefined' ? window : globalThis);

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

  /* ---------------- K.P. Enterprises proprietor stamp (traced from the rubber stamp) ----------------
     "K.P. ENTERPRISES" on top, "PROPRIETOR" bottom-right, gap in between for the signature.
     Pure vector outlines, so it prints sharp at any size and needs no fonts. */
  const KPE_STAMP_TOP = 'M47.8 58 29.6 36.8 23.6 41.1V58H17.4V14H23.6V36L45.6 14H52.9L33.5 33.1L55.5 58Z M62.3 58V51.2H68.6V58Z M115.4 27.2Q115.4 33.5 111.2 37.2Q107 40.9 99.7 40.9H86.3V58H80.1V14H99.3Q107 14 111.2 17.5Q115.4 20.9 115.4 27.2ZM109.2 27.3Q109.2 18.8 98.6 18.8H86.3V36.1H98.9Q109.2 36.1 109.2 27.3Z M125 58V51.2H131.3V58Z M161.2 58V14H195.9V18.9H167.4V33H193.9V37.8H167.4V53.1H197.2V58Z M235.1 58 210.7 20.5 210.8 23.6 211 28.8V58H205.5V14H212.7L237.4 51.7Q237 45.6 237 42.9V14H242.6V58Z M271.3 18.9V58H265.1V18.9H249.5V14H287V18.9Z M293.9 58V14H328.6V18.9H300.1V33H326.6V37.8H300.1V53.1H329.9V58Z M370.4 58 358.6 39.7H344.4V58H338.2V14H359.7Q367.4 14 371.6 17.3Q375.8 20.7 375.8 26.6Q375.8 31.5 372.8 34.8Q369.8 38.2 364.6 39L377.6 58ZM369.5 26.6Q369.5 22.8 366.8 20.8Q364.1 18.8 359 18.8H344.4V35H359.3Q364.2 35 366.9 32.8Q369.5 30.6 369.5 26.6Z M421.4 27.2Q421.4 33.5 417.2 37.2Q412.9 40.9 405.7 40.9H392.3V58H386.1V14H405.3Q413 14 417.2 17.5Q421.4 20.9 421.4 27.2ZM415.2 27.3Q415.2 18.8 404.6 18.8H392.3V36.1H404.8Q415.2 36.1 415.2 27.3Z M462.6 58 450.8 39.7H436.5V58H430.3V14H451.8Q459.5 14 463.7 17.3Q467.9 20.7 467.9 26.6Q467.9 31.5 465 34.8Q462 38.2 456.8 39L469.7 58ZM461.7 26.6Q461.7 22.8 459 20.8Q456.3 18.8 451.2 18.8H436.5V35H451.5Q456.4 35 459 32.8Q461.7 30.6 461.7 26.6Z M478.9 58V14H485.1V58Z M532.5 45.9Q532.5 51.9 527.5 55.3Q522.6 58.6 513.6 58.6Q496.9 58.6 494.3 47.4L500.3 46.3Q501.3 50.3 504.7 52.1Q508 54 513.8 54Q519.8 54 523.1 52Q526.3 50 526.3 46.2Q526.3 44 525.3 42.7Q524.3 41.3 522.4 40.4Q520.6 39.6 518 39Q515.5 38.4 512.4 37.7Q507 36.5 504.2 35.4Q501.4 34.2 499.7 32.8Q498.1 31.4 497.3 29.5Q496.4 27.6 496.4 25.1Q496.4 19.5 500.9 16.4Q505.4 13.3 513.7 13.3Q521.5 13.3 525.6 15.6Q529.7 17.9 531.4 23.5L525.3 24.5Q524.3 21 521.5 19.4Q518.7 17.8 513.7 17.8Q508.2 17.8 505.3 19.6Q502.4 21.3 502.4 24.8Q502.4 26.8 503.5 28.2Q504.7 29.5 506.8 30.4Q508.9 31.3 515.2 32.7Q517.3 33.1 519.3 33.6Q521.4 34.1 523.3 34.8Q525.3 35.5 526.9 36.4Q528.6 37.3 529.8 38.6Q531.1 39.9 531.8 41.7Q532.5 43.4 532.5 45.9Z M540.9 58V14H575.6V18.9H547.1V33H573.6V37.8H547.1V53.1H576.9V58Z M621 45.9Q621 51.9 616 55.3Q611.1 58.6 602.1 58.6Q585.4 58.6 582.8 47.4L588.8 46.3Q589.8 50.3 593.2 52.1Q596.5 54 602.3 54Q608.3 54 611.6 52Q614.8 50 614.8 46.2Q614.8 44 613.8 42.7Q612.8 41.3 610.9 40.4Q609.1 39.6 606.5 39Q604 38.4 600.9 37.7Q595.5 36.5 592.7 35.4Q589.9 34.2 588.2 32.8Q586.6 31.4 585.8 29.5Q584.9 27.6 584.9 25.1Q584.9 19.5 589.4 16.4Q593.9 13.3 602.2 13.3Q610 13.3 614.1 15.6Q618.2 17.9 619.9 23.5L613.8 24.5Q612.8 21 610 19.4Q607.2 17.8 602.2 17.8Q596.7 17.8 593.8 19.6Q590.9 21.3 590.9 24.8Q590.9 26.8 592 28.2Q593.2 29.5 595.3 30.4Q597.4 31.3 603.7 32.7Q605.8 33.1 607.9 33.6Q609.9 34.1 611.9 34.8Q613.8 35.5 615.4 36.4Q617.1 37.3 618.3 38.6Q619.6 39.9 620.3 41.7Q621 43.4 621 45.9Z';
  const KPE_STAMP_BOT = 'M310.1 200.2Q310.1 205.1 306.8 207.9Q303.5 210.8 297.8 210.8H287.2V224H282.3V190H297.4Q303.5 190 306.8 192.7Q310.1 195.4 310.1 200.2ZM305.2 200.3Q305.2 193.7 296.9 193.7H287.2V207.1H297.1Q305.2 207.1 305.2 200.3Z M342.6 224 333.3 209.9H322.1V224H317.2V190H334.1Q340.2 190 343.5 192.6Q346.8 195.1 346.8 199.7Q346.8 203.5 344.5 206.1Q342.2 208.7 338 209.4L348.3 224ZM341.9 199.8Q341.9 196.8 339.8 195.2Q337.7 193.7 333.7 193.7H322.1V206.2H333.9Q337.7 206.2 339.8 204.5Q341.9 202.8 341.9 199.8Z M388.9 206.8Q388.9 212.2 386.7 216.2Q384.6 220.2 380.5 222.3Q376.5 224.5 371 224.5Q365.5 224.5 361.4 222.4Q357.4 220.2 355.3 216.2Q353.2 212.2 353.2 206.8Q353.2 198.7 357.9 194.1Q362.6 189.5 371.1 189.5Q376.6 189.5 380.6 191.6Q384.6 193.6 386.8 197.6Q388.9 201.5 388.9 206.8ZM383.9 206.8Q383.9 200.5 380.6 196.9Q377.2 193.3 371.1 193.3Q364.9 193.3 361.5 196.8Q358.1 200.4 358.1 206.8Q358.1 213.2 361.5 217Q365 220.7 371 220.7Q377.2 220.7 380.6 217.1Q383.9 213.5 383.9 206.8Z M423.5 200.2Q423.5 205.1 420.2 207.9Q416.9 210.8 411.2 210.8H400.6V224H395.7V190H410.8Q416.9 190 420.2 192.7Q423.5 195.4 423.5 200.2ZM418.6 200.3Q418.6 193.7 410.3 193.7H400.6V207.1H410.5Q418.6 207.1 418.6 200.3Z M456 224 446.7 209.9H435.5V224H430.6V190H447.5Q453.6 190 456.9 192.6Q460.2 195.1 460.2 199.7Q460.2 203.5 457.9 206.1Q455.6 208.7 451.4 209.4L461.7 224ZM455.3 199.8Q455.3 196.8 453.2 195.2Q451.1 193.7 447.1 193.7H435.5V206.2H447.3Q451.1 206.2 453.2 204.5Q455.3 202.8 455.3 199.8Z M468.9 224V190H473.8V224Z M482.9 224V190H510.2V193.8H487.8V204.7H508.7V208.4H487.8V220.2H511.3V224Z M531.9 193.8V224H527.1V193.8H514.7V190H544.3V193.8Z M583.7 206.8Q583.7 212.2 581.5 216.2Q579.4 220.2 575.3 222.3Q571.3 224.5 565.8 224.5Q560.3 224.5 556.2 222.4Q552.2 220.2 550.1 216.2Q548 212.2 548 206.8Q548 198.7 552.7 194.1Q557.4 189.5 565.9 189.5Q571.4 189.5 575.4 191.6Q579.4 193.6 581.6 197.6Q583.7 201.5 583.7 206.8ZM578.7 206.8Q578.7 200.5 575.4 196.9Q572 193.3 565.9 193.3Q559.7 193.3 556.3 196.8Q552.9 200.4 552.9 206.8Q552.9 213.2 556.4 217Q559.8 220.7 565.8 220.7Q572.1 220.7 575.4 217.1Q578.7 213.5 578.7 206.8Z M616 224 606.6 209.9H595.4V224H590.5V190H607.4Q613.5 190 616.8 192.6Q620.1 195.1 620.1 199.7Q620.1 203.5 617.8 206.1Q615.5 208.7 611.4 209.4L621.6 224ZM615.2 199.8Q615.2 196.8 613.1 195.2Q611 193.7 607 193.7H595.4V206.2H607.2Q611 206.2 613.1 204.5Q615.2 202.8 615.2 199.8Z';
  U.STAMP_INK = '#2b2f9e';
  U.makeProprietorStamp = (color = U.STAMP_INK) => {
    const c = U.esc(color);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 236" width="640" height="236"><g fill="${c}" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"><path d="${KPE_STAMP_TOP}"/><path d="${KPE_STAMP_BOT}"/></g></svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
  };

  /* Is an image data URL clearly wider than tall (a rectangular stamp rather than a round one)? */
  U.isWideImage = (src) => {
    try {
      const [head, body] = String(src || '').split(',');
      if (!body) return false;
      if (head.startsWith('data:image/svg')) {
        const svg = head.includes('base64') ? atob(body) : decodeURIComponent(body);
        const m = svg.match(/viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/);
        return !!m && m[1] / m[2] > 1.5;
      }
      if (head.startsWith('data:image/png')) {
        const b = atob(body.slice(0, 44));
        const n = (i) => ((b.charCodeAt(i) << 24) | (b.charCodeAt(i + 1) << 16) | (b.charCodeAt(i + 2) << 8) | b.charCodeAt(i + 3)) >>> 0;
        return n(16) / n(20) > 1.5;
      }
    } catch (e) { /* fall through */ }
    return false;
  };

  root.U = U;
  if (typeof module !== 'undefined') module.exports = U;
})(typeof window !== 'undefined' ? window : globalThis);

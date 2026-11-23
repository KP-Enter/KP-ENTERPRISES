/* Renders a payment receipt as A4 HTML — same letterhead, stamp and signature as the bill */
(function () {
  const { esc, money, dmy, amountInWords } = window.U;
  const n = (v) => Number(v) || 0;

  /**
   * @param p     payments row { receipt_no, pay_date, bill_no, bill_date, customer_name, customer_address,
   *                             customer_phone, customer_gstin, amount, mode, reference, notes,
   *                             bill_total, balance_after }
   * @param co    company_settings row
   * @param opts  { sign: bool, stamp: bool }
   */
  function renderReceipt(p, co, opts = {}) {
    co = co || {};
    const showSign = opts.sign ?? co.show_sign !== false;
    const showStamp = opts.stamp ?? co.show_stamp !== false;
    const stampSrc = co.stamp || window.U.makeProprietorStamp();
    const wideStamp = window.U.isWideImage(stampSrc);

    const amount = n(p.amount), total = n(p.bill_total), balance = Math.max(0, n(p.balance_after));
    const earlier = Math.max(0, Math.round((total - balance - amount) * 100) / 100);
    const cols = '<colgroup><col class="r-no"><col class="r-desc"><col class="r-mode"><col class="r-ref"><col class="r-amt"></colgroup>';
    const desc = p.bill_no
      ? `Payment received against Bill No. ${esc(p.bill_no)}${p.bill_date ? ' dated ' + esc(dmy(p.bill_date)) : ''}`
      : 'Payment received';

    const sumRows = [
      ...(p.bill_no ? [['Bill Amount', money(total)]] : []),
      ...(earlier > 0 ? [['Received Earlier', money(earlier)]] : []),
    ].map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('');

    return `
<div class="inv rcpt" style="--acc:${esc(co.accent_color || '#9893e6')}">
  ${co.show_watermark !== false ? '<img class="inv-wm" src="assets/kpe-logo.png" alt="">' : ''}
  <div class="inv-head">
    <div class="inv-co">
      <h1>${esc(co.name || 'K.P. ENTERPRISES')}</h1>
      ${co.address ? `<p>${esc(co.address)}</p>` : ''}
      ${co.phone ? `<p>Phone no. : ${esc(co.phone)}</p>` : ''}
      ${co.email ? `<p>Email : ${esc(co.email)}</p>` : ''}
      ${co.gstin ? `<p>GSTIN : ${esc(co.gstin)}</p>` : ''}
      ${co.state ? `<p>State: ${esc(co.state)}</p>` : ''}
    </div>
    <img class="inv-logo" src="assets/kpe-logo.png" alt="">
  </div>

  <div class="inv-title">Payment Receipt</div>

  <div class="inv-parties">
    <div>
      <div class="h">Received From</div>
      <div class="nm">${esc(p.customer_name || '—')}${p.customer_address ? ' ' + esc(p.customer_address) : ''}</div>
      ${p.customer_phone ? `<div>Contact No. : ${esc(p.customer_phone)}</div>` : ''}
      ${p.customer_gstin ? `<div>GSTIN : ${esc(p.customer_gstin)}</div>` : ''}
    </div>
    <div class="right">
      <div class="h">Receipt Details</div>
      ${p.receipt_no ? `<div>Receipt No. : ${esc(p.receipt_no)}</div>` : ''}
      <div>Date : ${esc(dmy(p.pay_date))}</div>
      ${p.bill_no ? `<div>Against Bill No. : ${esc(p.bill_no)}</div>` : ''}
    </div>
  </div>

  <div class="inv-body">
    <table class="inv-items">
      ${cols}
      <thead><tr>
        <th class="l">#</th><th class="l">Description</th><th class="l">Payment Mode</th><th class="l">Reference No.</th><th>Amount</th>
      </tr></thead>
      <tbody><tr>
        <td class="l">1</td>
        <td class="l nm">${desc}</td>
        <td class="l">${esc(p.mode || '')}</td>
        <td class="l">${esc(p.reference || '')}</td>
        <td>${money(amount)}</td>
      </tr></tbody>
    </table>
    <div class="inv-spacer"></div>
    <table class="inv-total">
      ${cols}
      <tr><td></td><td class="l">Total Received</td><td></td><td></td><td>${money(amount)}</td></tr>
    </table>
  </div>

  <div class="inv-bottom">
    <div class="inv-words">
      <div class="h">Amount Received In Words</div>
      <p>${esc(amountInWords(amount))}</p>
      ${p.notes ? `<div class="extra"><div class="h">Notes</div><p>${esc(p.notes)}</p></div>` : ''}
    </div>
    <div class="inv-sum">
      <table>
        ${sumRows}
        <tr class="tot"><td>Amount Received</td><td>${money(amount)}</td></tr>
        ${p.bill_no ? `<tr><td>Balance Due</td><td>${money(balance)}</td></tr>` : ''}
      </table>
    </div>
  </div>

  <div class="inv-sign">
    <div class="for">For :${esc(co.name || 'K.P. ENTERPRISES')}</div>
    <div class="area${wideStamp ? ' wide' : ''}">
      ${showStamp ? `<img class="stamp" src="${esc(stampSrc)}" alt="">` : ''}
      ${showSign && co.signature ? `<img class="sig" src="${esc(co.signature)}" alt="">` : ''}
    </div>
    <div class="lbl">Authorized Signatory</div>
  </div>
</div>`;
  }

  window.renderReceipt = renderReceipt;
})();

/* Renders a bill as A4 HTML in the K.P. Enterprises format */
(function () {
  const { esc, money, qty, pct, dmy, amountInWords, calcBill } = window.U;

  /**
   * @param bill  { bill_no, bill_date, customer_name, customer_address, customer_phone,
   *                customer_gstin, place_of_supply, items[], paid, notes }
   * @param co    company_settings row
   * @param opts  { sign: bool, stamp: bool }
   */
  function renderInvoice(bill, co, opts = {}) {
    co = co || {};
    const c = calcBill(bill.items || [], {
      companyState: co.state, placeOfSupply: bill.place_of_supply,
      roundOff: co.round_off !== false, paid: bill.paid,
    });
    const showSign = opts.sign ?? co.show_sign !== false;
    const showStamp = opts.stamp ?? co.show_stamp !== false;
    const stampSrc = co.stamp || window.U.makeProprietorStamp();
    const wideStamp = window.U.isWideImage(stampSrc);

    const cols = `<colgroup><col class="c-no"><col class="c-name"><col class="c-hsn"><col class="c-qty"><col class="c-unit"><col class="c-rate"><col class="c-gst"><col class="c-amt"></colgroup>`;

    const rows = c.lines.map((l, i) => `
      <tr>
        <td class="l">${i + 1}</td>
        <td class="l nm">${esc(l.name)}</td>
        <td class="l">${esc(l.hsn || '')}</td>
        <td>${qty(l.qty)}</td>
        <td>${esc(l.unit || '')}</td>
        <td>${money(l.unitBase)}</td>
        <td class="gst">${money(l.tax)} (${pct(l.gst)})</td>
        <td>${money(l.amount)}</td>
      </tr>`).join('');

    const sumRows = [
      ['Sub Total', money(c.subTotal)],
      ...c.breakup.map((b) => [esc(b.label), money(b.amount)]),
      ...(c.roundOff ? [['Round off', (c.roundOff > 0 ? '+ ' : '- ') + money(Math.abs(c.roundOff))]] : []),
    ].map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('');

    const extra = [
      bill.notes ? `<div class="extra"><div class="h">Notes</div><p>${esc(bill.notes)}</p></div>` : '',
      co.bank_details ? `<div class="extra"><div class="h">Bank Details</div><p>${esc(co.bank_details)}</p></div>` : '',
      co.terms ? `<div class="extra"><div class="h">Terms &amp; Conditions</div><p>${esc(co.terms)}</p></div>` : '',
    ].join('');

    return `
<div class="inv" style="--acc:${esc(co.accent_color || '#9893e6')}">
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

  <div class="inv-title">${esc(co.doc_title || 'Bill')}</div>

  <div class="inv-parties">
    <div>
      <div class="h">${esc(co.party_label || 'Bill To')}</div>
      <div class="nm">${esc(bill.customer_name || '—')}${bill.customer_address ? ' ' + esc(bill.customer_address) : ''}</div>
      ${bill.customer_phone ? `<div>Contact No. : ${esc(bill.customer_phone)}</div>` : ''}
      ${bill.customer_gstin ? `<div>GSTIN : ${esc(bill.customer_gstin)}</div>` : ''}
    </div>
    <div class="right">
      <div class="h">Bill Details</div>
      ${bill.bill_no ? `<div>Bill No. : ${esc(bill.bill_no)}</div>` : ''}
      <div>Date : ${esc(dmy(bill.bill_date))}</div>
      <div>Place of supply: ${esc(bill.place_of_supply || co.state || '')}</div>
    </div>
  </div>

  <div class="inv-body">
    <table class="inv-items">
      ${cols}
      <thead><tr>
        <th class="l">#</th><th class="l">Item name</th><th class="l">HSN/ SAC</th><th>Quantity</th>
        <th>Unit</th><th>Price/ Unit</th><th>GST</th><th>Amount</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="8" class="l" style="color:#999;padding:18px 6px">No items yet</td></tr>'}</tbody>
    </table>
    <div class="inv-spacer"></div>
    <table class="inv-total">
      ${cols}
      <tr><td></td><td class="l">Total</td><td></td><td>${qty(c.totalQty)}</td><td></td><td></td>
          <td>${money(c.totalTax)}</td><td>${money(c.grand - c.roundOff)}</td></tr>
    </table>
  </div>

  <div class="inv-bottom">
    <div class="inv-words">
      <div class="h">Bill Amount In Words</div>
      <p>${esc(amountInWords(c.grand))}</p>
      ${extra}
    </div>
    <div class="inv-sum">
      <table>
        ${sumRows}
        <tr class="tot"><td>Total</td><td>${money(c.grand)}</td></tr>
        <tr><td>Paid</td><td>${money(c.paid)}</td></tr>
        <tr><td>Balance</td><td>${money(c.balance)}</td></tr>
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

  window.renderInvoice = renderInvoice;
})();

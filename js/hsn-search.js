/* HSN / SAC finder for any product name.
   Searches the full official HSN directory (data/hsn.json, ~12,600 goods codes + ~500 SAC service codes).
   Everyday trade words are translated into the technical words the tariff uses
   (e.g. "solar panel" -> "photovoltaic modules", "inverter" -> "static converters"). */
(function (root) {
  // common misspellings -> correct word
  const FIX = {
    panal: 'panel', pannel: 'panel', pannal: 'panel', inveter: 'inverter', invertor: 'inverter', invertar: 'inverter',
    strucer: 'structure', structer: 'structure', strucure: 'structure', batery: 'battery', battary: 'battery', battry: 'battery',
    wair: 'wire', cabel: 'cable', moduel: 'module', lithum: 'lithium', alluminium: 'aluminium', aluminum: 'aluminium',
    sement: 'cement', chimeny: 'chimney', mobil: 'mobile', laptap: 'laptop', tyre: 'tyre', tire: 'tyre', colour: 'color',
    almirah: 'cupboard', almira: 'cupboard', bulb: 'lamp', tubelight: 'lamp', geyser: 'water heater',
  };
  // everyday word -> words used in the official HSN descriptions
  const SYN = {
    solar: ['photovoltaic', 'solar'], panel: ['photovoltaic', 'panels', 'modules'], module: ['photovoltaic', 'modules'], pv: ['photovoltaic'],
    inverter: ['static converters', 'inverters'], ups: ['static converters', 'uninterrupted power'], converter: ['static converters'],
    charger: ['static converters', 'chargers'], controller: ['static converters', 'controlling'], mppt: ['static converters'], pcu: ['static converters'],
    battery: ['accumulators', 'batteries'], lithium: ['lithium-ion', 'lithium'], 'li-ion': ['lithium-ion'], lfp: ['lithium-ion'], tubular: ['lead-acid'],
    cell: ['primary cells', 'cells'], pvc: ['polymers of vinyl chloride', 'plastics'], cpvc: ['polymers of vinyl chloride', 'plastics'], hdpe: ['polymers of ethylene', 'plastics'],
    'net meter': ['electricity meters'], 'energy meter': ['electricity meters'], 'electric meter': ['electricity meters'], office: ['seats', 'furniture'], structure: ['structures'], stand: ['structures', 'stands'], mounting: ['structures'],
    wire: ['electric conductors', 'plastic insulated', 'wire'], cable: ['electric conductors', 'plastic insulated', 'cable'], earthing: ['earthing', 'conductors'],
    mcb: ['miniature circuit breakers'], mccb: ['moulded case circuit breakers'], breaker: ['circuit breakers'], rccb: ['earth leak circuit breakers'], elcb: ['earth leak circuit breakers'],
    switch: ['switches'], socket: ['plugs and sockets', 'sockets'], plug: ['plugs'], connector: ['connectors'], fuse: ['fuses'],
    acdb: ['boards, panels, consoles'], dcdb: ['boards, panels, consoles'], db: ['boards, panels, consoles'], 'distribution box': ['boards, panels, consoles'],
    'water tank': ['reservoirs, tanks, vats'], 'gi pipe': ['tubes, pipes and hollow profiles', 'galvanised'], 'ms pipe': ['tubes, pipes and hollow profiles'],
    meter: ['meters', 'electricity meters'], transformer: ['transformers'], motor: ['electric motors'], generator: ['generating sets', 'generators'],
    fan: ['fans'], cooler: ['air coolers', 'coolers'], ac: ['air conditioning'], 'air conditioner': ['air conditioning'],
    fridge: ['refrigerators'], refrigerator: ['refrigerators'], 'washing machine': ['washing machines'], tv: ['television'], led: ['light-emitting diode', 'led'],
    lamp: ['lamps', 'lighting'], light: ['lamps', 'lighting', 'luminaires'], streetlight: ['lamps', 'lighting'], torch: ['torches'],
    mobile: ['telephones for cellular networks', 'cellular'], phone: ['telephones'], laptop: ['portable automatic data processing'], computer: ['automatic data processing'],
    printer: ['printers'], cctv: ['television cameras', 'cameras'], camera: ['cameras'], speaker: ['loudspeakers'], earphone: ['headphones', 'earphones'],
    pump: ['pumps for liquids', 'pumps'], motorpump: ['pumps'], submersible: ['submersible', 'handle water', 'centrifugal'], 'water pump': ['handle water', 'pumps for liquids'], monoblock: ['handle water', 'centrifugal'], pipe: ['tubes', 'pipes'], hose: ['tubes', 'hose'],
    tap: ['taps', 'cocks', 'valves'], valve: ['valves'], tank: ['reservoirs', 'tanks', 'vats'], 'water heater': ['water heaters'],
    bolt: ['bolts'], nut: ['nuts'], screw: ['screws'], washer: ['washers'], nail: ['nails'], rivet: ['rivets'], clamp: ['clamps'],
    hardware: ['screws', 'bolts', 'nuts'], fastener: ['screws', 'bolts', 'nuts'], hinge: ['hinges'], lock: ['padlocks', 'locks'],
    sheet: ['sheets', 'plates'], angle: ['angles', 'shapes', 'sections'], channel: ['channels', 'sections'], rod: ['bars', 'rods'], tmt: ['bars', 'rods'], sariya: ['bars', 'rods'],
    gi: ['galvanised', 'zinc'], ms: ['iron', 'non-alloy steel'], ss: ['stainless steel'], steel: ['steel'], iron: ['iron'],
    cement: ['cement', 'portland'], brick: ['bricks'], tile: ['tiles'], tiles: ['tiles'], marble: ['marble'], granite: ['granite'], sand: ['sand'],
    paint: ['paints', 'varnishes'], putty: ['putty'], glass: ['glass'], plywood: ['plywood'], wood: ['wood'], door: ['doors'], window: ['windows'],
    chair: ['seats', 'swivel'], table: ['furniture'], sofa: ['seats'], bed: ['furniture', 'beds'], cupboard: ['other furniture', 'cupboards'], almirah: ['other furniture'], mattress: ['mattresses'],
    shirt: ['shirts'], tshirt: ['t-shirts'], 't-shirt': ['t-shirts'], jeans: ['trousers'], trouser: ['trousers'], saree: ['sarees', 'woven fabrics'], kurta: ['garments'],
    shoe: ['footwear'], shoes: ['footwear'], chappal: ['footwear'], bag: ['bags', 'handbags'], watch: ['wrist-watches', 'watches'], spectacles: ['spectacles'],
    rice: ['rice'], wheat: ['wheat'], atta: ['wheat flour'], maida: ['wheat flour'], dal: ['leguminous', 'pulses'], sugar: ['sugar'], tea: ['tea'], coffee: ['coffee'],
    oil: ['oils'], ghee: ['ghee'], milk: ['milk'], paneer: ['cheese', 'curd'], biscuit: ['biscuits'], namkeen: ['bhujia', 'namkeens'], chocolate: ['chocolate'],
    soap: ['soap'], shampoo: ['shampoos'], detergent: ['washing preparations', 'detergent'], medicine: ['medicaments'], tablet: ['medicaments'],
    car: ['motor cars', 'motor vehicles'], bike: ['motorcycles'], bicycle: ['bicycles'], scooter: ['motorcycles'], cycle: ['bicycles'], tyre: ['tyres'], tube: ['inner tubes'],
    'spare parts': ['parts and accessories'], part: ['parts'], parts: ['parts'], helmet: ['headgear', 'helmets'],
    book: ['printed books'], notebook: ['exercise book', 'note books'], pen: ['ball point pens', 'pens'], paper: ['paper'], carton: ['cartons', 'boxes'],
    plastic: ['plastics'], bottle: ['bottles'], bucket: ['buckets'], utensil: ['household articles'], cooker: ['cooking appliances', 'pressure cookers'],
    gas: ['gas'], stove: ['cooking appliances', 'stoves'], chimney: ['ventilating', 'hoods'], mixer: ['food grinders and mixers'], grinder: ['grinders'],
    gold: ['gold'], silver: ['silver'], jewellery: ['jewellery'], diamond: ['diamonds'],
  };
  // service words -> SAC search words
  const SERVICE = /\b(install|installation|fitting|labour|labor|service|services|repair|maintenance|amc|transport|freight|delivery|cartage|consult|consultancy|design|commissioning|erection|rent|rental|hire|courier|cleaning|security|catering|printing|advertis)/;
  const STOP = new Set(['out', 'input', 'output', 'way', 'inch', 'inches', 'mm', 'sq', 'sqmm', 'cm', 'ft', 'ah', 'hp', 'kw', 'kva', 'kwp', 'watt', 'watts', 'volt', 'amp', 'ltr', 'litre', 'liter', 'kg', 'gm', 'ml', 'charges', 'charge', 'cost', 'fee', 'fees', 'service', 'services', 'work', 'job', 'dc', 'the', 'and', 'for', 'with', 'of', 'in', 'to', 'a', 'an', 'new', 'set', 'pcs', 'pc', 'nos', 'no', 'kit', 'type', 'model', 'size', 'other', 'others', 'single', 'double', 'phase', 'hybrid', 'grid', 'on', 'off', 'ongrid', 'offgrid', 'mono', 'poly', 'perc', 'bifacial', 'dcr', 'non', 'total', 'item', 'items', 'product', 'material', 'box']);

  const PACK = /^(bag|bags|packet|pack|pouch|carton|box|tin|jar|drum|roll|bundle)$/;
  let DATA = null, IDX = null, loading = null;

  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ').trim();

  function buildIndex(data) {
    const mk = (rows, kind) => rows.map(([code, desc]) => {
      const d = desc.toLowerCase();
      const tail = d.split(/\s-+\s*|:|;/).filter((x) => x.trim()).pop() || d;
      return { code, desc, kind, d: ' ' + norm(d) + ' ', tail: ' ' + norm(tail) + ' ', other: /^\s*(-|:)*\s*other\s*$/.test(tail), parts: /(?:^|[-:;]\s*)(parts|accessories)\b/.test(d) };
    });
    return { hsn: mk(data.hsn, 'HSN'), sac: mk(data.sac, 'SAC') };
  }

  function load(url = 'data/hsn.json') {
    if (IDX) return Promise.resolve(IDX);
    if (!loading) loading = fetch(url).then((r) => { if (!r.ok) throw new Error('Could not load HSN directory'); return r.json(); }).then((d) => { DATA = d; IDX = buildIndex(d); return IDX; });
    return loading;
  }
  function useData(d) { DATA = d; IDX = buildIndex(d); }

  // turn a product name into groups of alternative search terms
  function queryGroups(name) {
    let n = ' ' + norm(name) + ' ';
    Object.entries(FIX).forEach(([bad, good]) => { n = n.replace(new RegExp(' ' + bad + ' ', 'g'), ' ' + good + ' '); });
    const groups = [], phrases = [];
    // multi-word products ("water tank", "net meter") are matched as one idea and treated as the product
    Object.keys(SYN).filter((k) => k.includes(' ')).forEach((k) => { if (n.includes(' ' + k + ' ')) { phrases.push([k, ...SYN[k]]); n = n.replace(' ' + k + ' ', ' '); } });
    n.trim().split(' ').forEach((t) => {
      if (!t || STOP.has(t) || /\d/.test(t) || t.length < 2) return;
      const base = t.replace(/(es|s)$/, '');
      const syn = SYN[t] || SYN[base];
      const g = syn ? [t, ...syn] : ['=' + t]; // '=' -> unknown word (often a brand): whole-word match only
      groups.push(g);
    });
    return groups.concat(phrases);
  }

  const has = (hay, term, exact) => {
    if (exact) return hay.includes(' ' + term + ' ') || hay.includes(' ' + term + 's ');
    if (term.includes(' ')) return hay.includes(' ' + term);
    if (term.length <= 3) return hay.includes(' ' + term + ' ') || hay.includes(' ' + term + 's ');
    const stem = term.length > 5 ? term.slice(0, term.length - 1) : term;
    return hay.includes(' ' + stem);
  };

  // how rare a term is across the directory (rare words say more about the product)
  const dfCache = new Map();
  function idf(term, exact) {
    const key = (exact ? '=' : '') + term;
    if (!dfCache.has(key)) { let n = 0; for (const r of IDX.hsn) if (has(r.d, term, exact)) n++; for (const r of IDX.sac) if (has(r.d, term, exact)) n++; dfCache.set(key, n); }
    const df = dfCache.get(key), N = IDX.hsn.length + IDX.sac.length;
    return df ? Math.log((N + 1) / df) : 0;
  }

  function weightGroups(groups) {
    // each alternative gets a rarity weight; words found nowhere (brand names, model numbers) drop out
    const wg = groups.map((g) => g.map((t, i) => {
      const exact = t[0] === '=';
      t = norm(exact ? t.slice(1) : t);
      return { t, exact, w: idf(t, exact) * (i === 0 ? 1 : 1.15) };
    }).filter((x) => x.w > 0)).filter((g) => g.length);
    if (wg.length) {
      // last meaningful word is usually the product itself (…pump, …pipe, …battery) — unless it's just the pack ("cement bag")
      let m = wg.length - 1;
      if (m > 0 && PACK.test(wg[m][0].t)) m--;
      wg[m].main = true;
    }
    return wg;
  }

  function scoreRow(row, wg) {
    let s = 0, hit = 0, mainHit = false, mainTail = false, tailHits = 0;
    for (const g of wg) {
      let best = 0;
      let inTail = false;
      for (const { t, w, exact } of g) {
        if (has(row.tail, t, exact)) { best = Math.max(best, (row.tail.startsWith(' ' + t.slice(0, 4)) ? 3.6 : 3) * w); inTail = true; if (g.main) mainTail = true; }
        else if (has(row.d, t, exact)) best = Math.max(best, 1.3 * w);
      }
      if (best) { s += best * (g.main ? 1.8 : 1); hit++; if (g.main) mainHit = true; if (inTail) tailHits++; }
    }
    if (!hit) return 0;
    if (!mainHit) s *= 0.45;                  // must be about the product, not just a material/adjective
    s *= 0.35 + 0.65 * (hit / wg.length);     // reward matching more of the name
    if (row.parts && !wg.some((g) => g.some((x) => /^(part|parts|accessor|spare)/.test(x.t))) && !(mainTail && tailHits >= 2 && tailHits === wg.length && !/^ of /.test(row.tail))) s *= 0.3; // products, not their parts (unless the part itself is named, e.g. bicycle chain)
    if (row.code.length === 8) s += 0.3;
    if (row.other) s -= 1.2;
    s -= row.d.length / 900;                  // prefer precise, shorter descriptions
    return s;
  }

  /** search(name) -> [{code, desc, kind, score}] best first */
  function search(name, { limit = 8 } = {}) {
    if (!IDX) return [];
    const wg = weightGroups(queryGroups(name));
    if (!wg.length) return [];
    const isService = SERVICE.test(' ' + norm(name) + ' ');
    const pool = isService ? IDX.sac.concat(IDX.hsn) : IDX.hsn.concat(IDX.sac);
    const scored = [];
    for (const row of pool) {
      let sc = scoreRow(row, wg);
      if (sc > 0) { if (row.kind === 'SAC') sc += isService ? 4 : -4; scored.push({ code: row.code, desc: row.desc, kind: row.kind, score: sc }); }
    }
    scored.sort((a, b) => b.score - a.score || a.code.length - b.code.length || a.code.localeCompare(b.code));
    return scored.slice(0, limit);
  }

  /** short, readable description for display */
  function shortDesc(desc) {
    const parts = desc.split(/\s+-+\s+|:\s*/).map((p) => p.trim()).filter(Boolean);
    const last = parts[parts.length - 1] || desc;
    const head = parts[0] || '';
    const t = /^other$/i.test(last) && parts.length > 1 ? parts[parts.length - 2] + ' — other' : last;
    const pretty = (x) => x.toLowerCase().replace(/(^|[\s(])([a-z])/g, (m, a, b) => a + b.toUpperCase());
    const s = pretty(t);
    return (s.length < 28 && head && head !== last ? pretty(head.split(/[;,]/)[0]) + ': ' : '') + s;
  }

  const api = { load, useData, search, shortDesc, queryGroups, get ready() { return !!IDX; } };
  root.HSN = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

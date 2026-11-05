"""Build data/hsn.json for the KPE billing app from hsn-code-package (CBIC/WCO HSN list)."""
import json, re, sys
src, dst = sys.argv[1], sys.argv[2]
h = json.load(open(f'{src}/hsn_codes.json')); s = json.load(open(f'{src}/sac_codes.json'))
clean = lambda t: re.sub(r'\s+', ' ', t).strip()

rows = {}
for x in h:
    c = x['code'].strip()
    if len(c) == 7: c = '0' + c          # restore leading zero (chapters 01-09)
    rows[c] = clean(x['description'])

# HS-2022: heading 8541 split (solar cells / modules / LEDs)
for old in ['85414011', '85414019', '85414020', '85414090']: rows.pop(old, None)
P8541 = 'DIODES, TRANSISTORS AND SIMILAR SEMI-CONDUCTOR DEVICES; PHOTOSENSITIVE SEMI-CONDUCTOR DEVICES, INCLUDING PHOTOVOLTAIC CELLS - '
extra = {
    '85414100': P8541 + 'LIGHT-EMITTING DIODES (LED)',
    '85414200': P8541 + 'PHOTOVOLTAIC CELLS NOT ASSEMBLED IN MODULES OR MADE UP INTO PANELS (SOLAR CELLS)',
    '85414300': P8541 + 'PHOTOVOLTAIC CELLS ASSEMBLED IN MODULES OR MADE UP INTO PANELS (SOLAR PANELS / SOLAR PV MODULES)',
    '85414900': P8541 + 'OTHER PHOTOSENSITIVE SEMI-CONDUCTOR DEVICES',
    '85395000': 'LIGHT-EMITTING DIODE (LED) LIGHT SOURCES - LED LAMPS (LED BULBS, LED TUBES)',
    '85171300': 'TELEPHONE SETS, INCLUDING TELEPHONES FOR CELLULAR NETWORKS - SMARTPHONES (MOBILE PHONES)',
    '85171400': 'TELEPHONE SETS, INCLUDING TELEPHONES FOR CELLULAR NETWORKS - OTHER TELEPHONES FOR CELLULAR OR WIRELESS NETWORKS (MOBILE PHONES)',
    '85258900': 'TELEVISION CAMERAS, DIGITAL CAMERAS AND VIDEO CAMERA RECORDERS - OTHER (CCTV CAMERAS)',
    '90283010': 'GAS, LIQUID OR ELECTRICITY SUPPLY OR PRODUCTION METERS - ELECTRICITY METERS: FOR ALTERNATING CURRENT (ENERGY METER, NET METER)',
}

# give terse lines (e.g. "LITHIUM-ION") the words shared by every line of their 4-digit heading
by_head = {}
for c, d in rows.items(): by_head.setdefault(c[:4], []).append(d)
def common_prefix(descs):
    ws = [d.split(' ') for d in descs if len(d) > 30]
    if len(ws) < 2: return ''
    out = []
    for parts in zip(*ws):
        if all(p == parts[0] for p in parts): out.append(parts[0])
        else: break
    return ' '.join(out).rstrip(' ,;-:')
heads = {k: common_prefix(v) for k, v in by_head.items()}
n = 0
for c, d in list(rows.items()):
    hd = heads.get(c[:4], '')
    if len(hd) > 15 and not d.upper().startswith(hd[:15].upper()):
        rows[c] = hd + ' - ' + d; n += 1
rows.update(extra)

data = {
    'v': '2026-11',
    'source': 'CBIC/WCO HSN directory via hsn-code-package 3.0.0, with HS-2022 updates; SAC list',
    'hsn': [[c, d] for c, d in sorted(rows.items())],
    'sac': [[x['code'], clean(x['description'])] for x in s],
}
json.dump(data, open(dst, 'w'), separators=(',', ':'), ensure_ascii=False)
print('hsn', len(data['hsn']), 'sac', len(data['sac']), 'enriched', n)
for c in ['85076000', '85072000', '87120010', '39172390', '39251000']:
    print(c, rows.get(c, '?')[:150])

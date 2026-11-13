/* Care home operations demo. Made-up data only. Everything saves on this device (localStorage). */
(function (root) {
'use strict';

const STORE_KEY = 'carehome-demo-v1';
const DAY = 864e5, HOUR = 36e5;

/* ---------------- helpers ---------------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '£' + Math.round(n).toLocaleString('en-GB');
const money2 = n => '£' + Number(n).toFixed(2);
const pad = n => String(n).padStart(2, '0');
const hhmm = ts => { const d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const dayKey = ts => { const d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const startOfDay = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const niceDate = ts => { const d = new Date(ts); return WD[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()]; };
const whenText = ts => {
  const today = startOfDay(Date.now());
  if (ts >= today) return 'Today ' + hhmm(ts);
  if (ts >= today - DAY) return 'Yesterday ' + hhmm(ts);
  return niceDate(ts) + ' ' + hhmm(ts);
};
const dueText = iso => {
  const t = new Date(iso + 'T12:00:00').getTime();
  return niceDate(t);
};
const uid = () => Math.random().toString(36).slice(2, 9);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(arr, rnd) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const isoIn = days => dayKey(Date.now() + days * DAY);

/* ---------------- seed data (all made up) ---------------- */
const FIRST = ['Margaret', 'Joan', 'Dorothy', 'Eileen', 'Betty', 'Gwen', 'Mair', 'Glenys', 'Iris', 'Sheila', 'Brenda', 'Megan', 'Olwen', 'Valerie', 'Pat', 'Jean', 'Nesta', 'Rita', 'Mavis', 'Doreen', 'Audrey', 'Beryl', 'Edna', 'Sylvia',
  'Gareth', 'Dai', 'Emrys', 'Ivor', 'Ken', 'Bryn', 'Alan', 'Gwilym', 'Ron', 'Trevor', 'Dennis', 'Hywel', 'Bill', 'Clive', 'Derek', 'Glyn', 'Huw', 'Stan'];
const LAST = ['Jones', 'Davies', 'Evans', 'Thomas', 'Williams', 'Roberts', 'Hughes', 'Lewis', 'Morgan', 'Griffiths', 'Price', 'Powell', 'Rees', 'Owen', 'Pritchard', 'Bevan', 'Jenkins', 'Howells', 'Watkins', 'Parry', 'Phillips', 'Probert', 'Lloyd', 'Harris'];
const TEXTURES = ['Regular', 'Regular', 'Regular', 'Soft & bite-sized (L6)', 'Soft & bite-sized (L6)', 'Minced & moist (L5)', 'Puréed (L4)'];
const ALLERGY = ['Penicillin', 'Nuts', 'Shellfish', 'Lactose', 'Gluten'];
const MEDS = ['Paracetamol 1g', 'Donepezil 10mg', 'Amlodipine 5mg', 'Metformin 500mg', 'Sertraline 50mg', 'Lansoprazole 30mg', 'Memantine 10mg', 'Furosemide 40mg', 'Senna 15mg', 'Calcichew D3'];
const ROUNDS = [{ id: 'am', name: 'Morning', at: '08:00', h: 8 }, { id: 'lunch', name: 'Lunch', at: '12:00', h: 12 }, { id: 'tea', name: 'Teatime', at: '17:00', h: 17 }, { id: 'night', name: 'Night', at: '21:00', h: 21 }];

const HOME_CFG = {
  stannes: {
    seed: 11, name: "St Anne's", town: 'Chepstow', reg: 'CIW', rating: 'Requires Improvement', beds: 45, residents: 41,
    units: [{ id: 'cedars', name: 'Cedars', type: 'Residential dementia', n: 22, nursing: false }, { id: 'orchards', name: 'Orchards', type: 'Nursing dementia', n: 19, nursing: true }],
    planBehind: 7, familyIn: 9, weightLoss: 2, nurseAgency: 3, nurseOpen: 1, council: 'Monmouthshire Council',
    fig: { agencyPct: 21, agencyTrend: [25, 25, 24, 23, 23, 22, 21, 21], agencyTarget: 12, foodPRD: 6.32, foodTarget: 5.70, wastePct: 9, wasteTarget: 5, fluidMetPct: 96, weeklyFee: 947, overtimeHrs: 38, contracts: 'Waste collection, insurance', dietChanges: 4 },
    aims: [{ key: 'plans', label: 'Care plans accurate and current' }, { key: 'checks', label: 'Checks done before new staff start', done: 5, total: 5 }, { key: 'family', label: 'Families involved in reviews' }],
    fees: [{ amt: 4900, days: 42, payer: 'council' }, { amt: 4900, days: 42, payer: 'council' }, { amt: 4400, days: 20, payer: 'private' }],
    invoices: [['Meat supplier', 1120, 'Up 8% on 3 lines against the agreed price list (£64 this week)'], ['Fresh fruit and veg', 640], ['Dry goods', 980], ['Laundry service', 410], ['Pharmacy, non-prescription', 360], ['Maintenance contractor', 700]]
  },
  caerleon: {
    seed: 22, name: 'Caerleon House', town: 'Newport', reg: 'CIW', rating: 'Good', beds: 38, residents: 34,
    units: [{ id: 'ground', name: 'Ground floor', type: 'Residential', n: 18, nursing: false }, { id: 'first', name: 'First floor', type: 'Nursing', n: 16, nursing: true }],
    planBehind: 4, familyIn: 20, weightLoss: 1, nurseAgency: 2, nurseOpen: 0, council: 'Newport City Council',
    fig: { agencyPct: 15, agencyTrend: [19, 18, 18, 17, 16, 16, 15, 15], agencyTarget: 12, foodPRD: 5.85, foodTarget: 5.70, wastePct: 6, wasteTarget: 5, fluidMetPct: 94, weeklyFee: 905, overtimeHrs: 22, contracts: 'Lift servicing', dietChanges: 2 },
    aims: [{ key: 'plans', label: 'Care plans accurate and current' }, { key: 'family', label: 'Families involved in reviews' }],
    fees: [{ amt: 3700, days: 30, payer: 'council' }, { amt: 2400, days: 16, payer: 'private' }],
    invoices: [['Fresh fruit and veg', 520], ['Dry goods', 760], ['Laundry service', 330]]
  },
  parkside: {
    seed: 33, name: 'Parkside House', town: 'Penarth', reg: 'CIW', rating: 'Good', beds: 30, residents: 28,
    units: [{ id: 'main', name: 'Main house', type: 'Residential dementia', n: 28, nursing: false }],
    planBehind: 2, familyIn: 19, weightLoss: 0, nurseAgency: 0, nurseOpen: 0, council: 'Vale of Glamorgan Council', noNurses: true,
    fig: { agencyPct: 8, agencyTrend: [11, 10, 10, 9, 9, 9, 8, 8], agencyTarget: 12, foodPRD: 5.60, foodTarget: 5.70, wastePct: 5, wasteTarget: 5, fluidMetPct: 97, weeklyFee: 880, overtimeHrs: 14, contracts: 'None in 60 days', dietChanges: 1 },
    aims: [{ key: 'plans', label: 'Care plans accurate and current' }, { key: 'family', label: 'Families involved in reviews' }],
    fees: [{ amt: 1900, days: 14, payer: 'private' }],
    invoices: [['Dry goods', 610], ['Fresh fruit and veg', 450]]
  },
  overseal: {
    seed: 44, name: 'Overseal', town: 'Derbyshire', reg: 'CQC', rating: 'Requires Improvement', beds: 40, residents: 36,
    units: [{ id: 'east', name: 'East wing', type: 'Residential', n: 20, nursing: false }, { id: 'west', name: 'West wing', type: 'Nursing', n: 16, nursing: true }],
    planBehind: 6, familyIn: 15, weightLoss: 1, nurseAgency: 4, nurseOpen: 1, council: 'Derbyshire County Council',
    fig: { agencyPct: 18, agencyTrend: [22, 22, 21, 20, 20, 19, 18, 18], agencyTarget: 12, foodPRD: 6.05, foodTarget: 5.70, wastePct: 8, wasteTarget: 5, fluidMetPct: 93, weeklyFee: 1010, overtimeHrs: 31, contracts: 'Insurance', dietChanges: 3 },
    aims: [{ key: 'plans', label: 'Care plans accurate and current' }, { key: 'meds', label: 'Medicines records complete', done: 31, total: 36 }, { key: 'family', label: 'Families involved in reviews' }],
    fees: [{ amt: 5200, days: 35, payer: 'council' }, { amt: 3300, days: 21, payer: 'private' }],
    invoices: [['Meat supplier', 890, 'Up 5% on 2 lines against the agreed price list (£31 this week)'], ['Dry goods', 840], ['Agency staff', 2350]]
  }
};

function seedHome(id) {
  const c = HOME_CFG[id], rnd = mulberry32(c.seed), now = Date.now();
  const firsts = shuffle(FIRST, rnd), lasts = shuffle(LAST, rnd);
  const h = {
    id, name: c.name, town: c.town, reg: c.reg, rating: c.rating, beds: c.beds, units: c.units.map(u => ({ id: u.id, name: u.name, type: u.type, nursing: u.nursing })),
    noNurses: !!c.noNurses, fig: JSON.parse(JSON.stringify(c.fig)), aims: JSON.parse(JSON.stringify(c.aims)),
    residents: [], actions: [], incidents: [], shifts: [], fees: [], invoices: [], enquiries: [], waste: [], temps: [], stock: [], mar: {}, notesLog: []
  };
  let room = 1;
  c.units.forEach(u => {
    for (let k = 0; k < u.n; k++) {
      const i = h.residents.length;
      const r = {
        id: 'r' + i + uid(), first: firsts[i % firsts.length], last: lasts[(i * 7) % lasts.length], room: room++, unit: u.id,
        texture: TEXTURES[Math.floor(rnd() * TEXTURES.length)], diabetic: rnd() < 0.18, allergies: rnd() < 0.15 ? ALLERGY[Math.floor(rnd() * ALLERGY.length)] : '',
        assist: rnd() < (u.nursing ? 0.55 : 0.2), fluidTarget: rnd() < 0.25 ? 1200 : 1500, needsTurns: u.nursing && rnd() < 0.5,
        planCurrent: true, familyInvolved: false, weights: [], meds: [], notes: [], fluids: [], turns: [], admitted: now - Math.floor(rnd() * 900) * DAY
      };
      if (rnd() < 0.08) room++;
      const base = 48 + Math.round(rnd() * 300) / 10;
      for (let w = 4; w >= 1; w--) r.weights.push({ ts: now - w * 7 * DAY, kg: Math.round((base + (rnd() - 0.5) * 0.6) * 10) / 10 });
      const meds = shuffle(MEDS, rnd).slice(0, 2 + Math.floor(rnd() * 2));
      r.meds = meds.map((m, j) => ({ name: m, rounds: j === 0 ? ['am', 'tea'] : (j === 1 ? ['am'] : ['night']) }));
      if (r.diabetic && !r.meds.some(m => m.name.startsWith('Metformin'))) r.meds.push({ name: 'Metformin 500mg', rounds: ['am', 'tea'] });
      h.residents.push(r);
    }
  });
  // flags with exact counts
  const idx = shuffle(h.residents.map((_, i) => i), rnd);
  idx.slice(0, c.planBehind).forEach(i => { h.residents[i].planCurrent = false; });
  shuffle(h.residents.map((_, i) => i), rnd).slice(0, c.familyIn).forEach(i => { h.residents[i].familyInvolved = true; });
  shuffle(h.residents.map((_, i) => i), rnd).slice(0, c.weightLoss).forEach(i => {
    const r = h.residents[i], start = r.weights[0].kg;
    const end = Math.round(start * 0.937 * 10) / 10;
    r.weights = r.weights.map((w, j) => ({ ts: w.ts, kg: Math.round((start - (start - end) * j / 3) * 10) / 10 }));
  });
  // today's fluids and turns so the carer screen looks like a real shift
  const t7 = startOfDay(now) + 7 * HOUR;
  const hrs = Math.max(0, Math.min(14, (now - t7) / HOUR));
  h.residents.forEach(r => {
    let goal = r.fluidTarget * (hrs / 14) * (0.6 + 0.5 * rnd()), t = t7 + 0.5 * HOUR;
    while (goal > 120 && t < now) {
      const ml = [150, 200, 200, 250][Math.floor(rnd() * 4)];
      r.fluids.push({ ts: t, ml, by: 'Carer' }); goal -= ml; t += (0.8 + rnd() * 1.6) * HOUR;
    }
    if (r.needsTurns) r.turns.push({ ts: now - (0.3 + rnd() * 2.6) * HOUR, by: 'Carer' });
  });
  // a few notes from earlier
  const noteSeeds = ['Ate most of breakfast, porridge and a cup of tea. Bright and chatty this morning.', 'Slept well. Washed and dressed with help of one. Settled in the lounge.', 'Bit unsettled after lunch, walked with staff in the garden which helped.', 'Family visited this afternoon. Enjoyed the singing session.'];
  h.residents.slice(0, 6).forEach((r, i) => {
    const ts = Math.max(startOfDay(now) + 7.5 * HOUR, now - (1 + i) * HOUR);
    if (ts < now) r.notes.push({ id: uid(), ts, by: 'Carer', text: noteSeeds[i % noteSeeds.length], heard: '' });
  });
  // incidents in the last week (all reviewed in 48h)
  const incTypes = [['Fall', 'Found sitting on bedroom floor, no injury. Checked by nurse.'], ['Fall', 'Slid from chair in lounge, no injury.'], ['Fall', 'Fell walking to bathroom at night, no injury, sensor mat now in place.'], ['Skin', 'Small red area on left heel, cream applied, turns increased.'], ['Behaviour', 'Distressed in the evening, settled with one-to-one time.'], ['Medicine', 'Evening tablet refused, offered again at 21:00 and taken.']];
  const nInc = id === 'stannes' ? 6 : 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < nInc; i++) {
    const r = h.residents[Math.floor(rnd() * h.residents.length)], ty = incTypes[i % incTypes.length];
    const ts = now - (1 + rnd() * 5.5) * DAY;
    h.incidents.push({ id: uid(), ts, resId: r.id, type: ty[0], injury: false, text: ty[1], by: 'Carer', reviewed: true, reviewedTs: ts + (4 + rnd() * 30) * HOUR });
  }
  // actions
  const A = (title, detail, owner, days, tag) => h.actions.push({ id: uid(), title, detail, owner, due: isoIn(days), tag: tag || '', done: false, created: now - 10 * DAY });
  if (id === 'stannes') {
    A('CIW action: families in care plan reviews', 'Invite each family to the next review and record their views.', 'Manager', 17, 'CIW');
    A('CIW action: care plans current', 'Bring the overdue care plan reviews up to date.', 'Nurse in charge', 10, 'CIW');
    A('Fire door closer on Cedars corridor sticking', 'Contractor booked, not attended yet.', 'Maintenance', -8);
    A('Supervision for 3 night carers', 'Overdue since last month.', 'Manager', -3);
    A('Chase council for 2 residents\u2019 fees', '6 weeks overdue. Call the commissioning team.', 'Admin', 2);
    A('Query meat price rise with supplier', 'Up 8% on 3 lines against the agreed list.', 'Admin', 3);
    A('GP referrals for weight loss', 'Two residents down 5% or more this month.', 'Nurse in charge', 1);
    A('Renew waste collection contract', 'Ends in 6 weeks. Get two quotes.', 'Admin', 40);
    A('Update fire risk assessment', 'Annual review.', 'Manager', 25);
  } else {
    A((c.reg === 'CQC' ? 'CQC action' : 'CIW action') + ': care plans current', 'Bring the overdue care plan reviews up to date.', 'Nurse in charge', 14, c.reg);
    A('Supervision schedule for this quarter', 'Book in all care staff.', 'Manager', id === 'overseal' ? -2 : 9);
    A('Chase overdue fees', 'Call the payer about the oldest invoice.', 'Admin', 3);
    if (id !== 'parkside') A('Quarterly medicines audit', 'Pharmacist visit to book.', 'Manager', 12);
    if (id === 'overseal') A('Agency spend review', 'Agency is the biggest overspend line.', 'Owner', 5);
  }
  // nurse shifts for the next 7 days
  const nurses = ['Sian', 'Tomasz', 'Priya', 'Rhian'], carers = ['Kelly', 'Mo', 'Bethan', 'Liam', 'Ana', 'Grace'];
  const day0 = startOfDay(now);
  if (!c.noNurses) {
    let agencyLeft = c.nurseAgency, openLeft = c.nurseOpen;
    const order = shuffle([...Array(14).keys()], rnd);
    const coverOf = {};
    order.forEach(k => { if (k === 5 && openLeft) { coverOf[k] = 'open'; openLeft--; } });
    order.forEach(k => { if (!coverOf[k] && openLeft > 0) { coverOf[k] = 'open'; openLeft--; } else if (!coverOf[k] && agencyLeft > 0 && k !== 5) { coverOf[k] = 'agency'; agencyLeft--; } });
    for (let k = 0; k < 14; k++) {
      const d = Math.floor(k / 2), night = k % 2 === 1, cover = coverOf[k] || 'own';
      h.shifts.push({ id: uid(), date: dayKey(day0 + d * DAY), role: 'Nurse', time: night ? 'Night 20:00\u201308:00' : 'Day 08:00\u201320:00', who: cover === 'own' ? nurses[k % 4] : (cover === 'agency' ? 'Agency nurse' : ''), cover, texted: null });
    }
  }
  const carerGaps = id === 'stannes' ? 2 : 1;
  for (let k = 0; k < carerGaps; k++) h.shifts.push({ id: uid(), date: dayKey(day0 + (1 + k * 3) * DAY), role: 'Carer', time: k ? 'Late 14:00\u201322:00' : 'Early 07:00\u201315:00', who: '', cover: 'open', texted: null, unit: c.units[k % c.units.length].name });
  h.carers = carers;
  // fees
  c.fees.forEach((f, i) => {
    const r = h.residents[(i * 5 + 3) % h.residents.length];
    h.fees.push({ id: uid(), resId: r.id, payer: f.payer === 'council' ? c.council : 'Family (private fees)', amt: f.amt, since: now - f.days * DAY, paid: false });
  });
  // invoices waiting
  c.invoices.forEach(([sup, amt, rise]) => h.invoices.push({ id: uid(), supplier: sup, amt, rise: rise || '', status: 'waiting', ts: now - Math.floor(rnd() * 4) * DAY }));
  // enquiries
  if (id === 'stannes') {
    h.enquiries.push({ id: uid(), ts: now - 3 * DAY, from: 'Family', name: 'Daughter of a man in Abergavenny', need: 'Residential dementia, from next month', status: 'Answered same day' });
    h.enquiries.push({ id: uid(), ts: now - 2 * DAY, from: 'Social worker', name: 'Monmouthshire adult services', need: 'Nursing dementia bed', status: 'Assessment booked' });
    h.enquiries.push({ id: uid(), ts: now - 4 * HOUR, from: 'Hospital', name: 'Discharge team, Royal Gwent', need: 'Nursing bed, discharge this week', status: 'Waiting for a decision' });
  } else {
    h.enquiries.push({ id: uid(), ts: now - 2 * DAY, from: 'Family', name: 'Son enquiring for his mother', need: 'Residential, respite first', status: 'Answered same day' });
  }
  // kitchen waste this week
  const wItems = [['Fish pie', 'portions', 9, 'Left on plates'], ['Mashed potato', 'kg', 2.5, 'Cooked too much'], ['Sandwiches', 'portions', 6, 'Left on plates'], ['Rice pudding', 'portions', 4, 'Left on plates'], ['Bread', 'loaves', 2, 'Out of date']];
  wItems.forEach((w, i) => h.waste.push({ id: uid(), ts: now - (1 + i) * DAY + 2 * HOUR, item: w[0], unit: w[1], qty: w[2], reason: w[3] }));
  // temps: morning checks done today
  const t9 = startOfDay(now) + 8.5 * HOUR;
  if (now > t9) [['Kitchen fridge 1', 3.8], ['Kitchen fridge 2', 4.1], ['Freezer', -19.5]].forEach(([n, v]) => h.temps.push({ id: uid(), ts: t9, unit: n, temp: v, by: 'Cook' }));
  // stock
  [['Milk', 'litres', 18, 30], ['Bread', 'loaves', 6, 12], ['Thickener', 'tins', 3, 6], ['Fortified shakes', 'bottles', 12, 24], ['Eggs', 'trays', 2, 4], ['Potatoes', 'kg', 25, 20], ['Tea bags', 'boxes', 8, 6], ['Butter', 'kg', 3, 4]]
    .forEach(([n, u, q, par]) => h.stock.push({ id: uid(), name: n, unit: u, qty: q, par, order: q < par }));
  h.orderSent = null;
  return h;
}

function seedAll() {
  const homes = {};
  Object.keys(HOME_CFG).forEach(id => { homes[id] = seedHome(id); });
  return { v: 1, created: Date.now(), role: 'owner', homeId: 'stannes', lastHome: 'stannes', welcomed: false, unit: {}, homes };
}

/* ---------------- storage ---------------- */
let S = null;
function load() { try { const raw = localStorage.getItem(STORE_KEY); if (!raw) return null; const s = JSON.parse(raw); return s && s.v === 1 ? s : null; } catch (e) { return null; } }
let saveOk = true;
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); saveOk = true; } catch (e) { saveOk = false; } }

/* ---------------- derived figures ---------------- */
const H = () => S.homes[S.homeId === 'all' ? S.lastHome : S.homeId];
const resName = r => r ? r.first + ' ' + r.last : 'Unknown';
const resById = (h, id) => h.residents.find(r => r.id === id);
const unitName = (h, id) => (h.units.find(u => u.id === id) || {}).name || '';
const fluidToday = r => { const d0 = startOfDay(Date.now()); return r.fluids.filter(f => f.ts >= d0).reduce((a, f) => a + f.ml, 0); };
const lastTurn = r => r.turns.length ? r.turns[r.turns.length - 1].ts : 0;
function weightLoss(r) {
  if (r.weights.length < 2) return 0;
  const first = r.weights[Math.max(0, r.weights.length - 4)].kg, last = r.weights[r.weights.length - 1].kg;
  return first > 0 ? (first - last) / first * 100 : 0;
}
const losers = h => h.residents.filter(r => weightLoss(r) >= 5);
const today = () => dayKey(Date.now());
function stats(h) {
  const n = h.residents.length, now = Date.now(), wk = now - 7 * DAY;
  const nurseSh = h.shifts.filter(s => s.role === 'Nurse');
  const nurseOwn = nurseSh.filter(s => s.cover === 'own').length;
  const nurseAg = nurseSh.filter(s => s.cover === 'agency').length;
  const nurseOpen = nurseSh.filter(s => s.cover === 'open').length;
  const openActs = h.actions.filter(a => !a.done);
  const late = openActs.filter(a => a.due < today());
  const feesOpen = h.fees.filter(f => !f.paid);
  const fees = feesOpen.reduce((a, f) => a + f.amt, 0);
  const oldest = feesOpen.reduce((a, f) => Math.max(a, now - f.since), 0);
  const inc7 = h.incidents.filter(i => i.ts >= wk);
  const falls = inc7.filter(i => i.type === 'Fall');
  const reviewed48 = inc7.filter(i => i.reviewed && i.reviewedTs - i.ts <= 48 * HOUR).length;
  const plans = h.residents.filter(r => r.planCurrent).length;
  const family = h.residents.filter(r => r.familyInvolved).length;
  const wait = h.invoices.filter(i => i.status === 'waiting');
  const foodWeek = h.fig.foodPRD * n * 7, foodBudget = h.fig.foodTarget * n * 7;
  const wasteWeek = h.waste.filter(w => w.ts >= wk);
  const wasteBy = {};
  wasteWeek.forEach(w => { if (w.unit === 'portions') wasteBy[w.item] = (wasteBy[w.item] || 0) + w.qty; });
  const most = Object.entries(wasteBy).sort((a, b) => b[1] - a[1])[0];
  const d0 = startOfDay(now);
  const temps = h.temps.filter(t => t.ts >= d0);
  const badTemps = temps.filter(t => tempBad(t));
  const amDone = temps.filter(t => new Date(t.ts).getHours() < 13).length >= 3;
  const pmDone = temps.filter(t => new Date(t.ts).getHours() >= 13).length >= 3;
  const pmNeeded = new Date(now).getHours() >= 15;
  return { n, nurseOwn, nurseAg, nurseOpen, nurseTotal: nurseSh.length, openActs, late, fees, feesOpen, oldest, falls, inc7, reviewed48, plans, family, wait,
    waitAmt: wait.reduce((a, i) => a + i.amt, 0), foodWeek, foodBudget, most: most ? most[0] : '\u2014', temps, badTemps, amDone, pmDone, pmNeeded,
    empty: h.beds - n, lostFees: Math.max(0, h.beds - n) * h.fig.weeklyFee, loss: losers(h) };
}
function tempBad(t) { const isFreezer = /freez/i.test(t.unit); return isFreezer ? t.temp > -18 : (t.temp > 5 || t.temp < 0); }

/* ---------------- voice parsing (pure, testable) ---------------- */
const SMALL = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, a: 1, half: 0.5 };
function wordsToDigits(text) {
  // "two hundred and fifty" -> 250, "fifty two point four" -> 52.4, "minus nineteen" -> -19
  const toks = text.split(/(\s+)/);
  const out = []; let buf = null, cur = 0, total = 0, dec = null, used = [];
  const flush = () => {
    if (buf !== null) {
      let v = total + cur; if (dec !== null) v = Number(String(v) + '.' + dec);
      out.push(String(v)); buf = null; cur = 0; total = 0; dec = null; used = [];
    }
  };
  for (let i = 0; i < toks.length; i++) {
    const raw = toks[i], w = raw.toLowerCase().replace(/[.,!?]$/, '');
    if (/^\s+$/.test(raw)) { if (buf === null) out.push(raw); else used.push(raw); continue; }
    const isNumWord = Object.prototype.hasOwnProperty.call(SMALL, w) && w !== 'a' && w !== 'half';
    if (isNumWord && dec === null) { if (buf === null) { buf = ''; } cur += SMALL[w]; continue; }
    if (buf !== null && w === 'hundred') { cur = (cur || 1) * 100; continue; }
    if (buf !== null && w === 'thousand') { total += (cur || 1) * 1000; cur = 0; continue; }
    if (buf !== null && w === 'and' && /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)$/i.test((toks[i + 2] || '').replace(/[.,]$/, ''))) continue;
    if (buf !== null && w === 'point' && toks[i + 2]) {
      const nx = toks[i + 2].toLowerCase().replace(/[.,]$/, '');
      if (/^\d$/.test(nx)) { dec = nx; i += 2; continue; }
      if (Object.prototype.hasOwnProperty.call(SMALL, nx) && SMALL[nx] < 10) { dec = String(SMALL[nx]); i += 2; continue; }
    }
    if (buf !== null) { const gap = used.length ? ' ' : ''; flush(); out.push(gap); }
    out.push(raw);
  }
  flush();
  return out.join('').replace(/\s{2,}/g, ' ');
}
function normalise(text) {
  let t = ' ' + String(text || '') + ' ';
  t = t.replace(/(\d),(\d{3})/g, '$1$2');
  t = wordsToDigits(t);
  t = t.replace(/\bminus\s+(\d)/gi, '-$1').replace(/(\d)\s*°\s*c?\b/gi, '$1 degrees').replace(/(\d)\s*°/g, '$1 degrees');
  t = t.replace(/(\d)\s*(millilitres?|milliliters?|mls?|mils?|mL)\b/gi, '$1 ml');
  t = t.replace(/(\d)\s*(kilograms?|kilos?|kgs?)\b/gi, '$1 kg');
  return t.replace(/\s+/g, ' ').trim();
}
function findResident(text, residents) {
  const t = ' ' + text.toLowerCase().replace(/[^a-z\u00c0-\u024f' ]/g, ' ') + ' ';
  const full = residents.filter(r => t.includes(' ' + (r.first + ' ' + r.last).toLowerCase() + ' '));
  if (full.length === 1) return full[0];
  const firsts = residents.filter(r => t.includes(' ' + r.first.toLowerCase() + ' ') || t.includes(' ' + r.first.toLowerCase() + "'s "));
  if (firsts.length === 1) return firsts[0];
  const m = t.match(/ (?:mrs|mr|miss|ms) ([a-z']+) /);
  if (m) { const s = residents.filter(r => r.last.toLowerCase() === m[1]); if (s.length === 1) return s[0]; }
  const roomM = (' ' + text.toLowerCase() + ' ').match(/\broom (\d+)\b/);
  if (roomM) { const s = residents.filter(r => String(r.room) === roomM[1]); if (s.length === 1) return s[0]; }
  return null;
}
const DRINK_WORDS = /\b(drank|drink|drinks|drinking|fluids?|tea|coffee|water|juice|squash|milk|cup|mug|glass|beaker)\b/i;
function parseSpeech(text, residents) {
  const t = normalise(text), low = t.toLowerCase();
  const res = findResident(t, residents || []);
  const p = { text: t, resId: res ? res.id : '', type: 'note' };
  const num = re => { const m = low.match(re); return m ? parseFloat(m[1]) : null; };
  if (/\b(fridge|freezer|chiller|cold room)\b/.test(low) && /(-?\d+(\.\d+)?)/.test(low)) {
    p.type = 'temp';
    p.appliance = /freezer/.test(low) ? 'Freezer' : (/fridge\s*(2|two)\b/.test(low) ? 'Kitchen fridge 2' : 'Kitchen fridge 1');
    const m = low.replace(/fridge\s*(1|2|one|two)\b/, 'fridge').match(/(-?\d+(\.\d+)?)/);
    p.temp = m ? parseFloat(m[1]) : null;
    p.resId = '';
    return p;
  }
  if (/\b(waste|wasted|binned|thrown away|threw away|chucked|left over|leftover)\b/.test(low) && !res) {
    p.type = 'waste';
    const m = low.match(/(\d+(\.\d+)?)\s*(portions?|kg|loaves|trays|plates|servings)?/);
    p.qty = m ? parseFloat(m[1]) : 1;
    const u = m && m[3] ? m[3] : 'portions';
    p.unit = /kg/.test(u) ? 'kg' : (/loav/.test(u) ? 'loaves' : 'portions');
    const it = low.match(/\bof (?:the )?([a-z][a-z \-]{1,30}?)(?:\s+(?:because|as|from|today|at|left|it|they|were|was)\b|[.,]|$)/);
    p.item = it ? it[1].trim().replace(/^\w/, c => c.toUpperCase()) : '';
    p.reason = /plate|left|didn.?t eat|not eaten/.test(low) ? 'Left on plates' : (/date|expired|out of date/.test(low) ? 'Out of date' : (/too much|over ?cook|made too/.test(low) ? 'Cooked too much' : 'Other'));
    return p;
  }
  if (/\b(fell|fall|fallen|on the floor|slipped|slid)\b/.test(low)) {
    p.type = 'fall';
    p.injury = /\b(cut|bleed|bruis|injur|hurt|pain|swell|swollen|bump|graz|skin tear|head)/.test(low) && !/\bno (injur|harm|pain|obvious injur)/.test(low);
    return p;
  }
  if (/\b(weigh|weighs|weighed|weight)\b/.test(low) && /\d/.test(low)) {
    p.type = 'weight';
    p.kg = num(/(\d+(\.\d+)?)\s*kg/) || num(/(\d{2,3}(\.\d+)?)/);
    return p;
  }
  const ml = num(/(\d+)\s*ml\b/);
  if (ml || DRINK_WORDS.test(low)) {
    let amount = ml;
    if (!amount) {
      const cups = num(/(\d+)\s*(cups?|mugs?|glasses|beakers?)/);
      if (cups) amount = cups * 200;
      else if (/\b(half a|half) (cup|mug|glass|beaker)/.test(low)) amount = 100;
      else if (/\b(cup|mug|glass|beaker)\b/.test(low)) amount = 200;
    }
    if (amount) { p.type = 'fluids'; p.ml = amount; return p; }
  }
  if (/\b(reposition|repositioned|turned|turn|moved onto|rolled)\b/.test(low)) { p.type = 'turned'; return p; }
  const CONCERN = [['medicine', /\b(refused|wouldn.?t take|spat out|didn.?t take)\b.*\b(tablets?|medication|meds|medicines?|pills?|insulin)\b/], ['skin', /\b(red|redness|sore|pressure|blister|skin|broken skin|rash|bruise|bruising)\b/], ['eating', /\b(refused|not eating|didn.?t eat|wouldn.?t eat|off (his|her) food|not drinking)\b/], ['unwell', /\b(unwell|temperature|fever|chest|breath|breathing|cough|vomit|sick|chesty|pain|confused|drowsy)\b/], ['behaviour', /\b(agitated|aggressive|distressed|hit|shouting|wandering|upset)\b/], ['safeguarding', /\b(safeguard|abuse|neglect|money missing)\b/]];
  for (const [k, re] of CONCERN) if (re.test(low)) { p.type = 'concern'; p.concern = k; return p; }
  return p;
}
// Split a note that covers several residents or several things into separate entries.
// "Glenys drank 200 ml, and Hywel was turned. He seemed agitated." -> Glenys fluids, Hywel turned, Hywel behaviour.
function splitLocal(text, residents) {
  const sentences = String(text || '').split(/(?<=[.!?;])\s+/).map(s => s.trim()).filter(Boolean);
  const chunks = [];
  sentences.forEach(s => {
    const parts = s.split(/,?\s+\b(?:and|but|also|then|while)\b\s+/i);
    let cur = parts[0];
    for (let i = 1; i < parts.length; i++) {
      const nextRes = findResident(parts[i], residents), curRes = findResident(cur, residents);
      const startsPronoun = /^(he|she|they|his|her|their)\b/i.test(parts[i]);
      const nextHasOwnThing = parseSpeech(parts[i], residents).type !== 'note';
      if ((nextRes && (!curRes || nextRes.id !== curRes.id)) || startsPronoun || nextHasOwnThing) { chunks.push(cur); cur = parts[i]; }
      else cur += ' and ' + parts[i];
    }
    chunks.push(cur);
  });
  const out = []; let last = null;
  chunks.forEach(c => {
    const p = parseSpeech(c, residents);
    if (!p.resId && last && !['temp', 'waste'].includes(p.type)) p.resId = last;
    if (p.resId) last = p.resId;
    const prev = out[out.length - 1];
    if (p.type === 'note' && prev && prev.type === 'note' && prev.resId === p.resId) { prev.chunk += ' ' + c; return; }
    if (p.type === 'note' && prev && ['fall', 'concern'].includes(prev.type) && prev.resId === p.resId) {
      prev.chunk += ' ' + c;
      if (prev.type === 'fall') prev.injury = parseSpeech(prev.chunk, residents).injury;
      return;
    }
    p.chunk = c; out.push(p);
  });
  out.forEach(p => { p.writeText = ['temp', 'waste'].includes(p.type) ? '' : tidy(p.chunk); });
  return out;
}
const CONCERN_LABEL = { medicine: 'Medicine refused', skin: 'Skin or pressure area', eating: 'Not eating or drinking', unwell: 'Unwell', behaviour: 'Behaviour', safeguarding: 'Safeguarding', other: 'Other concern' };
const TYPE_LABEL = { note: 'Daily note', fluids: 'Fluids', turned: 'Repositioned', fall: 'Fall', concern: 'Concern', weight: 'Weight', temp: 'Fridge or freezer temperature', waste: 'Food waste' };

function tidy(text) {
  let s = ' ' + String(text || '').trim() + ' ';
  s = s.replace(/\b(um+|uh+|erm+|er|you know|like,)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  s = s.replace(/\bi\b/g, 'I').replace(/\bmls?\b/gi, 'ml');
  s = s.replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase());
  if (s && !/[.!?]$/.test(s)) s += '.';
  return s;
}
function writeUp(p, r, extra) {
  const lines = [];
  const who = r ? resName(r) + ' (room ' + r.room + ')' : '';
  const body = p.writeText ? String(p.writeText).trim() : tidy(p.text);
  if (p.type === 'temp') return (p.appliance || 'Fridge') + ': ' + (p.temp == null ? '?' : p.temp) + '\u00b0C' + (p.temp != null && tempBad({ unit: p.appliance, temp: p.temp }) ? '. OUT OF SAFE RANGE. Manager alerted.' : '. Within safe range.');
  if (p.type === 'waste') return 'Food waste: ' + (p.qty || 1) + ' ' + (p.unit || 'portions') + (p.item ? ' of ' + p.item : '') + '. Reason: ' + (p.reason || 'Other') + '.';
  if (who) lines.push(who + ', ' + hhmm(Date.now()) + '.');
  if (body) lines.push(body);
  if (p.type === 'fluids' && r) { const tot = fluidToday(r) + (p.ml || 0); lines.push('Fluids: ' + (p.ml || 0) + ' ml. Total today ' + tot.toLocaleString('en-GB') + ' of ' + r.fluidTarget.toLocaleString('en-GB') + ' ml.'); }
  if (p.type === 'turned') lines.push('Repositioned. Next turn due by ' + hhmm(Date.now() + 2 * HOUR) + '.');
  if (p.type === 'fall') lines.push('Fall recorded' + (p.injury ? ' WITH possible injury' : ', no injury noted') + '. Nurse in charge and manager alerted. Post-fall checks to follow.');
  if (p.type === 'concern') lines.push('Concern flagged: ' + (CONCERN_LABEL[p.concern] || 'Other') + '. Nurse in charge alerted.');
  if (p.type === 'weight' && r) {
    const prev = r.weights.length ? r.weights[Math.max(0, r.weights.length - 4)].kg : null;
    lines.push('Weight: ' + (p.kg || '?') + ' kg' + (prev && p.kg ? '. Change over 4 weeks: ' + ((p.kg - prev) / prev * 100).toFixed(1) + '%' : '') + '.');
    if (prev && p.kg && (prev - p.kg) / prev >= 0.05) lines.push('Lost 5% or more: GP referral and fortified diet flagged to the kitchen.');
  }
  return lines.join('\n');
}

/* ---------------- actions on data ---------------- */
function addAction(h, title, detail, owner, days, tag) {
  const a = { id: uid(), title, detail, owner, due: isoIn(days), tag: tag || '', done: false, created: Date.now() };
  h.actions.push(a); return a;
}
function fileEntry(h, p, by) {
  const now = Date.now(), r = p.resId ? resById(h, p.resId) : null;
  const text = writeUp(p, r);
  if (p.type === 'temp') { h.temps.push({ id: uid(), ts: now, unit: p.appliance || 'Kitchen fridge 1', temp: Number(p.temp), by }); if (tempBad({ unit: p.appliance, temp: p.temp })) addAction(h, (p.appliance || 'Fridge') + ' out of range (' + p.temp + '\u00b0C)', 'Move food, recheck in 30 minutes, call engineer if still out.', 'Cook', 0, 'Kitchen'); return 'Temperature saved'; }
  if (p.type === 'waste') { h.waste.push({ id: uid(), ts: now, item: p.item || 'Unnamed item', unit: p.unit || 'portions', qty: Number(p.qty) || 1, reason: p.reason || 'Other' }); return 'Waste logged'; }
  if (!r) return null;
  r.notes.push({ id: uid(), ts: now, by, text, heard: p.text, type: p.type });
  if (p.type === 'fluids' && p.ml) r.fluids.push({ ts: now, ml: Number(p.ml), by });
  if (p.type === 'turned') r.turns.push({ ts: now, by });
  if (p.type === 'weight' && p.kg) r.weights.push({ ts: now, kg: Number(p.kg) });
  if (p.type === 'fall' || p.type === 'concern') {
    const type = p.type === 'fall' ? 'Fall' : (CONCERN_LABEL[p.concern] || 'Concern');
    const said = p.writeText ? String(p.writeText).trim() : tidy(p.text);
    const inc = { id: uid(), ts: now, resId: r.id, type: p.type === 'fall' ? 'Fall' : 'Concern', sub: type, injury: !!p.injury, text: said, by, reviewed: false };
    h.incidents.push(inc);
    const a = addAction(h, 'Review ' + type.toLowerCase() + ': ' + resName(r), said, p.type === 'fall' ? 'Manager' : 'Nurse in charge', p.type === 'fall' ? 2 : 1, 'New');
    inc.actionId = a.id;
  }
  return { fluids: 'Fluids saved', turned: 'Turn saved', fall: 'Fall reported, manager alerted', concern: 'Concern flagged', weight: 'Weight saved', note: 'Note saved' }[p.type] || 'Saved';
}

/* ---------------- UI ---------------- */
const ROLES = [
  { id: 'owner', name: 'Owner', icon: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' },
  { id: 'manager', name: 'Manager', icon: '<path d="M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' },
  { id: 'nurse', name: 'Nurse', icon: '<path d="M12 4v16M4 12h16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>' },
  { id: 'carer', name: 'Carer', icon: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' },
  { id: 'cook', name: 'Cook', icon: '<path d="M6 13h12v6a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zM7 13a4 4 0 1 1 2.5-7.1A4 4 0 0 1 17 9a3.5 3.5 0 0 1 0 4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>' }
];
const ROLE_PERSON = { owner: 'Owner', manager: 'Manager', nurse: 'Nurse', carer: 'Carer', cook: 'Cook' };
const UI = { sub: {}, openInv: false, pending: 0, voice: null };
let $view, $sheetWrap, $sheet, $toast;

function toast(msg) {
  if (!$toast) return;
  $toast.textContent = msg; $toast.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { $toast.hidden = true; }, 2600);
}
function openSheet(html) { $sheet.innerHTML = html; $sheetWrap.hidden = false; document.body.style.overflow = 'hidden'; const f = $sheet.querySelector('[autofocus]'); if (f) setTimeout(() => f.focus(), 50); }
function closeSheet() { stopRecording(true); $sheetWrap.hidden = true; $sheet.innerHTML = ''; document.body.style.overflow = ''; }
const sheetHead = (title, sub) => `<div class="sheet-h"><div><h2>${esc(title)}</h2>${sub ? `<p class="hint">${sub}</p>` : ''}</div><button type="button" class="x" data-act="closeSheet" aria-label="Close">\u00d7</button></div>`;

function renderTop() {
  const sel = document.getElementById('homeSelect');
  const opts = Object.values(S.homes).map(h => `<option value="${h.id}">${esc(h.name)}</option>`).join('') + (S.role === 'owner' ? '<option value="all">All four homes</option>' : '');
  sel.innerHTML = opts; sel.value = S.homeId;
  document.getElementById('roleLabel').textContent = (ROLE_PERSON[S.role] || '') + ' view \u00b7 demo';
  document.getElementById('tabs').innerHTML = ROLES.map(r => `<button type="button" data-act="role" data-role="${r.id}" ${S.role === r.id ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${r.icon}</svg>${r.name}</button>`).join('');
}
function render() {
  if (S.role !== 'owner' && S.homeId === 'all') S.homeId = S.lastHome;
  renderTop();
  let html = '';
  if (S.homeId === 'all') html = viewGroup();
  else html = ({ owner: viewOwner, manager: viewManager, nurse: viewNurse, carer: viewCarer, cook: viewCook })[S.role]();
  if (UI.pending) html = `<div class="notice" style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span><b>${UI.pending} voice note${UI.pending > 1 ? 's' : ''} waiting</b> to be written up (recorded with no signal).</span><button type="button" class="btn pri sm" data-act="flushQueue">Write up now</button></div>` + html;
  if (!saveOk) html ='<div class="notice">This browser is not letting the demo save (private browsing?). Changes will be lost when you close it.</div>' + html;
  $view.innerHTML = html;
}
function homeHead(h, title) {
  const ratingCls = /Requires|Inadequate/.test(h.rating) ? 'warn' : 'ok';
  return `<div class="head"><div class="eyebrow">${esc(title)}</div><h1>${esc(h.name)}, ${esc(h.town)}</h1>
  <div class="chips"><span class="chip ${ratingCls}">${esc(h.reg)} \u00b7 ${esc(h.rating)}</span><span>${h.beds} beds \u00b7 ${h.units.map(u => esc(u.name) + ' (' + esc(u.type.toLowerCase()) + ')').join(', ')}</span><span class="chip">Demo data</span></div></div>`;
}
const tile = (k, v, s, bad, act) => `<div class="tile"${act ? ` role="button" tabindex="0" data-act="${act}" style="cursor:pointer"` : ''}><span class="k">${k}</span><span class="v">${v}</span><span class="s${bad ? ' bad' : ''}">${s}</span></div>`;

/* ----- Owner ----- */
function attentionItems(h, st) {
  const items = [];
  st.late.forEach(a => items.push({ tag: 'Late', cls: 'bad', html: `<b>${esc(a.title)}.</b> ${esc(a.detail)} Was due ${dueText(a.due)}.`, who: a.owner }));
  h.incidents.filter(i => !i.reviewed).forEach(i => { const r = resById(h, i.resId); items.push({ tag: i.type === 'Fall' ? 'Fall' : 'Care', cls: 'bad', html: `<b>${esc(i.sub || i.type)}: ${esc(resName(r))}${i.injury ? ', possible injury' : ''}.</b> ${esc(i.text)} Logged ${whenText(i.ts)} by ${esc(i.by.toLowerCase())}.`, who: 'Manager to review' }); });
  h.shifts.filter(s => s.cover === 'open').forEach(s => items.push({ tag: s.date === today() ? 'Today' : 'Rota', cls: s.role === 'Nurse' ? 'bad' : 'warn', html: `<b>${niceDate(new Date(s.date + 'T12:00').getTime())} ${esc(s.role.toLowerCase())} shift not covered (${esc(s.time)}).</b> ${s.texted ? 'Sent to bank staff at ' + hhmm(s.texted) + ', no reply yet.' : 'Not yet sent to bank staff.'}`, who: 'Manager' }));
  st.feesOpen.filter(f => Date.now() - f.since > 28 * DAY).forEach(f => items.push({ tag: 'Money', cls: 'warn', html: `<b>Fees ${Math.floor((Date.now() - f.since) / (7 * DAY))} weeks overdue (${money(f.amt)}).</b> ${esc(f.payer)}. Next step: call them.`, who: 'Admin' }));
  h.invoices.filter(i => i.rise && i.status === 'waiting').forEach(i => items.push({ tag: 'Price', cls: 'warn', html: `<b>${esc(i.supplier)}:</b> ${esc(i.rise)}.`, btns: `<button type="button" class="btn pri sm" data-act="inv" data-id="${i.id}" data-st="queried">Query it</button><button type="button" class="btn sm" data-act="inv" data-id="${i.id}" data-st="approved">Accept</button>` }));
  if (st.loss.length) items.push({ tag: 'Care', cls: 'ok', html: `<b>${st.loss.length} resident${st.loss.length > 1 ? 's' : ''} lost 5% or more of their weight.</b> ${st.loss.map(r => esc(resName(r))).join(', ')}. Kitchen diet sheet now shows fortified meals.`, who: 'Nurse in charge' });
  st.badTemps.forEach(t => items.push({ tag: 'Kitchen', cls: 'bad', html: `<b>${esc(t.unit)} at ${t.temp}\u00b0C</b> at ${hhmm(t.ts)}. Out of safe range.`, who: 'Cook' }));
  const fam = h.actions.find(a => !a.done && /families/i.test(a.title));
  if (fam) items.push({ tag: h.reg, cls: 'warn', html: `<b>${esc(fam.title)}.</b> ${st.family} of ${st.n} reviews have family input.`, who: fam.owner + ' \u00b7 due ' + dueText(fam.due) });
  return items;
}
function viewOwner() {
  const h = H(), st = stats(h), f = h.fig;
  const att = attentionItems(h, st);
  const agMax = 30, tgtPx = f.agencyTarget / agMax * 150;
  const trend = f.agencyTrend.slice(-7).concat([f.agencyPct]);
  const aims = h.aims.map(a => {
    let done = a.done, total = a.total;
    if (a.key === 'plans') { done = st.plans; total = st.n; }
    if (a.key === 'family') { done = st.family; total = st.n; }
    const pct = total ? Math.round(done / total * 100) : 0, cls = pct < 50 ? 'bad' : (pct < 90 ? 'warn' : '');
    return `<div class="aim"><div class="t"><span>${esc(a.label)}</span><b style="${cls === 'bad' ? 'color:var(--bad)' : ''}" class="num">${done} of ${total}</b></div><div class="bar ${cls}"><i style="width:${pct}%"></i></div></div>`;
  }).join('');
  const enqWait = h.enquiries.filter(e => /waiting/i.test(e.status));
  const inv = UI.openInv ? `<div class="rows">${h.invoices.map(i => `<div class="row"><span class="grow">${esc(i.supplier)}${i.rise ? `<br><span class="hint">${esc(i.rise)}</span>` : ''}</span><b class="num">${money(i.amt)}</b>${i.status === 'waiting' ? `<span class="btns"><button type="button" class="btn pri sm" data-act="inv" data-id="${i.id}" data-st="approved">Approve</button><button type="button" class="btn sm" data-act="inv" data-id="${i.id}" data-st="queried">Query</button></span>` : `<span class="tag ${i.status === 'approved' ? 'ok' : 'warn'}">${i.status}</span>`}</div>`).join('')}</div>` : '';
  return `${homeHead(h, "Owner's weekly dashboard \u00b7 week ending " + niceDate(Date.now()))}
  <div class="tiles">
    ${tile('Beds filled', st.n + ' / ' + h.beds, st.empty > 0 ? st.empty + ' empty \u00b7 ' + money(st.lostFees) + ' a week in lost fees' : 'Full')}
    ${tile('Agency share of care hours', f.agencyPct + '%', 'Was ' + f.agencyTrend[0] + '% 8 weeks ago \u00b7 target ' + f.agencyTarget + '%')}
    ${h.noNurses ? tile('Carer shifts open', String(h.shifts.filter(s => s.cover === 'open').length), 'Residential home, no nurses') : tile('Nurse shifts by own staff', st.nurseOwn + ' / ' + st.nurseTotal, st.nurseAg + ' agency' + (st.nurseOpen ? ' \u00b7 ' + st.nurseOpen + ' still open' : ''), st.nurseOpen > 0)}
    ${tile('Food per resident per day', money2(f.foodPRD), 'Target ' + money2(f.foodTarget) + ' \u00b7 waste ' + f.wastePct + '%')}
    ${tile('Fees overdue', money(st.fees), st.feesOpen.length + ' resident' + (st.feesOpen.length === 1 ? '' : 's') + (st.oldest ? ' \u00b7 oldest ' + Math.round(st.oldest / (7 * DAY)) + ' weeks' : ''))}
    ${tile('Open actions', String(st.openActs.length), st.late.length ? st.late.length + ' past their date' : 'None late', st.late.length > 0, 'gotoActions')}
  </div>
  <div class="btns"><button type="button" class="btn" data-act="editFigures">Use your own numbers</button><button type="button" class="btn" data-act="report">Monthly ${h.reg} report</button><button type="button" class="btn" data-act="friday">Friday email</button></div>
  <section class="card"><h2>Needs your attention this week</h2><div>${att.length ? att.map(a => `<div class="att"><span class="tag ${a.cls}">${esc(a.tag)}</span><span class="txt">${a.html}</span>${a.btns ? `<span class="btns">${a.btns}</span>` : `<span class="who">${esc(a.who || '')}</span>`}</div>`).join('') : '<p class="empty">Nothing needs you this week.</p>'}</div></section>
  <div class="grid2 three">
    <section class="card"><h2>${esc(h.reg)} areas for improvement</h2>${aims}<p class="foot">From the care records and staff files. The monthly ${h.reg === 'CIW' ? 'Responsible Individual report' : 'quality report'} builds from these figures. Sign-offs on the Nurse screen move these bars.</p></section>
    <section class="card"><h2>Agency share, last 8 weeks</h2>
      <div class="chart" role="img" aria-label="Agency share of care hours went from ${trend[0]}% to ${trend[7]}% over 8 weeks, against a ${f.agencyTarget}% target">
        <div class="tgt" style="bottom:${tgtPx}px"><span>Target ${f.agencyTarget}%</span></div>
        ${trend.map((v, i) => `<div class="b${i === 7 ? ' now' : ''}" style="height:${Math.min(150, v / agMax * 150)}px"></div>`).join('')}
      </div>
      <div class="chart-l"><span>${trend[0]}% \u00b7 8 weeks ago</span><span>${trend[7]}% \u00b7 this week</span></div>
      <p class="foot">From the rota. Every open shift goes to bank staff first; agency only if nobody takes it.</p></section>
    <section class="card"><h2>Care</h2><div class="minis">
      <div class="mini"><span class="v">${Math.round(st.plans / st.n * 100)}%</span><span class="l">care plans up to date</span></div>
      <div class="mini"><span class="v">${st.reviewed48} / ${st.inc7.length}</span><span class="l">incidents reviewed in 48 hours</span></div>
      <div class="mini"><span class="v">${st.falls.length}</span><span class="l">falls this week${st.falls.some(x => x.injury) ? ', ' + st.falls.filter(x => x.injury).length + ' with injury' : ', none with injury'}</span></div>
      <div class="mini"><span class="v">${f.fluidMetPct}%</span><span class="l">daily fluid targets met</span></div></div>
      <p class="foot">From dictated daily notes, the incident log and monitoring charts.</p></section>
    <section class="card"><h2>Beds and enquiries</h2><div class="rows">
      <div class="row"><span>Enquiries this week</span><b class="num">${h.enquiries.filter(e => e.ts > Date.now() - 7 * DAY).length}</b></div>
      <div class="row"><span>Assessments booked</span><b class="num">${h.enquiries.filter(e => /assessment/i.test(e.status)).length}</b></div>
      ${enqWait.map(e => `<div class="row"><span class="grow">${esc(e.from)} referral waiting for a decision</span><b style="color:var(--bad)">${Math.max(1, Math.round((Date.now() - e.ts) / HOUR))} hrs</b></div>`).join('')}
      </div><p class="foot">From the enquiry tracker. A decision within 24 hours wins hospital discharges.</p></section>
    <section class="card"><h2>Kitchen</h2><div class="rows">
      <div class="row"><span>Food spend this week</span><b class="num">${money(st.foodWeek)} <span class="hint" style="font-weight:400">vs ${money(st.foodBudget)} budget</span></b></div>
      <div class="row"><span>Waste, share of food bought</span><b class="num">${f.wastePct}% <span class="hint" style="font-weight:400">target ${f.wasteTarget}%</span></b></div>
      <div class="row"><span>Most left on plates</span><b>${esc(st.most)}</b></div>
      <div class="row"><span>Diet sheet changes from care plans</span><b class="num">${f.dietChanges + st.loss.length}</b></div>
      <div class="row"><span>Fridge and freezer checks today</span><b style="${st.badTemps.length ? 'color:var(--bad)' : ''}">${st.badTemps.length ? st.badTemps.length + ' out of range' : (st.amDone && (!st.pmNeeded || st.pmDone) ? 'All done' : (st.amDone ? 'Afternoon checks due' : 'Morning checks due'))}</b></div>
      </div><p class="foot">From the kitchen screen: orders, waste log, invoices and temperature checks.</p></section>
    <section class="card"><h2>Back office</h2><div class="rows">
      <div class="row"><span>Invoices waiting for you</span><span class="btns" style="align-items:center"><b class="num">${st.wait.length} \u00b7 ${money(st.waitAmt)}</b><button type="button" class="btn ${UI.openInv ? '' : 'pri'} sm" data-act="toggleInv">${UI.openInv ? 'Hide' : 'Review'}</button></span></div>
      ${inv}
      <div class="row"><span>Overtime flagged before Friday's payroll</span><b class="num">${f.overtimeHrs} hrs</b></div>
      <div class="row"><span>Contracts renewing in 60 days</span><b>${esc(f.contracts)}</b></div>
      <div class="row"><span>Residents billed correctly this week</span><b class="num">${st.n} of ${st.n}</b></div>
      </div><p class="foot">From invoices, the fees tracker, rota-to-payroll and the contracts calendar.</p></section>
  </div>
  <p class="demo-foot">Demo only: every figure is made up. In the real app each number comes from the home's own records, entered once by staff on a phone or tablet. Anything you add here is saved on this phone only.</p>`;
}
function viewGroup() {
  const rows = Object.values(S.homes).map(h => { const st = stats(h); return { h, st }; });
  const tot = rows.reduce((a, { h, st }) => ({ beds: a.beds + h.beds, n: a.n + st.n, fees: a.fees + st.fees, acts: a.acts + st.openActs.length, late: a.late + st.late.length, lost: a.lost + st.lostFees }), { beds: 0, n: 0, fees: 0, acts: 0, late: 0, lost: 0 });
  return `<div class="head"><div class="eyebrow">Group view \u00b7 week ending ${niceDate(Date.now())}</div><h1>All four homes</h1><div class="chips"><span class="chip">Demo data</span><span>Tap a home to open its dashboard</span></div></div>
  <div class="tiles">
    ${tile('Beds filled', tot.n + ' / ' + tot.beds, (tot.beds - tot.n) + ' empty \u00b7 ' + money(tot.lost) + ' a week')}
    ${tile('Fees overdue', money(tot.fees), 'Across ' + rows.length + ' homes')}
    ${tile('Open actions', String(tot.acts), tot.late + ' past their date', tot.late > 0)}
  </div>
  <section class="card"><h2>Homes side by side</h2><div class="tbl-wrap"><table><thead><tr><th>Home</th><th>Rating</th><th class="n">Beds</th><th class="n">Agency</th><th class="n">Nurse own</th><th class="n">Food / day</th><th class="n">Fees overdue</th><th class="n">Actions</th></tr></thead><tbody>
  ${rows.map(({ h, st }) => `<tr class="click" data-act="openHome" data-home="${h.id}"><td><b>${esc(h.name)}</b><br><span class="hint">${esc(h.town)}</span></td><td><span class="chip ${/Requires/.test(h.rating) ? 'warn' : 'ok'}">${esc(h.reg)} \u00b7 ${esc(h.rating)}</span></td><td class="n">${st.n}/${h.beds}</td><td class="n" style="${h.fig.agencyPct > h.fig.agencyTarget ? 'color:var(--bad);font-weight:600' : ''}">${h.fig.agencyPct}%</td><td class="n">${h.noNurses ? '\u2014' : st.nurseOwn + '/' + st.nurseTotal}</td><td class="n" style="${h.fig.foodPRD > h.fig.foodTarget ? 'color:var(--bad);font-weight:600' : ''}">${money2(h.fig.foodPRD)}</td><td class="n">${money(st.fees)}</td><td class="n">${st.openActs.length}${st.late.length ? ` <span style="color:var(--bad)">(${st.late.length} late)</span>` : ''}</td></tr>`).join('')}
  </tbody></table></div><p class="foot">Red means worse than target. Every figure is made up for the demo.</p></section>`;
}

/* ----- Manager ----- */
function viewManager() {
  const h = H(), st = stats(h), sub = UI.sub.manager || 'today';
  const tabs = [['today', 'Today'], ['rota', 'Rota gaps'], ['incidents', 'Incidents'], ['enquiries', 'Enquiries'], ['money', 'Invoices and fees']];
  let body = '';
  if (sub === 'today') {
    const acts = st.openActs.slice().sort((a, b) => a.due < b.due ? -1 : 1);
    const unrev = h.incidents.filter(i => !i.reviewed).length, open = h.shifts.filter(s => s.cover === 'open').length;
    const d0 = startOfDay(Date.now());
    const flu = h.residents.filter(r => fluidToday(r) < r.fluidTarget * Math.min(1, Math.max(0, (Date.now() - (d0 + 7 * HOUR)) / (14 * HOUR))) * 0.6);
    body = `<div class="tiles">${tile('Incidents to review', String(unrev), unrev ? 'Tap Incidents' : 'All reviewed', unrev > 0)}${tile('Shifts not covered', String(open), 'Next 7 days', open > 0)}${tile('Behind on fluids', String(flu.length), 'Under 60% of where they should be by now', flu.length > 3)}</div>
    <section class="card"><div class="card-h"><h2>To do</h2><button type="button" class="btn sm" data-act="addAction">Add a to-do</button></div><div>
    ${acts.map(a => `<div class="att"><span class="tag ${a.due < today() ? 'bad' : (a.tag === 'New' ? 'bad' : (a.tag ? 'warn' : ''))}">${a.due < today() ? 'Late' : esc(a.tag || 'Due ' + dueText(a.due).slice(0, 3))}</span><span class="txt"><b>${esc(a.title)}</b><br><span class="hint">${esc(a.detail)} \u00b7 ${esc(a.owner)} \u00b7 due ${dueText(a.due)}</span></span><button type="button" class="btn sm" data-act="doneAction" data-id="${a.id}">Done</button></div>`).join('') || '<p class="empty">Nothing on the list.</p>'}
    </div></section>
    ${flu.length ? `<section class="card"><h2>Behind on fluids right now</h2><div class="rows">${flu.slice(0, 8).map(r => `<div class="row"><span class="grow">${esc(resName(r))} \u00b7 ${esc(unitName(h, r.unit))}</span><b class="num">${fluidToday(r)} / ${r.fluidTarget} ml</b></div>`).join('')}</div><p class="foot">Carers' taps and voice notes feed this list live.</p></section>` : ''}`;
  } else if (sub === 'rota') {
    const shifts = h.shifts.slice().sort((a, b) => a.date < b.date ? -1 : 1);
    body = `<section class="card"><h2>Shifts not covered</h2><div>${shifts.filter(s => s.cover === 'open').map(s => `<div class="att"><span class="tag ${s.role === 'Nurse' ? 'bad' : 'warn'}">${esc(s.role)}</span><span class="txt"><b>${niceDate(new Date(s.date + 'T12:00').getTime())}, ${esc(s.time)}</b>${s.unit ? ' \u00b7 ' + esc(s.unit) : ''}<br><span class="hint">${s.texted ? 'Text sent to 4 bank ' + (s.role === 'Nurse' ? 'nurses' : 'carers') + ' at ' + hhmm(s.texted) + '. First to reply gets it.' : 'Not sent yet.'}</span></span><span class="btns">${s.texted ? '' : `<button type="button" class="btn pri sm" data-act="textBank" data-id="${s.id}">Text bank staff</button>`}<button type="button" class="btn sm" data-act="cover" data-id="${s.id}" data-c="own">Own staff took it</button><button type="button" class="btn sm" data-act="cover" data-id="${s.id}" data-c="agency">Book agency</button></span></div>`).join('') || '<p class="empty">Every shift in the next 7 days is covered.</p>'}</div>
    <p class="foot">Demo: no texts are really sent. In the live app, bank staff get a text with a link and the first to accept gets the shift.</p></section>
    ${h.noNurses ? '' : `<section class="card"><h2>Nurse shifts, next 7 days</h2><div class="tbl-wrap"><table><thead><tr><th>Day</th><th>Shift</th><th>Who</th></tr></thead><tbody>${shifts.filter(s => s.role === 'Nurse').map(s => `<tr><td>${niceDate(new Date(s.date + 'T12:00').getTime())}</td><td>${esc(s.time)}</td><td>${s.cover === 'open' ? '<span class="tag bad">Open</span>' : (s.cover === 'agency' ? '<span class="tag warn">Agency</span>' : esc(s.who))}</td></tr>`).join('')}</tbody></table></div><p class="foot">${st.nurseOwn} of ${st.nurseTotal} by own staff. This feeds the owner's dashboard.</p></section>`}`;
  } else if (sub === 'incidents') {
    const list = h.incidents.slice().sort((a, b) => b.ts - a.ts);
    body = `<section class="card"><div class="card-h"><h2>Incidents</h2><button type="button" class="btn sm" data-act="concern">Log one</button></div><div>${list.map(i => { const r = resById(h, i.resId); return `<div class="att"><span class="tag ${i.reviewed ? 'ok' : 'bad'}">${i.reviewed ? 'Reviewed' : 'To review'}</span><span class="txt"><b>${esc(i.sub || i.type)}: ${esc(resName(r))}</b>${i.injury ? ' \u00b7 <span style="color:var(--bad)">possible injury</span>' : ''}<br><span class="hint">${esc(i.text)} \u00b7 ${whenText(i.ts)} by ${esc(i.by)}</span></span>${i.reviewed ? '' : `<button type="button" class="btn pri sm" data-act="review" data-id="${i.id}">Mark reviewed</button>`}</div>`; }).join('') || '<p class="empty">No incidents.</p>'}</div></section>`;
  } else if (sub === 'enquiries') {
    body = `<section class="card"><div class="card-h"><h2>Enquiries</h2><button type="button" class="btn sm" data-act="addEnquiry">Add enquiry</button></div><div>${h.enquiries.slice().sort((a, b) => b.ts - a.ts).map(e => `<div class="att"><span class="tag ${/waiting/i.test(e.status) ? 'bad' : 'ok'}">${esc(e.from)}</span><span class="txt"><b>${esc(e.name)}</b><br><span class="hint">${esc(e.need)} \u00b7 ${whenText(e.ts)} \u00b7 ${esc(e.status)}</span></span>${/waiting/i.test(e.status) ? `<span class="btns"><button type="button" class="btn pri sm" data-act="enq" data-id="${e.id}" data-st="Assessment booked">Book assessment</button><button type="button" class="btn sm" data-act="enq" data-id="${e.id}" data-st="Declined, no suitable bed">Decline</button></span>` : ''}</div>`).join('')}</div></section>`;
  } else {
    body = `<section class="card"><h2>Invoices waiting</h2><div class="rows">${h.invoices.map(i => `<div class="row"><span class="grow">${esc(i.supplier)}${i.rise ? `<br><span class="hint" style="color:var(--warn)">${esc(i.rise)}</span>` : ''}</span><b class="num">${money(i.amt)}</b>${i.status === 'waiting' ? `<span class="btns"><button type="button" class="btn pri sm" data-act="inv" data-id="${i.id}" data-st="approved">Approve</button><button type="button" class="btn sm" data-act="inv" data-id="${i.id}" data-st="queried">Query</button></span>` : `<span class="tag ${i.status === 'approved' ? 'ok' : 'warn'}">${esc(i.status)}</span>`}</div>`).join('')}</div></section>
    <section class="card"><h2>Fees overdue</h2><div class="rows">${h.fees.map(fe => { const r = resById(h, fe.resId); return `<div class="row"><span class="grow">${esc(resName(r))} \u00b7 ${esc(fe.payer)}<br><span class="hint">${Math.round((Date.now() - fe.since) / (7 * DAY))} weeks overdue</span></span><b class="num">${money(fe.amt)}</b>${fe.paid ? '<span class="tag ok">Paid</span>' : `<button type="button" class="btn sm" data-act="feePaid" data-id="${fe.id}">Mark paid</button>`}</div>`; }).join('')}</div></section>`;
  }
  return `${homeHead(h, "Manager \u00b7 " + niceDate(Date.now()))}
  <div class="seg" role="group" aria-label="Manager sections">${tabs.map(([k, l]) => `<button type="button" data-act="sub" data-r="manager" data-s="${k}" aria-pressed="${sub === k}">${l}</button>`).join('')}</div>${body}`;
}

/* ----- Nurse ----- */
function currentRound() { const hr = new Date().getHours(); if (hr < 7) return 'night'; let r = ROUNDS[0]; ROUNDS.forEach(x => { if (hr >= x.h - 1) r = x; }); return r.id; }
function viewNurse() {
  const h = H(), sub = UI.sub.nurse || 'meds';
  const unit = S.unit[h.id] || (h.units.find(u => u.nursing) || h.units[0]).id;
  const unitSeg = h.units.length > 1 ? `<div class="seg" role="group" aria-label="Unit">${h.units.map(u => `<button type="button" data-act="unit" data-u="${u.id}" aria-pressed="${unit === u.id}">${esc(u.name)}</button>`).join('')}</div>` : '';
  const res = h.residents.filter(r => r.unit === unit);
  const tabs = [['meds', 'Medicines round'], ['weights', 'Weights'], ['reviews', 'Care plan reviews']];
  let body = '';
  if (sub === 'meds') {
    const rd = UI.round || currentRound(), key = today() + ':' + rd;
    const rec = h.mar[key] || (h.mar[key] = {});
    const due = res.map(r => ({ r, meds: r.meds.filter(m => m.rounds.includes(rd)) })).filter(x => x.meds.length);
    const total = due.reduce((a, x) => a + x.meds.length, 0), doneN = due.reduce((a, x) => a + x.meds.filter(m => rec[x.r.id + '|' + m.name]).length, 0);
    body = `<div class="seg" role="group" aria-label="Round">${ROUNDS.map(x => `<button type="button" data-act="round" data-rd="${x.id}" aria-pressed="${rd === x.id}">${x.name} ${x.at}</button>`).join('')}</div>
    <section class="card"><div class="card-h"><h2>${ROUNDS.find(x => x.id === rd).name} round</h2><b class="num">${doneN} of ${total} recorded</b></div><div class="bar"><i style="width:${total ? doneN / total * 100 : 0}%"></i></div>
    <div>${due.map(({ r, meds }) => `<div class="note-item"><b>${esc(resName(r))} \u00b7 room ${r.room}${r.allergies ? ` <span class="tag bad">Allergy: ${esc(r.allergies)}</span>` : ''}</b>${meds.map(m => { const v = rec[r.id + '|' + m.name]; return `<div class="row"><span class="grow">${esc(m.name)}</span>${v ? `<span class="tag ${v === 'Given' ? 'ok' : 'warn'}">${esc(v)} ${v.ts ? '' : ''}</span><button type="button" class="linkbtn" data-act="mar" data-k="${esc(r.id + '|' + m.name)}" data-v="">Undo</button>` : `<span class="btns"><button type="button" class="btn pri sm" data-act="mar" data-k="${esc(r.id + '|' + m.name)}" data-v="Given">Given</button><button type="button" class="btn sm" data-act="mar" data-k="${esc(r.id + '|' + m.name)}" data-v="Refused">Refused</button></span>`}</div>`; }).join('')}</div>`).join('') || '<p class="empty">No medicines due this round on this unit.</p>'}</div>
    <p class="foot">Demo medicines only. A refusal raises a to-do for the nurse in charge.</p></section>`;
  } else if (sub === 'weights') {
    body = `<section class="card"><h2>Weekly weights</h2><p class="hint">Type a weight, or press Speak and say e.g. \u201c${esc(res[0] ? res[0].first : 'Margaret')} weighs 52.4 kilos\u201d. Alerts at 5% loss over 4 weeks.</p><div>${res.map(r => { const loss = weightLoss(r), last = r.weights[r.weights.length - 1]; return `<form class="row" data-form="weight" data-id="${r.id}"><span class="grow"><b>${esc(resName(r))}</b><br><span class="hint">Last ${last ? last.kg + ' kg, ' + whenText(last.ts).replace(/ \d\d:\d\d$/, '') : 'none'}${loss >= 5 ? '' : (loss > 0 ? ' \u00b7 down ' + loss.toFixed(1) + '%' : '')}</span>${loss >= 5 ? `<br><span class="alert-line">Down ${loss.toFixed(1)}% in 4 weeks \u00b7 GP referral, fortified diet</span>` : ''}</span><span class="btns"><input name="kg" inputmode="decimal" aria-label="New weight for ${esc(resName(r))} in kg" placeholder="kg" style="width:84px;min-height:38px;border:1px solid #c9d0cd;border-radius:8px;padding:0 8px;font-size:16px"><button class="btn sm" type="submit">Save</button></span></form>`; }).join('')}</div></section>`;
  } else {
    const due = h.residents.filter(r => !r.planCurrent);
    const st = stats(h);
    body = `<section class="card"><div class="card-h"><h2>Care plan reviews to sign off</h2><b class="num">${st.plans} of ${st.n} current</b></div><div>${due.map(r => `<form class="att" data-form="review" data-id="${r.id}"><span class="txt"><b>${esc(resName(r))}</b> \u00b7 ${esc(unitName(h, r.unit))}, room ${r.room}<br><label class="check"><input type="checkbox" name="family" ${r.familyInvolved ? 'checked' : ''}> Family took part in this review</label></span><button class="btn pri sm" type="submit">Sign off review</button></form>`).join('') || '<p class="okbox">Every care plan is up to date.</p>'}</div><p class="foot">Signing off moves the ${esc(h.reg)} bars on the owner's dashboard straight away.</p></section>`;
  }
  return `${homeHead(h, 'Nurse or senior \u00b7 ' + niceDate(Date.now()))}${unitSeg}<div class="seg" role="group" aria-label="Nurse sections">${tabs.map(([k, l]) => `<button type="button" data-act="sub" data-r="nurse" data-s="${k}" aria-pressed="${sub === k}">${l}</button>`).join('')}</div>${body}`;
}

/* ----- Carer ----- */
function viewCarer() {
  const h = H(), unit = S.unit[h.id] || h.units[0].id, now = Date.now();
  const res = h.residents.filter(r => r.unit === unit);
  const unitSeg = h.units.length > 1 ? `<div class="seg" role="group" aria-label="Unit">${h.units.map(u => `<button type="button" data-act="unit" data-u="${u.id}" aria-pressed="${unit === u.id}">${esc(u.name)}</button>`).join('')}</div>` : '';
  const sample = res[0] ? res[0].first : 'Margaret';
  return `${homeHead(h, 'Carer \u00b7 my residents this shift')}${unitSeg}
  <div class="okbox">Press <b>Speak</b> and say what happened, e.g. \u201c${esc(sample)} drank 200 ml of tea and ate most of her lunch\u201d. It works out who, what and how much.</div>
  <div class="btns"><button type="button" class="btn bad" data-act="concern">Report a fall or concern</button><button type="button" class="btn" data-act="addResident">Add a resident</button></div>
  <div class="res-list">${res.map(r => {
    const fl = fluidToday(r), pct = Math.min(100, fl / r.fluidTarget * 100), lt = lastTurn(r);
    const turnLate = r.needsTurns && (!lt || now - lt > 2 * HOUR);
    const last = r.notes[r.notes.length - 1];
    return `<article class="res"><div class="nm"><b>${esc(resName(r))}</b><span class="meta">Room ${r.room} \u00b7 ${esc(r.texture)}${r.diabetic ? ' \u00b7 diabetic' : ''}${r.assist ? ' \u00b7 help to eat' : ''}</span></div>
      <div class="flu"><div style="display:flex;justify-content:space-between"><span>Fluids today</span><b class="num">${fl.toLocaleString('en-GB')} / ${r.fluidTarget.toLocaleString('en-GB')} ml</b></div><div class="bar ${pct < 35 && new Date().getHours() >= 13 ? 'bad' : ''}"><i style="width:${pct}%"></i></div></div>
      ${r.needsTurns ? `<div class="${turnLate ? 'alert-line' : 'meta'}">${lt ? 'Last turned ' + hhmm(lt) : 'Not turned yet today'}${turnLate ? ' \u00b7 turn due' : ' \u00b7 next by ' + hhmm(lt + 2 * HOUR)}</div>` : ''}
      ${last ? `<div class="last">${esc(last.text.split('\n').slice(-1)[0]).slice(0, 140)} <span class="hint">\u00b7 ${hhmm(last.ts)}</span></div>` : ''}
      <div class="acts"><button type="button" class="btn pri sm" data-act="micFor" data-id="${r.id}">Speak a note</button><button type="button" class="btn sm" data-act="drink" data-id="${r.id}" data-ml="100">+100 ml</button><button type="button" class="btn sm" data-act="drink" data-id="${r.id}" data-ml="200">+200 ml</button>${r.needsTurns ? `<button type="button" class="btn sm" data-act="turn" data-id="${r.id}">Turned</button>` : ''}<button type="button" class="btn sm" data-act="notes" data-id="${r.id}">Notes (${r.notes.length})</button></div></article>`;
  }).join('')}</div>`;
}

/* ----- Cook ----- */
function viewCook() {
  const h = H(), sub = UI.sub.cook || 'diet', st = stats(h);
  const tabs = [['diet', 'Diet sheet'], ['waste', 'Waste'], ['temps', 'Temperatures'], ['stock', 'Stock and orders']];
  let body = '';
  if (sub === 'diet') {
    const lossIds = new Set(st.loss.map(r => r.id));
    body = h.units.map(u => {
      const rs = h.residents.filter(r => r.unit === u.id);
      return `<section class="card"><div class="card-h"><h2>${esc(u.name)}</h2><span class="hint">${rs.length} residents</span></div><div class="tbl-wrap"><table><thead><tr><th>Resident</th><th>Texture</th><th>Needs</th></tr></thead><tbody>${rs.map(r => `<tr><td><b>${esc(resName(r))}</b><br><span class="hint">Room ${r.room}</span></td><td>${esc(r.texture)}</td><td>${[r.diabetic ? '<span class="tag warn">Diabetic</span>' : '', r.allergies ? `<span class="tag bad">${esc(r.allergies)} allergy</span>` : '', r.assist ? '<span class="tag">Help to eat</span>' : '', lossIds.has(r.id) ? '<span class="tag ok">Fortified</span>' : ''].filter(Boolean).join(' ') || '<span class="hint">\u2014</span>'}</td></tr>`).join('')}</tbody></table></div></section>`;
    }).join('') + `<p class="foot">Built from the care records. When a nurse records weight loss, \u201cFortified\u201d appears here with no phone call to the kitchen.</p>`;
  } else if (sub === 'waste') {
    const wk = h.waste.filter(w => w.ts > Date.now() - 7 * DAY).sort((a, b) => b.ts - a.ts);
    body = `<section class="card"><h2>Log waste</h2><p class="hint">Or press Speak: \u201cwaste 4 portions of fish pie left on plates\u201d.</p>
    <form class="form" data-form="waste"><div class="frow"><label class="fld"><span>Item</span><input name="item" required placeholder="e.g. Fish pie"></label><label class="fld"><span>Amount</span><input name="qty" inputmode="decimal" required placeholder="4"></label></div>
    <div class="frow"><label class="fld"><span>Unit</span><select name="unit"><option>portions</option><option>kg</option><option>loaves</option></select></label><label class="fld"><span>Reason</span><select name="reason"><option>Left on plates</option><option>Cooked too much</option><option>Out of date</option><option>Other</option></select></label></div>
    <button class="btn pri" type="submit">Save</button></form></section>
    <section class="card"><h2>This week</h2><div class="rows">${wk.map(w => `<div class="row"><span class="grow">${esc(w.item)}<br><span class="hint">${whenText(w.ts)} \u00b7 ${esc(w.reason)}</span></span><b class="num">${w.qty} ${esc(w.unit)}</b></div>`).join('') || '<p class="empty">Nothing logged this week.</p>'}</div><p class="foot">Most left on plates this week: <b>${esc(st.most)}</b>. This shows on the owner's dashboard.</p></section>`;
  } else if (sub === 'temps') {
    const td = h.temps.filter(t => t.ts >= startOfDay(Date.now())).sort((a, b) => b.ts - a.ts);
    body = `<section class="card"><h2>Record a temperature</h2><p class="hint">Or press Speak: \u201cfridge 1 is 4 degrees\u201d, \u201cfreezer minus 19\u201d. Fridges 0\u20135\u00b0C, freezer \u221218\u00b0C or colder.</p>
    <form class="form" data-form="temp"><div class="frow"><label class="fld"><span>Where</span><select name="unit"><option>Kitchen fridge 1</option><option>Kitchen fridge 2</option><option>Freezer</option></select></label><label class="fld"><span>\u00b0C</span><input name="temp" inputmode="decimal" required placeholder="4.0"></label></div><button class="btn pri" type="submit">Save</button></form></section>
    <section class="card"><h2>Today</h2><div class="rows">${td.map(t => `<div class="row"><span class="grow">${esc(t.unit)}<br><span class="hint">${hhmm(t.ts)} \u00b7 ${esc(t.by)}</span></span><b class="num" style="${tempBad(t) ? 'color:var(--bad)' : ''}">${t.temp}\u00b0C</b><span class="tag ${tempBad(t) ? 'bad' : 'ok'}">${tempBad(t) ? 'Out of range' : 'OK'}</span></div>`).join('') || '<p class="empty">No checks yet today.</p>'}</div><p class="foot">${st.amDone ? 'Morning checks done.' : 'Morning checks due.'} ${st.pmDone ? 'Afternoon checks done.' : 'Afternoon checks due after 15:00.'}</p></section>`;
  } else {
    const ord = h.stock.filter(s => s.order);
    body = `<section class="card"><h2>Stock</h2><div class="rows">${h.stock.map(s => `<div class="row"><span class="grow"><b>${esc(s.name)}</b><br><span class="hint">${s.qty} ${esc(s.unit)} in stock \u00b7 keep ${s.par}</span></span>${s.qty < s.par ? '<span class="tag warn">Low</span>' : ''}<label class="check" style="min-height:38px"><input type="checkbox" data-act="orderTick" data-id="${s.id}" ${s.order ? 'checked' : ''}> Order</label></div>`).join('')}</div>
    <form class="frow" data-form="stock" style="align-items:end"><label class="fld"><span>Add an item</span><input name="name" required placeholder="e.g. Custard powder"></label><button class="btn" type="submit">Add</button></form></section>
    <section class="card"><h2>Order to send</h2><div class="rows">${ord.map(s => `<div class="row"><span>${esc(s.name)}</span><b class="num">${Math.max(1, s.par - s.qty)} ${esc(s.unit)}</b></div>`).join('') || '<p class="empty">Nothing ticked.</p>'}</div>
    ${h.orderSent ? `<p class="okbox">Order sent at ${hhmm(h.orderSent)} (demo: nothing actually sent).</p>` : `<button type="button" class="btn pri" data-act="sendOrder" ${ord.length ? '' : 'disabled'}>Send order</button>`}<p class="foot">In the live app the order is built from next week's menu and numbers, and invoices are checked against it.</p></section>`;
  }
  return `${homeHead(h, 'Cook \u00b7 ' + niceDate(Date.now()))}<div class="seg" role="group" aria-label="Kitchen sections">${tabs.map(([k, l]) => `<button type="button" data-act="sub" data-r="cook" data-s="${k}" aria-pressed="${sub === k}">${l}</button>`).join('')}</div>${body}`;
}

/* ----- sheets ----- */
function residentOptions(h, sel) {
  return '<option value="">Choose a resident\u2026</option>' + h.units.map(u => `<optgroup label="${esc(u.name)}">${h.residents.filter(r => r.unit === u.id).map(r => `<option value="${r.id}" ${r.id === sel ? 'selected' : ''}>${esc(resName(r))} (room ${r.room})</option>`).join('')}</optgroup>`).join('');
}
function aboutSheet() {
  openSheet(`${sheetHead('About this demo')}
  <p>This is a working demo of a care home app with <b>made-up residents, staff and figures</b>. Nothing here is real.</p>
  <p>Use the tabs at the bottom to switch between <b>Owner, Manager, Nurse, Carer and Cook</b>. In the real app each person logs in with a PIN and sees only their own screens.</p>
  <p>Press <b>Speak</b> on any screen and say what happened. It recognises residents' names, drinks in ml, turns, falls, weights, fridge temperatures and food waste. Everything you add is <b>saved on this phone</b>, and feeds the owner's dashboard straight away.</p>
  <p>Voice notes are recorded on the phone, then turned into text and written up by AI, so names and care words come out right. You check each one before it\u2019s saved. With no signal, the recording is kept and written up later.</p>
  <div class="notice">Works best in Safari on iPhone and Chrome on Android. If you opened this link inside WhatsApp or Facebook, open it in Safari or Chrome instead. The first time you press Speak, allow the microphone.</div>
  <p class="hint">To install it like an app: in Safari tap Share \u203a Add to Home Screen. In Chrome tap \u22ee \u203a Add to Home screen.</p>
  <div class="btns"><button type="button" class="btn pri" data-act="closeSheet">Start the demo</button><button type="button" class="btn" data-act="resetAsk">Reset demo data</button></div>`);
}
function fridaySheet() {
  const h = H(), st = stats(h), f = h.fig;
  const att = attentionItems(h, st).slice(0, 5);
  openSheet(`${sheetHead('Friday email preview', 'Sent to the owner every Friday at 4pm. Demo: not sent.')}
  <div class="writeup">Subject: ${esc(h.name)}, week ending ${niceDate(Date.now())}

Beds: ${st.n} of ${h.beds} filled (${money(st.lostFees)} a week empty)
Agency: ${f.agencyPct}% of care hours (target ${f.agencyTarget}%)
${h.noNurses ? '' : 'Nurse shifts by own staff: ' + st.nurseOwn + ' of ' + st.nurseTotal + '\n'}Food: ${money2(f.foodPRD)} per resident per day (target ${money2(f.foodTarget)})
Fees overdue: ${money(st.fees)}
Open actions: ${st.openActs.length}, ${st.late.length} late

Needs you:
${att.map(a => '\u2022 ' + a.html.replace(/<[^>]+>/g, '')).join('\n')}</div>`);
}
function reportSheet() {
  const h = H(), st = stats(h), f = h.fig, isCIW = h.reg === 'CIW';
  const aims = h.aims.map(a => { let d = a.done, t = a.total; if (a.key === 'plans') { d = st.plans; t = st.n; } if (a.key === 'family') { d = st.family; t = st.n; } return `\u2022 ${a.label}: ${d} of ${t}`; }).join('\n');
  openSheet(`${sheetHead(isCIW ? 'Responsible Individual monthly report' : 'Monthly quality report for CQC', 'Draft, built from the same data. Demo figures.')}
  <div class="writeup">${esc(h.name)}, ${esc(h.town)} \u00b7 ${MON[new Date().getMonth()]} ${new Date().getFullYear()}

1. Occupancy
${st.n} of ${h.beds} beds filled. ${h.enquiries.length} enquiries recorded, ${h.enquiries.filter(e => /assessment/i.test(e.status)).length} assessment booked.

2. Staffing
Agency ${f.agencyPct}% of care hours (target ${f.agencyTarget}%).${h.noNurses ? '' : ' Nurse shifts by own staff: ' + st.nurseOwn + ' of ' + st.nurseTotal + '.'} ${h.shifts.filter(s => s.cover === 'open').length} shifts uncovered in the next 7 days.

3. Care and safety
Care plans current: ${st.plans} of ${st.n}. Families involved in reviews: ${st.family} of ${st.n}.
Incidents this week: ${st.inc7.length} (${st.falls.length} falls), ${st.reviewed48} reviewed within 48 hours.
Residents with 5% weight loss: ${st.loss.length}${st.loss.length ? ' (GP referral and fortified diet in place)' : ''}.
Daily fluid targets met: ${f.fluidMetPct}%.

4. Progress on ${isCIW ? 'Areas for Improvement' : 'inspection actions'}
${aims}

5. Kitchen and environment
Food ${money2(f.foodPRD)} per resident per day, waste ${f.wastePct}%. Fridge and freezer checks: ${st.badTemps.length ? st.badTemps.length + ' out of range today' : 'in range today'}.

6. Open actions
${st.openActs.map(a => '\u2022 ' + a.title + ' (' + a.owner + ', due ' + dueText(a.due) + ')').join('\n')}</div>`);
}
function editFiguresSheet() {
  const h = H(), f = h.fig;
  const fld = (n, l, v, mode) => `<label class="fld"><span>${l}</span><input name="${n}" value="${esc(v)}" inputmode="${mode || 'decimal'}"></label>`;
  openSheet(`${sheetHead('Use your own numbers', 'Change any figure and the whole dashboard updates. Saved on this phone.')}
  <form class="form" data-form="figures">
    ${fld('name', 'Home name', h.name, 'text')}
    <div class="frow">${fld('town', 'Town', h.town, 'text')}${fld('beds', 'Beds', h.beds, 'numeric')}</div>
    <div class="frow">${fld('agencyPct', 'Agency % of care hours', f.agencyPct)}${fld('agencyTarget', 'Agency target %', f.agencyTarget)}</div>
    <div class="frow">${fld('foodPRD', 'Food \u00a3 per resident per day', f.foodPRD)}${fld('foodTarget', 'Food target \u00a3', f.foodTarget)}</div>
    <div class="frow">${fld('wastePct', 'Food waste %', f.wastePct)}${fld('weeklyFee', 'Average weekly fee \u00a3', f.weeklyFee)}</div>
    <div class="frow">${fld('fluidMetPct', 'Fluid targets met %', f.fluidMetPct)}${fld('overtimeHrs', 'Overtime hours this week', f.overtimeHrs)}</div>
    <p class="hint">Beds filled, fees overdue, open actions and nurse shifts come from the records themselves: add residents on the Carer screen, mark fees paid or fill shifts on the Manager screen.</p>
    <button class="btn pri" type="submit">Save</button>
  </form>`);
}
function addResidentSheet() {
  const h = H(), unit = S.unit[h.id] || h.units[0].id;
  openSheet(`${sheetHead('Add a resident', 'Use made-up details only.')}
  <form class="form" data-form="resident">
    <div class="frow"><label class="fld"><span>First name</span><input name="first" required autofocus></label><label class="fld"><span>Surname</span><input name="last" required></label></div>
    <div class="frow"><label class="fld"><span>Unit</span><select name="unit">${h.units.map(u => `<option value="${u.id}" ${u.id === unit ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label><label class="fld"><span>Room</span><input name="room" inputmode="numeric"></label></div>
    <div class="frow"><label class="fld"><span>Food texture</span><select name="texture">${['Regular', 'Soft & bite-sized (L6)', 'Minced & moist (L5)', 'Puréed (L4)'].map(t => `<option>${t}</option>`).join('')}</select></label><label class="fld"><span>Allergies</span><input name="allergies" placeholder="None"></label></div>
    <div class="frow"><label class="fld"><span>Fluid target (ml)</span><input name="fluid" inputmode="numeric" value="1500"></label><label class="fld"><span>Weight (kg)</span><input name="kg" inputmode="decimal"></label></div>
    <label class="check"><input type="checkbox" name="diabetic"> Diabetic</label>
    <label class="check"><input type="checkbox" name="assist"> Needs help to eat</label>
    <label class="check"><input type="checkbox" name="turns"> Needs turning every 2 hours</label>
    <button class="btn pri" type="submit">Add resident</button>
  </form>`);
}
function notesSheet(id) {
  const h = H(), r = resById(h, id);
  const ns = r.notes.slice().reverse();
  openSheet(`${sheetHead(resName(r), 'Room ' + r.room + ' \u00b7 ' + esc(unitName(h, r.unit)))}
  <div class="btns"><button type="button" class="btn pri" data-act="micFor" data-id="${r.id}">Speak a note</button><button type="button" class="btn" data-act="typeFor" data-id="${r.id}">Type a note</button></div>
  <div>${ns.map(n => `<div class="note-item"><span class="when">${whenText(n.ts)} \u00b7 ${esc(n.by)}${n.type && n.type !== 'note' ? ' \u00b7 ' + esc(TYPE_LABEL[n.type]) : ''}</span><span style="white-space:pre-wrap">${esc(n.text)}</span>${n.heard ? `<details><summary class="hint">What was said</summary><span class="hint">${esc(n.heard)}</span></details>` : ''}</div>`).join('') || '<p class="empty">No notes yet.</p>'}</div>`);
}
function concernSheet() {
  const h = H();
  openSheet(`${sheetHead('Report a fall or concern', 'The manager and nurse in charge are alerted straight away.')}
  <form class="form" data-form="concern">
    <label class="fld"><span>Resident</span><select name="resId" required>${residentOptions(h, '')}</select></label>
    <label class="fld"><span>What happened</span><select name="kind"><option value="fall">Fall</option><option value="skin">Skin or pressure area</option><option value="eating">Not eating or drinking</option><option value="unwell">Unwell</option><option value="behaviour">Behaviour</option><option value="safeguarding">Safeguarding</option><option value="other">Other concern</option></select></label>
    <label class="check"><input type="checkbox" name="injury"> Possible injury</label>
    <label class="fld"><span>Details</span><textarea name="text" id="concernText" required placeholder="What you saw and what you did"></textarea></label>
    <p class="hint">Quicker: close this and press <b>Speak</b>, then say what happened. Falls and concerns are picked up from the recording.</p>
    <div class="btns"><button class="btn pri" type="submit">Send report</button></div>
  </form>`);
}
function addActionSheet() {
  openSheet(`${sheetHead('Add a to-do')}
  <form class="form" data-form="action"><label class="fld"><span>What needs doing</span><input name="title" required autofocus></label>
  <label class="fld"><span>Detail</span><input name="detail"></label>
  <div class="frow"><label class="fld"><span>Who</span><select name="owner"><option>Manager</option><option>Nurse in charge</option><option>Admin</option><option>Cook</option><option>Maintenance</option><option>Owner</option></select></label><label class="fld"><span>Due in (days)</span><input name="days" inputmode="numeric" value="7"></label></div>
  <button class="btn pri" type="submit">Add</button></form>`);
}
function addEnquirySheet() {
  openSheet(`${sheetHead('Add an enquiry')}
  <form class="form" data-form="enquiry"><div class="frow"><label class="fld"><span>From</span><select name="from"><option>Family</option><option>Social worker</option><option>Hospital</option><option>Other</option></select></label><label class="fld"><span>Status</span><select name="status"><option>Waiting for a decision</option><option>Answered same day</option><option>Assessment booked</option></select></label></div>
  <label class="fld"><span>Who</span><input name="name" required placeholder="e.g. Discharge team, Nevill Hall"></label>
  <label class="fld"><span>What they need</span><input name="need" placeholder="e.g. Nursing dementia bed"></label>
  <button class="btn pri" type="submit">Add</button></form>`);
}

/* ----- voice: record on the phone, transcribe + write up on the server ----- */
const HAS_DOC = typeof document !== 'undefined';
// Where the voice service lives. Read from voice.json at start-up, so a new address only means updating that one file.
let VOICE_API = HAS_DOC && /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://localhost:3402' : '';
async function loadVoiceApi() {
  if (VOICE_API) return;
  try {
    const j = await (await fetch('voice.json?t=' + Date.now(), { cache: 'no-store' })).json();
    VOICE_API = String(j.api || '').trim().replace(/\/$/, '');
    try { localStorage.setItem('carehome-voice-api', VOICE_API); } catch (e) { }
  } catch (e) { try { VOICE_API = localStorage.getItem('carehome-voice-api') || ''; } catch (x) { } }
}
let mediaRec = null, recChunks = [], recStream = null, recStart = 0, recTimer = null, recCancelled = false, voiceCtx = {};
const canRecord = () => !!(HAS_DOC && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && root.MediaRecorder);
function setMic(on) { const b = document.getElementById('micBtn'); if (b) { b.classList.toggle('on', on); b.setAttribute('aria-label', on ? 'Stop recording' : 'Speak'); b.querySelector('span').textContent = on ? 'Done' : 'Speak'; } }
function voiceHints() {
  const h = H(), n = (h.residents[0] || {}).first || 'Margaret', n2 = (h.residents[1] || {}).first || 'Dai';
  return ({
    carer: [`${n} drank 200 ml of tea and ate most of her lunch`, `${n2} has been repositioned onto his left side`, `${n} had a fall in the bathroom, no injury`],
    nurse: [`${n} weighs 52.4 kilos`, `${n2} has a red area on her heel`, `${n} refused her evening tablets`],
    cook: ['Fridge 1 is 4 degrees and the freezer is minus 19', 'Waste 4 portions of fish pie left on plates'],
    manager: [`${n} had a fall in the lounge`, `${n2} is agitated this afternoon`],
    owner: [`${n} drank 2 cups of tea and was chatty after lunch`, `${n2} is unwell with a chesty cough`]
  })[S.role] || [];
}
function pickMime() {
  const c = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
  for (const m of c) { try { if (root.MediaRecorder.isTypeSupported && root.MediaRecorder.isTypeSupported(m)) return m; } catch (e) { } }
  return '';
}
const MIC_SVG = '<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function recordingSheet(starting) {
  const who = voiceCtx.resId ? resById(H(), voiceCtx.resId) : null;
  openSheet(`${sheetHead(starting ? 'Starting the microphone…' : 'Recording', who ? 'Note for ' + esc(resName(who)) : 'Say the resident’s name and what happened.')}
  <div class="listen"><div class="dot"${starting ? ' style="animation:none;opacity:.5"' : ''}>${MIC_SVG}</div>
  <div class="heard"><b id="recTime" class="num">0:00</b></div>
  <p class="hint">For example: “${esc(voiceHints()[0] || '')}”. You can mention several residents in one note.</p>
  <div class="btns"><button type="button" class="btn pri" data-act="stopRec" ${starting ? 'disabled' : ''}>Done</button><button type="button" class="btn" data-act="closeSheet">Cancel</button></div></div>`);
}
function workingSheet(title, sub) {
  openSheet(`${sheetHead(title, sub)}<div class="listen"><div class="dot" style="background:var(--acc)">${MIC_SVG}</div><p class="hint">Turning the recording into text, then writing up the note.</p></div>`);
}
function stopTracks() { if (recStream) { recStream.getTracks().forEach(t => t.stop()); recStream = null; } }
function stopRecording(cancel) {
  if (!mediaRec) { stopTracks(); return; }
  recCancelled = !!cancel;
  try { if (mediaRec.state !== 'inactive') mediaRec.stop(); } catch (e) { }
  if (cancel) { setMic(false); clearInterval(recTimer); }
}
async function startRecording(ctx) {
  voiceCtx = ctx || {};
  if (mediaRec) { stopRecording(false); return; }
  if (!canRecord()) { typeSheet('Recording isn’t available in this browser. Open the link in Safari (iPhone) or Chrome (Android) to speak, or type below.'); return; }
  recordingSheet(true);
  try {
    recStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
  } catch (e) {
    typeSheet(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'The microphone is blocked for this page. Allow it (iPhone: tap aA in the address bar › Website Settings › Microphone › Allow), then try again. Or type below.' : 'The microphone could not start (' + (e && e.name || 'error') + '). Type below instead.');
    return;
  }
  if ($sheetWrap.hidden) { stopTracks(); return; } // cancelled while the permission prompt was up
  recChunks = []; recCancelled = false;
  const mime = pickMime();
  try { mediaRec = mime ? new MediaRecorder(recStream, { mimeType: mime, audioBitsPerSecond: 48000 }) : new MediaRecorder(recStream); } catch (e) { mediaRec = new MediaRecorder(recStream); }
  const ctxNow = voiceCtx;
  mediaRec.ondataavailable = e => { if (e.data && e.data.size) recChunks.push(e.data); };
  mediaRec.onstop = () => {
    const type = (mediaRec && mediaRec.mimeType) || mime || 'audio/webm';
    const blob = new Blob(recChunks, { type }), secs = (Date.now() - recStart) / 1000;
    mediaRec = null; stopTracks(); setMic(false); clearInterval(recTimer);
    if (recCancelled) return;
    if (secs < 0.8 || blob.size < 800) { typeSheet('That was too short to hear anything. Try again, or type below.', ctxNow); return; }
    processRecording({ blob, type, ctx: ctxNow });
  };
  mediaRec.start(1000); recStart = Date.now(); setMic(true); recordingSheet(false);
  recTimer = setInterval(() => {
    const el = document.getElementById('recTime');
    const s = Math.floor((Date.now() - recStart) / 1000);
    if (el) el.textContent = Math.floor(s / 60) + ':' + pad(s % 60);
    if (s >= 180) stopRecording(false);
  }, 250);
}
function voiceContext(h) {
  return {
    home: h.name + ', ' + h.town, role: ROLE_PERSON[S.role] || 'Staff', units: h.units.map(u => u.name),
    residents: h.residents.map(r => ({ name: resName(r), room: r.room, unit: unitName(h, r.unit) })),
    staff: (h.carers || []).concat(['Sian', 'Tomasz', 'Priya', 'Rhian']),
    meds: [...new Set(h.residents.flatMap(r => r.meds.map(m => m.name)))]
  };
}
const blobToBase64 = blob => new Promise((ok, bad) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1] || ''); fr.onerror = () => bad(fr.error); fr.readAsDataURL(blob); });
const base64ToBlob = (b64, type) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type }); };
async function callVoice(payload) {
  if (!VOICE_API) { const e = new Error('No voice server is set up'); e.offline = true; throw e; }
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 75000);
  try {
    const r = await fetch(VOICE_API + '/api/voice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal });
    const j = await r.json().catch(() => ({ error: 'The voice server sent back something unexpected.' }));
    if (!r.ok) { const e = new Error(j.error || ('Voice server error ' + r.status)); e.status = r.status; throw e; }
    return j;
  } catch (e) { if (e.name === 'AbortError' || e instanceof TypeError) e.offline = true; throw e; }
  finally { clearTimeout(t); }
}
function wakeVoice() { if (VOICE_API) fetch(VOICE_API + '/health', { mode: 'cors' }).catch(() => { }); }

/* offline queue: recordings wait in IndexedDB until there is signal */
const Q = {
  db: null,
  open() { return this.db ? Promise.resolve(this.db) : new Promise((ok, bad) => { const r = indexedDB.open('care-demo-voice', 1); r.onupgradeneeded = () => r.result.createObjectStore('pending', { keyPath: 'id' }); r.onsuccess = () => { this.db = r.result; ok(this.db); }; r.onerror = () => bad(r.error); }); },
  async tx(mode, fn) { const db = await this.open(); return new Promise((ok, bad) => { const t = db.transaction('pending', mode), st = t.objectStore('pending'); const out = fn(st); t.oncomplete = () => ok(out && out.result !== undefined ? out.result : out); t.onerror = () => bad(t.error); }); },
  put(rec) { return this.tx('readwrite', st => st.put(rec)); },
  del(id) { return this.tx('readwrite', st => st.delete(id)); },
  async all() { const db = await this.open(); return new Promise((ok, bad) => { const r = db.transaction('pending').objectStore('pending').getAll(); r.onsuccess = () => ok(r.result || []); r.onerror = () => bad(r.error); }); }
};
async function refreshPending() { try { UI.pending = (await Q.all()).length; } catch (e) { UI.pending = 0; } }
async function queueRecording(blob, type, ctx) {
  const h = H(); const b64 = await blobToBase64(blob);
  await Q.put({ id: uid() + Date.now(), ts: Date.now(), b64, type, ctx: ctx || {}, homeId: h.id, role: S.role });
  await refreshPending();
}
async function flushQueue() {
  const all = (await Q.all()).sort((a, b) => a.ts - b.ts);
  if (!all.length) { UI.pending = 0; render(); return; }
  const rec = all[0];
  if (S.homes[rec.homeId] && S.homeId !== rec.homeId) { S.homeId = rec.homeId; S.lastHome = rec.homeId; }
  processRecording({ blob: base64ToBlob(rec.b64, rec.type), type: rec.type, ctx: rec.ctx, queuedId: rec.id, b64: rec.b64 });
}

async function processRecording(job) {
  const h = H();
  workingSheet('Writing it up…', 'Usually a few seconds.');
  const keep = async (why) => {
    if (!job.queuedId) await queueRecording(job.blob, job.type, job.ctx);
    openSheet(`${sheetHead('Recording kept')}<p>${esc(why)}</p><p>It’s saved on this phone and will be written up when you tap <b>Write up now</b> at the top of the screen, once there’s signal.</p><div class="btns"><button type="button" class="btn pri" data-act="closeSheet">OK</button></div>`);
    render();
  };
  if (HAS_DOC && navigator.onLine === false) { await keep('There’s no signal right now.'); return; }
  try {
    const audio = job.b64 || await blobToBase64(job.blob);
    const j = await callVoice({ audio, mime: job.type, context: voiceContext(h) });
    if (job.queuedId) { await Q.del(job.queuedId); await refreshPending(); }
    showResults(j, job.ctx);
  } catch (e) {
    if (e.offline || (e.status >= 500 && e.status !== 503)) await keep(e.offline ? 'The voice service couldn’t be reached.' : e.message);
    else typeSheet(e.message, job.ctx);
  }
}
async function writeUpText(text, ctx) {
  const h = H();
  if (!text.trim()) { toast('Type something first'); return; }
  if (VOICE_API && navigator.onLine !== false) {
    workingSheet('Writing it up…', '');
    try { const j = await callVoice({ text, context: voiceContext(h) }); showResults(j, ctx); return; }
    catch (e) { /* fall through to on-phone matching */ }
  }
  showResults({ transcript: text, entries: null, engine: 'local' }, ctx);
}
function typeSheet(msg, ctx) {
  voiceCtx = ctx || voiceCtx || {};
  const who = voiceCtx.resId ? resById(H(), voiceCtx.resId) : null;
  openSheet(`${sheetHead('Type it in', who ? 'Note for ' + esc(resName(who)) : '')}
  ${msg ? `<div class="notice">${esc(msg)}</div>` : ''}
  <label class="fld"><span>What happened</span><textarea id="typedText" autofocus placeholder="e.g. ${esc(voiceHints()[0] || '')}"></textarea></label>
  <div class="btns"><button type="button" class="btn pri" data-act="writeTyped">Write it up</button>${canRecord() ? '<button type="button" class="btn" data-act="recordAgain">Record instead</button>' : ''}<button type="button" class="btn" data-act="closeSheet">Cancel</button></div>`);
}

/* results: one or more entries to check */
const NEEDS_RES = t => !['temp', 'waste'].includes(t);
function matchResident(h, name) {
  if (!name) return '';
  const n = String(name).toLowerCase().trim();
  const exact = h.residents.find(r => resName(r).toLowerCase() === n);
  if (exact) return exact.id;
  const first = h.residents.filter(r => r.first.toLowerCase() === n.split(' ')[0]);
  return first.length === 1 ? first[0].id : '';
}
function showResults(j, ctx) {
  const h = H(); ctx = ctx || {};
  const text = (j.transcript || '').trim();
  let entries;
  if (Array.isArray(j.entries)) {
    entries = j.entries.map(e => ({ type: e.type || 'note', resId: matchResident(h, e.resident), ml: e.ml, kg: e.kg, temp: e.temp, appliance: e.appliance || 'Kitchen fridge 1', qty: e.qty, unit: e.unit || 'portions', item: e.item || '', reason: e.reason || 'Other', injury: !!e.injury, concern: e.concern || 'other', text, writeText: e.write_up || '' }));
  } else {
    entries = text ? splitLocal(text, h.residents).map(p => Object.assign(p, { text })) : [];
  }
  if (!entries.length && text) entries = [{ type: 'note', resId: '', text, writeText: '' }];
  entries.forEach(e => { if (ctx.resId && !e.resId && NEEDS_RES(e.type)) e.resId = ctx.resId; });
  UI.voice = { transcript: text, raw: j.raw || '', entries, unclear: j.unclear || '', engine: j.engine || 'local', ctx };
  renderResults();
}
function entryCard(e, i, h) {
  const opt = (v, l, cur) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(l)}</option>`;
  const f = (field, label, val, mode) => `<label class="fld"><span>${label}</span><input data-vi="${i}" data-f="${field}" inputmode="${mode || 'decimal'}" value="${esc(val == null ? '' : val)}"></label>`;
  let extra = '';
  if (e.type === 'fluids') extra = f('ml', 'Amount (ml)', e.ml, 'numeric');
  if (e.type === 'weight') extra = f('kg', 'Weight (kg)', e.kg);
  if (e.type === 'temp') extra = `<div class="frow"><label class="fld"><span>Where</span><select data-vi="${i}" data-f="appliance">${['Kitchen fridge 1', 'Kitchen fridge 2', 'Freezer'].map(o => opt(o, o, e.appliance)).join('')}</select></label>${f('temp', '°C', e.temp)}</div>`;
  if (e.type === 'waste') extra = `<div class="frow"><label class="fld"><span>Item</span><input data-vi="${i}" data-f="item" value="${esc(e.item || '')}"></label>${f('qty', 'Amount (' + esc(e.unit || 'portions') + ')', e.qty || 1)}</div>`;
  if (e.type === 'fall') extra = `<label class="check"><input type="checkbox" data-vi="${i}" data-f="injury" ${e.injury ? 'checked' : ''}> Possible injury</label>`;
  if (e.type === 'concern') extra = `<label class="fld"><span>Kind of concern</span><select data-vi="${i}" data-f="concern">${Object.entries(CONCERN_LABEL).map(([k, l]) => opt(k, l, e.concern || 'other')).join('')}</select></label>`;
  const r = e.resId ? resById(h, e.resId) : null;
  const preview = NEEDS_RES(e.type) ? '' : `<div class="writeup">${esc(writeUp(e, null))}</div>`;
  return `<div class="card" style="gap:10px;padding:12px">
    <div class="card-h"><b>${UI.voice.entries.length > 1 ? (i + 1) + ' · ' : ''}${esc(TYPE_LABEL[e.type] || 'Entry')}${r ? ' · ' + esc(resName(r)) : ''}</b>${UI.voice.entries.length > 1 ? `<button type="button" class="linkbtn" data-act="vRemove" data-i="${i}">Remove</button>` : ''}</div>
    <div class="frow"><label class="fld"><span>Type</span><select data-vi="${i}" data-f="type">${Object.entries(TYPE_LABEL).map(([k, l]) => opt(k, l, e.type)).join('')}</select></label>
    ${NEEDS_RES(e.type) ? `<label class="fld"><span>Resident</span><select data-vi="${i}" data-f="resId">${residentOptions(h, e.resId)}</select></label>` : '<span></span>'}</div>
    ${extra}
    ${NEEDS_RES(e.type) ? `<label class="fld"><span>Written up as</span><textarea data-vi="${i}" data-f="writeText" style="min-height:80px">${esc(e.writeText || tidy(e.text))}</textarea></label>` : preview}
  </div>`;
}
function renderResults() {
  const h = H(), v = UI.voice;
  const by = v.engine === 'scribe+claude' ? 'Transcribed and written up by AI from your recording.' : (v.engine === 'scribe' ? 'Transcribed from your recording.' : 'Matched on this phone.');
  openSheet(`${sheetHead('Check and save', by + ' Fix anything, then save.')}
  ${v.unclear ? `<div class="notice">${esc(v.unclear)}</div>` : ''}
  <form class="form" data-form="vresults">
    <details ${v.entries.length ? '' : 'open'}><summary>What was heard</summary>
      <label class="fld"><span class="sr">What was heard</span><textarea id="vText">${esc(v.transcript)}</textarea></label>
      <button type="button" class="btn sm" data-act="rewrite">Write up again from this text</button>
    </details>
    ${v.entries.map((e, i) => entryCard(e, i, h)).join('') || '<p class="empty">Nothing to file. Edit the text above and write it up again, or record again.</p>'}
    <div class="btns"><button type="submit" class="btn pri" ${v.entries.length ? '' : 'disabled'}>Save${v.entries.length > 1 ? ' all ' + v.entries.length : ''}</button><button type="button" class="btn" data-act="recordAgain">Record again</button><button type="button" class="btn" data-act="closeSheet">Cancel</button></div>
  </form>`);
}
function onVoiceField(e) {
  const el = e.target; if (!el.dataset || el.dataset.vi == null || !UI.voice) return;
  const ent = UI.voice.entries[Number(el.dataset.vi)], f = el.dataset.f;
  if (!ent) return;
  ent[f] = el.type === 'checkbox' ? el.checked : el.value;
  if (f === 'type' || (f === 'resId' && e.type === 'change')) {
    if (f === 'type' && NEEDS_RES(ent.type) && !ent.resId && UI.voice.ctx.resId) ent.resId = UI.voice.ctx.resId;
    const open = $sheet.querySelector('details') && $sheet.querySelector('details').open;
    renderResults(); if (open) $sheet.querySelector('details').open = true;
  }
}
function saveResults() {
  const h = H(), v = UI.voice; if (!v) return;
  for (const e of v.entries) {
    if (NEEDS_RES(e.type) && !e.resId) { toast('Choose the resident for each entry'); return; }
    if (e.type === 'temp' && (e.temp === '' || e.temp == null || isNaN(Number(e.temp)))) { toast('Add the temperature'); return; }
    if (e.type === 'fluids' && !(Number(e.ml) > 0)) { toast('Add how much was drunk (ml)'); return; }
  }
  const msgs = v.entries.map(e => {
    const p = Object.assign({}, e, { ml: Number(e.ml) || 0, kg: Number(e.kg) || 0, temp: e.temp === '' || e.temp == null ? null : Number(e.temp), qty: Number(e.qty) || 1, text: v.transcript });
    return fileEntry(h, p, ROLE_PERSON[S.role] || 'Staff');
  }).filter(Boolean);
  UI.voice = null; save(); closeSheet(); render();
  toast(msgs.length > 1 ? msgs.length + ' entries saved' : (msgs[0] || 'Saved'));
  if (UI.pending) setTimeout(() => toast(UI.pending + ' more recording' + (UI.pending > 1 ? 's' : '') + ' waiting'), 2800);
}

/* ----- events ----- */
function setRole(role) { S.role = role; if (role !== 'owner' && S.homeId === 'all') S.homeId = S.lastHome; save(); render(); window.scrollTo(0, 0); }
function onClick(e) {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act, h = S.homeId === 'all' ? null : H();
  if (el.tagName === 'INPUT' && act !== 'orderTick') return;
  switch (act) {
    case 'role': setRole(el.dataset.role); break;
    case 'about': aboutSheet(); break;
    case 'closeSheet': closeSheet(); break;
    case 'mic': if (mediaRec) stopRecording(false); else startRecording({}); break;
    case 'stopRec': stopRecording(false); break;
    case 'micFor': closeSheet(); startRecording({ resId: el.dataset.id }); break;
    case 'typeFor': typeSheet('', { resId: el.dataset.id }); break;
    case 'recordAgain': { const ctx = (UI.voice && UI.voice.ctx) || voiceCtx || {}; UI.voice = null; closeSheet(); startRecording(ctx); break; }
    case 'writeTyped': writeUpText(document.getElementById('typedText').value, voiceCtx); break;
    case 'rewrite': writeUpText(document.getElementById('vText').value, UI.voice ? UI.voice.ctx : {}); break;
    case 'vRemove': UI.voice.entries.splice(Number(el.dataset.i), 1); renderResults(); break;
    case 'flushQueue': flushQueue(); break;
    case 'sub': UI.sub[el.dataset.r] = el.dataset.s; render(); break;
    case 'unit': S.unit[H().id] = el.dataset.u; save(); render(); break;
    case 'round': UI.round = el.dataset.rd; render(); break;
    case 'openHome': S.homeId = el.dataset.home; S.lastHome = el.dataset.home; save(); render(); window.scrollTo(0, 0); break;
    case 'gotoActions': S.role = 'manager'; UI.sub.manager = 'today'; save(); render(); window.scrollTo(0, 0); break;
    case 'editFigures': editFiguresSheet(); break;
    case 'report': reportSheet(); break;
    case 'friday': fridaySheet(); break;
    case 'toggleInv': UI.openInv = !UI.openInv; render(); break;
    case 'inv': { const i = h.invoices.find(x => x.id === el.dataset.id); i.status = el.dataset.st; if (i.status === 'queried') addAction(h, 'Supplier query: ' + i.supplier, i.rise || 'Invoice queried by owner.', 'Admin', 2); save(); render(); toast(i.status === 'approved' ? 'Approved' : 'Queried, admin asked to chase'); break; }
    case 'drink': { const r = resById(h, el.dataset.id), ml = Number(el.dataset.ml); r.fluids.push({ ts: Date.now(), ml, by: 'Carer' }); save(); render(); toast(`+${ml} ml for ${r.first} \u00b7 ${fluidToday(r)} ml today`); break; }
    case 'turn': { const r = resById(h, el.dataset.id); r.turns.push({ ts: Date.now(), by: 'Carer' }); save(); render(); toast(r.first + ' turned at ' + hhmm(Date.now())); break; }
    case 'notes': notesSheet(el.dataset.id); break;
    case 'concern': concernSheet(); break;
    case 'addResident': addResidentSheet(); break;
    case 'addAction': addActionSheet(); break;
    case 'addEnquiry': addEnquirySheet(); break;
    case 'doneAction': { const a = h.actions.find(x => x.id === el.dataset.id); a.done = true; a.doneTs = Date.now(); const inc = h.incidents.find(i => i.actionId === a.id); if (inc) { inc.reviewed = true; inc.reviewedTs = Date.now(); } save(); render(); toast('Done'); break; }
    case 'textBank': { const s = h.shifts.find(x => x.id === el.dataset.id); s.texted = Date.now(); save(); render(); toast('Demo: text would go to 4 bank staff'); break; }
    case 'cover': { const s = h.shifts.find(x => x.id === el.dataset.id); s.cover = el.dataset.c; s.who = s.cover === 'own' ? (s.role === 'Nurse' ? 'Bank nurse (own)' : 'Bank carer (own)') : 'Agency'; save(); render(); toast(s.cover === 'own' ? 'Covered by own staff' : 'Agency booked'); break; }
    case 'review': { const i = h.incidents.find(x => x.id === el.dataset.id); i.reviewed = true; i.reviewedTs = Date.now(); const a = h.actions.find(x => x.id === i.actionId); if (a) a.done = true; save(); render(); toast('Marked reviewed'); break; }
    case 'enq': { const q = h.enquiries.find(x => x.id === el.dataset.id); q.status = el.dataset.st; save(); render(); break; }
    case 'feePaid': { const fe = h.fees.find(x => x.id === el.dataset.id); fe.paid = true; save(); render(); toast('Marked paid'); break; }
    case 'mar': { const rd = UI.round || currentRound(), key = today() + ':' + rd; h.mar[key] = h.mar[key] || {}; const v = el.dataset.v; if (v) h.mar[key][el.dataset.k] = v; else delete h.mar[key][el.dataset.k];
      if (v === 'Refused') { const [rid, med] = el.dataset.k.split('|'); const r = resById(h, rid); addAction(h, 'Medicine refused: ' + resName(r), med + ' refused at ' + ROUNDS.find(x => x.id === rd).name.toLowerCase() + ' round. Offer again and record.', 'Nurse in charge', 0, 'New'); }
      save(); render(); break; }
    case 'orderTick': { const s = h.stock.find(x => x.id === el.dataset.id); s.order = el.checked; h.orderSent = null; save(); render(); break; }
    case 'sendOrder': h.orderSent = Date.now(); save(); render(); toast('Demo: order not really sent'); break;
    case 'resetAsk': openSheet(`${sheetHead('Reset demo data?')}<p>This clears everything added on this phone and puts the made-up data back.</p><div class="btns"><button type="button" class="btn bad" data-act="resetYes">Reset</button><button type="button" class="btn" data-act="closeSheet">Keep my changes</button></div>`); break;
    case 'resetYes': S = seedAll(); S.welcomed = true; save(); closeSheet(); render(); toast('Demo data reset'); break;
  }
}
function onSubmit(e) {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  const fd = new FormData(form), g = k => (fd.get(k) || '').toString().trim(), h = H();
  switch (form.dataset.form) {
    case 'vresults': saveResults(); break;
    case 'weight': { const kg = parseFloat(g('kg')); if (!kg) return; const r = resById(h, form.dataset.id); const p = { type: 'weight', kg, resId: r.id, text: r.first + ' weighed ' + kg + ' kg.' }; fileEntry(h, p, 'Nurse'); save(); render(); toast(weightLoss(r) >= 5 ? 'Saved \u00b7 5% loss alert raised' : 'Weight saved'); break; }
    case 'review': { const r = resById(h, form.dataset.id); r.planCurrent = true; if (fd.get('family')) r.familyInvolved = true; r.notes.push({ id: uid(), ts: Date.now(), by: 'Nurse', text: 'Care plan reviewed and signed off' + (fd.get('family') ? ', with family taking part.' : '.'), heard: '', type: 'note' }); save(); render(); toast('Review signed off'); break; }
    case 'waste': h.waste.push({ id: uid(), ts: Date.now(), item: g('item'), qty: parseFloat(g('qty')) || 1, unit: g('unit'), reason: g('reason') }); save(); render(); toast('Waste logged'); break;
    case 'temp': { const t = parseFloat(g('temp')); if (isNaN(t)) return; fileEntry(h, { type: 'temp', appliance: g('unit'), temp: t }, 'Cook'); save(); render(); toast(tempBad({ unit: g('unit'), temp: t }) ? 'Out of range \u00b7 manager alerted' : 'Temperature saved'); break; }
    case 'stock': h.stock.push({ id: uid(), name: g('name'), unit: 'units', qty: 0, par: 1, order: true }); save(); render(); break;
    case 'figures': {
      const num = (k, d) => { const v = parseFloat(g(k)); return isNaN(v) ? d : v; };
      h.name = g('name') || h.name; h.town = g('town') || h.town; h.beds = Math.max(h.residents.length, Math.round(num('beds', h.beds)));
      const f = h.fig; const oldAg = f.agencyPct;
      ['agencyPct', 'agencyTarget', 'foodPRD', 'foodTarget', 'wastePct', 'weeklyFee', 'fluidMetPct', 'overtimeHrs'].forEach(k => { f[k] = num(k, f[k]); });
      if (f.agencyPct !== oldAg) f.agencyTrend[f.agencyTrend.length - 1] = f.agencyPct;
      save(); closeSheet(); render(); toast('Dashboard updated'); break;
    }
    case 'resident': {
      const u = g('unit'); const room = parseInt(g('room'), 10) || (Math.max(0, ...h.residents.map(r => r.room)) + 1);
      const kg = parseFloat(g('kg'));
      const r = { id: 'r' + uid(), first: g('first'), last: g('last'), room, unit: u, texture: g('texture'), diabetic: !!fd.get('diabetic'), allergies: g('allergies').replace(/^none$/i, ''), assist: !!fd.get('assist'), fluidTarget: parseInt(g('fluid'), 10) || 1500, needsTurns: !!fd.get('turns'), planCurrent: false, familyInvolved: false, weights: kg ? [{ ts: Date.now(), kg }] : [], meds: [{ name: 'Paracetamol 1g', rounds: ['am', 'tea'] }], notes: [], fluids: [], turns: [], admitted: Date.now() };
      h.residents.push(r); if (h.residents.length > h.beds) h.beds = h.residents.length;
      addAction(h, 'Write care plan: ' + resName(r), 'New admission. First review within 7 days.', 'Nurse in charge', 7);
      S.unit[h.id] = u; save(); closeSheet(); render(); toast(r.first + ' added \u00b7 beds now ' + h.residents.length + ' / ' + h.beds); break;
    }
    case 'concern': {
      const kind = g('kind'), resId = g('resId');
      if (!resId) { toast('Choose the resident'); return; }
      const p = { type: kind === 'fall' ? 'fall' : 'concern', concern: kind, resId, injury: !!fd.get('injury'), text: g('text') };
      const msg = fileEntry(h, p, ROLE_PERSON[S.role] || 'Staff'); save(); closeSheet(); render(); toast(msg); break;
    }
    case 'action': addAction(h, g('title'), g('detail'), g('owner'), parseInt(g('days'), 10) || 7); save(); closeSheet(); render(); toast('Added'); break;
    case 'enquiry': h.enquiries.push({ id: uid(), ts: Date.now(), from: g('from'), name: g('name'), need: g('need'), status: g('status') }); save(); closeSheet(); render(); toast('Enquiry added'); break;
  }
}
function init() {
  $view = document.getElementById('view'); $sheetWrap = document.getElementById('sheetWrap'); $sheet = document.getElementById('sheet'); $toast = document.getElementById('toast');
  S = load();
  if (!S) { S = seedAll(); save(); }
  document.addEventListener('click', onClick);
  document.addEventListener('change', e => { if (e.target.matches('[data-act="orderTick"]')) return; onVoiceField(e); });
  document.addEventListener('input', e => { if (e.target.tagName !== 'SELECT') onVoiceField(e); });
  window.addEventListener('online', () => { if (UI.pending) toast('Signal back · tap Write up now'); });
  loadVoiceApi().then(wakeVoice);
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) root.__careTest = { processRecording, showResults, state: () => S, ui: UI };
  refreshPending().then(() => { if (UI.pending) render(); });
  document.addEventListener('submit', onSubmit);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$sheetWrap.hidden) closeSheet();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.tile[data-act]')) { e.preventDefault(); e.target.click(); }
  });
  document.getElementById('homeSelect').addEventListener('change', e => { S.homeId = e.target.value; if (S.homeId !== 'all') S.lastHome = S.homeId; save(); render(); window.scrollTo(0, 0); });
  render();
  if (!S.welcomed) { S.welcomed = true; save(); aboutSheet(); }
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { splitLocal, parseSpeech, normalise, wordsToDigits, writeUp, tidy, seedAll, stats, findResident };
} else {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
}
})(typeof window !== 'undefined' ? window : globalThis);

// Voice server for the care home demo. No dependencies (Node 18+).
//
// POST /api/voice  { audio: <base64>, mime, context: { home, role, residents:[{name,room,unit}], meds:[...], staff:[...] } }
//   1. ElevenLabs Scribe transcribes the recording, biased toward the home's own names and words (keyterms).
//   2. Claude reads the transcript and returns the entries to file (who, what, how much) plus a proper write-up.
//      Without ANTHROPIC_API_KEY it returns the transcript only and the app falls back to its own matching.
// GET /health  -> {ok, transcribe, claude}   (the app calls this on open to wake the server)
//
// Env: ELEVENLABS_API_KEY (required), ANTHROPIC_API_KEY (optional), ALLOWED_ORIGINS (comma list),
//      CLAUDE_MODEL (default claude-sonnet-5-5), DAILY_CAP (default 400), PORT.

const http = require('http');

const PORT = process.env.PORT || 3402;
const EL_KEY = process.env.ELEVENLABS_API_KEY || '';
const AN_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
const DAILY_CAP = Number(process.env.DAILY_CAP || 400);
const PER_IP_HOUR = Number(process.env.PER_IP_HOUR || 40);
const MAX_AUDIO_BYTES = 4 * 1024 * 1024; // ~3-4 minutes of compressed speech
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://neiltheaussie.github.io,http://localhost:3401,http://127.0.0.1:3401').split(',').map(s => s.trim()).filter(Boolean);

/* ---------- spend guards (public endpoint) ---------- */
let day = new Date().toISOString().slice(0, 10), dayCount = 0;
const ipHits = new Map();
function allow(ip) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; dayCount = 0; ipHits.clear(); }
  if (dayCount >= DAILY_CAP) return 'The demo has reached today’s voice limit. Try again tomorrow, or type the note.';
  const now = Date.now(), list = (ipHits.get(ip) || []).filter(t => now - t < 3600e3);
  if (list.length >= PER_IP_HOUR) return 'Too many voice notes from this phone in the last hour. Try again shortly.';
  list.push(now); ipHits.set(ip, list); dayCount++;
  return '';
}

/* ---------- ElevenLabs Scribe ---------- */
const CARE_TERMS = ['repositioned', 'fluids', 'millilitres', 'fortified', 'thickener', 'puréed', 'incontinence pad', 'pressure area', 'sacrum', 'commode', 'hoist', 'sensor mat', 'paracetamol', 'Donepezil', 'Memantine', 'Metformin', 'Sertraline', 'Lansoprazole', 'Amlodipine', 'Furosemide', 'Calcichew', 'Senna', 'Cedars', 'Orchards', 'fridge', 'freezer'];
function keyterms(ctx) {
  const set = new Set();
  const add = t => { t = String(t || '').replace(/[<>{}\[\]\\]/g, '').trim(); if (t && t.length <= 50 && t.split(/\s+/).length <= 5) set.add(t); };
  (ctx.residents || []).forEach(r => { add(r.name); add(String(r.name).split(' ')[0]); });
  (ctx.units || []).forEach(add);
  (ctx.staff || []).forEach(add);
  (ctx.meds || []).forEach(m => add(String(m).split(' ')[0]));
  CARE_TERMS.forEach(add);
  return [...set].slice(0, 100); // over 100 terms triggers a 20s minimum charge per note
}
async function transcribe(buf, mime, ctx) {
  const fd = new FormData();
  const ext = /mp4|m4a|aac/.test(mime) ? 'm4a' : (/ogg/.test(mime) ? 'ogg' : (/wav/.test(mime) ? 'wav' : 'webm'));
  fd.append('file', new Blob([buf], { type: mime || 'audio/webm' }), 'note.' + ext);
  fd.append('model_id', 'scribe_v2');
  fd.append('language_code', 'en');
  fd.append('tag_audio_events', 'false');
  fd.append('no_verbatim', 'true');
  for (const k of keyterms(ctx)) fd.append('keyterms', k);
  const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': EL_KEY }, body: fd });
  const txt = await r.text();
  if (!r.ok) throw new Error('Transcription failed (' + r.status + '): ' + txt.slice(0, 300));
  const j = JSON.parse(txt);
  return { text: (j.text || '').trim(), seconds: j.audio_duration_secs || null };
}

/* ---------- Claude: entries + write-up ---------- */
const ENTRY_TOOL = {
  name: 'file_entries',
  description: 'File what the staff member said as one or more records in the care home system.',
  input_schema: {
    type: 'object',
    properties: {
      transcript: { type: 'string', description: 'The transcript with obvious mishearings of resident names, medicines and care words corrected to the lists given. Do not change meaning.' },
      entries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['note', 'fluids', 'turned', 'fall', 'concern', 'weight', 'temp', 'waste'] },
            resident: { type: ['string', 'null'], description: 'Exact full name from the residents list, or null if none was clearly meant. Never guess between two residents.' },
            ml: { type: ['number', 'null'], description: 'fluids only: millilitres drunk. A cup or mug of tea = 200, a glass = 200, a beaker = 150, half a cup = 100.' },
            kg: { type: ['number', 'null'] },
            temp: { type: ['number', 'null'], description: 'temp only: degrees C, negative for freezers' },
            appliance: { type: ['string', 'null'], enum: ['Kitchen fridge 1', 'Kitchen fridge 2', 'Freezer', null] },
            qty: { type: ['number', 'null'] }, unit: { type: ['string', 'null'], enum: ['portions', 'kg', 'loaves', null] },
            item: { type: ['string', 'null'] }, reason: { type: ['string', 'null'], enum: ['Left on plates', 'Cooked too much', 'Out of date', 'Other', null] },
            injury: { type: ['boolean', 'null'], description: 'fall only: true if any sign of injury was mentioned' },
            concern: { type: ['string', 'null'], enum: ['medicine', 'skin', 'eating', 'unwell', 'behaviour', 'safeguarding', 'other', null] },
            write_up: { type: 'string', description: 'The record as it should appear in the care notes: clear, factual, third person, past tense, UK English, 1-3 sentences. Only what was said, nothing invented. No resident name at the start (the system adds it).' }
          },
          required: ['type', 'resident', 'write_up']
        }
      },
      unclear: { type: ['string', 'null'], description: 'If something important is missing or ambiguous (which resident, how much), say what to check, in one short sentence. Else null.' }
    },
    required: ['transcript', 'entries']
  }
};
function claudePrompt(text, ctx) {
  const res = (ctx.residents || []).map(r => `${r.name} (room ${r.room}, ${r.unit})`).join('; ');
  return `You file spoken notes for a UK care home. The speaker is a ${ctx.role || 'member of staff'} at ${ctx.home || 'the home'}.

Residents: ${res || 'none listed'}
Staff: ${(ctx.staff || []).join(', ') || 'not listed'}
Medicines in use: ${(ctx.meds || []).join(', ') || 'not listed'}

Split the note into entries:
- fluids: something was drunk (one entry per resident; ml as a number)
- turned: resident was repositioned / turned
- fall: resident fell or was found on the floor
- concern: skin or pressure area, not eating or drinking, unwell, behaviour, safeguarding, refused medicine
- weight: resident was weighed (kg)
- temp: a fridge or freezer temperature (no resident)
- waste: food thrown away (no resident)
- note: anything else about a resident (mood, meals, activities, visits, personal care)
A sentence that has a drink AND other news gives a fluids entry plus a note entry. Do not create an entry for a resident who is only mentioned in passing.
Speech recognition mishears names: match sound-alikes to the residents list (e.g. "Glennis" -> Glenys) but only when one resident clearly fits.

The note:
"""${text}"""`;
}
async function interpret(text, ctx) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': AN_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, tools: [ENTRY_TOOL], tool_choice: { type: 'tool', name: 'file_entries' }, messages: [{ role: 'user', content: claudePrompt(text, ctx) }] })
  });
  const txt = await r.text();
  if (!r.ok) throw new Error('Write-up failed (' + r.status + '): ' + txt.slice(0, 300));
  const j = JSON.parse(txt);
  const use = (j.content || []).find(c => c.type === 'tool_use');
  if (!use) throw new Error('Write-up returned no entries');
  return use.input;
}

/* ---------- http ---------- */
function send(res, code, obj, origin) {
  const h = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (origin && ORIGINS.includes(origin)) { h['Access-Control-Allow-Origin'] = origin; h['Vary'] = 'Origin'; }
  res.writeHead(code, h); res.end(JSON.stringify(obj));
}
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const path = req.url.split('?')[0];
  if (req.method === 'OPTIONS') {
    const h = { 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' };
    if (ORIGINS.includes(origin)) { h['Access-Control-Allow-Origin'] = origin; h['Vary'] = 'Origin'; }
    res.writeHead(204, h); return res.end();
  }
  if (req.method === 'GET' && (path === '/health' || path === '/')) return send(res, 200, { ok: true, transcribe: !!EL_KEY, claude: !!AN_KEY, model: AN_KEY ? MODEL : null }, origin);
  if (req.method !== 'POST' || path !== '/api/voice') return send(res, 404, { error: 'Not found' }, origin);
  if (origin && !ORIGINS.includes(origin)) return send(res, 403, { error: 'Not allowed from this site' }, origin);
  if (!EL_KEY) return send(res, 503, { error: 'Voice server has no transcription key' }, origin);

  let size = 0; const chunks = [];
  req.on('data', c => { size += c.length; if (size > MAX_AUDIO_BYTES * 1.4 + 200000) { req.destroy(); } else chunks.push(c); });
  req.on('end', async () => {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const block = allow(ip);
    if (block) return send(res, 429, { error: block }, origin);
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { return send(res, 400, { error: 'Bad request' }, origin); }
    const ctx = body.context || {};
    const t0 = Date.now();
    const typed = typeof body.text === 'string' ? body.text.trim().slice(0, 4000) : '';
    const buf = typed ? null : Buffer.from(String(body.audio || ''), 'base64');
    if (!typed) {
      if (buf.length < 800) return send(res, 400, { error: 'The recording was empty. Hold the phone closer and try again.' }, origin);
      if (buf.length > MAX_AUDIO_BYTES) return send(res, 413, { error: 'That recording is too long. Keep notes under 3 minutes.' }, origin);
    }
    try {
      const tr = typed ? { text: typed } : await transcribe(buf, String(body.mime || ''), ctx);
      if (!tr.text) return send(res, 200, { transcript: '', entries: [], unclear: 'Nothing was heard on the recording.', engine: 'scribe' }, origin);
      if (!AN_KEY) return send(res, 200, { transcript: tr.text, entries: null, engine: 'scribe', ms: Date.now() - t0 }, origin);
      const out = await interpret(tr.text, ctx);
      send(res, 200, { transcript: out.transcript || tr.text, raw: tr.text, entries: out.entries || [], unclear: out.unclear || null, engine: 'scribe+claude', ms: Date.now() - t0 }, origin);
    } catch (e) {
      console.error(new Date().toISOString(), e.message);
      send(res, 502, { error: 'The voice service had a problem. Your recording is kept; try again.', detail: e.message.slice(0, 200) }, origin);
    }
  });
});
server.listen(PORT, () => console.log(`Voice server on :${PORT} · transcribe=${!!EL_KEY} claude=${!!AN_KEY} · origins=${ORIGINS.join(' ')}`));

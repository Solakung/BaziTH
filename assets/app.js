// หน้าผังดวง: รับวันเวลาเกิด คำนวณด้วย src/bazi-core.js แล้วแสดงผัง ผลวิเคราะห์ วัยจร และปีจร
// ทุกอย่างคำนวณในเบราว์เซอร์ ไม่มีการส่งข้อมูลออก
import * as B from '../src/bazi-core.js';
import * as T from './terms.js';

const TZ_TH = 'Asia/Bangkok';
const VERSION = '0.1.0';
const ORDER = ['hour', 'day', 'month', 'year']; // เรียงแบบตำราจีน ยามซ้าย ปีขวา
const PILLAR = { year: 'ปี', month: 'เดือน', day: 'วัน', hour: 'ยาม' };
const POS = { year: 0, month: 1, day: 2, hour: 3 };
const LEVEL = { veryStrong: 'แข็งมาก', strong: 'แข็ง', balanced: 'ค่อนข้างสมดุล', weak: 'อ่อน', veryWeak: 'อ่อนมาก' };
const LEVEL_SHORT = { veryStrong: 'แข็งมาก', strong: 'แข็ง', balanced: 'สมดุล', weak: 'อ่อน', veryWeak: 'อ่อนมาก' };
const GLOSS_HINT = 'แตะอักษรหรือชื่อเสาเพื่อดูความหมาย';
const ORDER_NOTE = 'เรียงแบบตำราจีน ยามอยู่ซ้าย ปีอยู่ขวา เหมือนลำดับวัน เดือน ปี ในภาษาไทย';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const wide = matchMedia('(min-width: 960px)');

// ───────── ตัวช่วยแสดงผล ─────────
const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const zh = (s) => `<span class="zh" lang="zh-Hans">${s}</span>`;
const elOfChar = (c) => { const s = B.STEMS.indexOf(c); return s >= 0 ? s >> 1 : B.BRANCH_ELEMENT[B.BRANCHES.indexOf(c)]; };
const ch = (c) => `<span class="zh el-${elOfChar(c)}" lang="zh-Hans">${c}</span>`;
const pair = (name) => `<span class="pair">${[...name].map(ch).join('')}</span>`;
const elWord = (e) => `<span class="el-${e}">${T.ELEMENT[e].th}</span>`;
const godOf = (dm, s) => B.TEN_GODS[B.tenGod(dm, s)];
const signed = (x) => (x >= 0 ? `+${x.toFixed(1)}` : `−${Math.abs(x).toFixed(1)}`);

// ───────── วันเวลา ─────────
/** ปี พ.ศ. ของวันที่ ค.ศ. — ก่อน ค.ศ. 1941 ไทยขึ้นปีใหม่ 1 เมษายน (ตำราบทที่ 7.6) */
const beYear = (y, m) => (y < 1941 && m <= 3 ? y + 542 : y + 543);
const thDate = (t, short = false) => `${t.d} ${(short ? T.MONTHS_SHORT : T.MONTHS)[t.m - 1]} ${beYear(t.y, t.m)}`;
const thMonthYear = (t) => `${T.MONTHS_SHORT[t.m - 1]} ${beYear(t.y, t.m)}`;
const hhmm = (t) => `${pad(t.h)}:${pad(t.mi)}`;
const weekday = (t) => T.WEEKDAYS[new Date(Date.UTC(t.y, t.m - 1, t.d)).getUTCDay()];
const stamp = (t) => Date.UTC(t.y, t.m - 1, t.d, t.h ?? 0, t.mi ?? 0);

const formatters = new Map();
/** เวลานาฬิกาของเขตเวลา timeZone ณ เวลา ms */
function wall(ms, timeZone) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    formatters.set(timeZone, f);
  }
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute };
}
const jdWall = (jd, timeZone) => wall(B.jdToMs(jd), timeZone);
const nowWall = () => wall(Date.now(), TZ_TH);
function nowInput() {
  const t = nowWall();
  return { year: t.y, month: t.m, day: t.d, hour: t.h, minute: t.mi, timeZone: TZ_TH };
}
/** เลื่อนเวลาเกิดไป minutes นาที (คิดในเขตเวลาเดิม) ใช้หาผังทางเลือกเมื่อเกิดใกล้รอยต่อ */
function shiftInput(input, minutes) {
  const ms = B.zonedToUtcMs(input.year, input.month, input.day, input.hour, input.minute, input.timeZone) + minutes * 60000;
  const t = wall(ms, input.timeZone);
  return { ...input, year: t.y, month: t.m, day: t.d, hour: t.h, minute: t.mi };
}

// ───────── ฟอร์ม ─────────
const form = $('birth');
const placeSel = $('f-place');
const PLACES = [];

function fillSelect(sel, items, placeholder) {
  sel.innerHTML = (placeholder ? `<option value="">${placeholder}</option>` : '')
    + items.map(([v, label]) => `<option value="${v}">${label}</option>`).join('');
}

function setupForm() {
  fillSelect($('f-day'), Array.from({ length: 31 }, (_, i) => [i + 1, i + 1]), 'วันที่');
  fillSelect($('f-month'), T.MONTHS.map((m, i) => [i + 1, m]), 'เดือน');
  fillSelect($('f-hour'), Array.from({ length: 24 }, (_, i) => [i, pad(i)]), 'ชั่วโมง');
  fillSelect($('f-minute'), Array.from({ length: 60 }, (_, i) => [i, pad(i)]));

  placeSel.innerHTML = '<option value="">ไม่ระบุ (ใช้เวลานาฬิกา)</option>'
    + T.PROVINCES.map(([region, list]) => `<optgroup label="${region}">${list.map(([name, lon]) => {
      PLACES.push([name, lon]);
      return `<option value="${PLACES.length - 1}">${name}</option>`;
    }).join('')}</optgroup>`).join('')
    + '<optgroup label="นอกประเทศไทย"><option value="abroad">ต่างประเทศ</option></optgroup>';

  let zones = T.TIMEZONES_FALLBACK;
  try { if (typeof Intl.supportedValuesOf === 'function') zones = Intl.supportedValuesOf('timeZone'); } catch { /* ใช้รายการสำรอง */ }
  if (!zones.includes(TZ_TH)) zones = [TZ_TH, ...zones];
  fillSelect($('f-tz'), zones.map((z) => [z, z.replace(/_/g, ' ')]));
  $('f-tz').value = TZ_TH;

  $('f-unknown').addEventListener('change', syncForm);
  placeSel.addEventListener('change', syncForm);
  form.addEventListener('input', () => { $('form-error').textContent = ''; });
  form.addEventListener('submit', onSubmit);
  syncForm();
}

function syncForm() {
  const unknown = $('f-unknown').checked;
  const abroad = placeSel.value === 'abroad';
  $('f-hour').disabled = unknown;
  $('f-minute').disabled = unknown;
  $('abroad').hidden = !abroad;
  $('place-hint').textContent = unknown
    ? 'ไม่ทราบเวลาเกิดจึงไม่ใช้เวลาสุริยะจริง สถานที่เกิดยังใช้หาเขตเวลา'
    : abroad
      ? 'เลือกเขตเวลาของที่เกิด ถ้าใส่ลองจิจูดด้วยจะคิดเวลาสุริยะจริงให้'
      : 'เลือกจังหวัดเพื่อคิดเวลาสุริยะจริง ยามจะตรงกับตำแหน่งดวงอาทิตย์ ณ ที่เกิด';
}

const arabic = (s) => s.replace(/[๐-๙]/g, (d) => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d)));

function readForm() {
  const day = +$('f-day').value;
  const month = +$('f-month').value;
  const yearText = arabic($('f-year').value.trim());
  const era = $('f-era').value;
  if (!day || !month || !yearText) return { error: 'กรอกวันที่ เดือน และปีเกิดให้ครบ' };
  if (!/^\d{4}$/.test(yearText)) return { error: 'ปีต้องเป็นตัวเลข 4 หลัก' };
  const typed = +yearText;
  let year;
  if (era === 'BE') {
    if (typed < 2400) return { error: `ปี ${typed} ดูเหมือนเป็น ค.ศ. เปลี่ยนช่องข้างปีเป็น ค.ศ. หรือกรอกเป็น พ.ศ.` };
    if (typed === 2483 && month <= 3) return { error: 'ปี พ.ศ. 2483 ไม่มีเดือนมกราคมถึงมีนาคม เพราะไทยเลื่อนวันขึ้นปีใหม่เป็น 1 มกราคมตั้งแต่ พ.ศ. 2484' };
    year = typed <= 2482 && month <= 3 ? typed - 542 : typed - 543;
  } else {
    if (typed > 2400) return { error: `ปี ${typed} ดูเหมือนเป็น พ.ศ. เปลี่ยนช่องข้างปีเป็น พ.ศ. หรือกรอกเป็น ค.ศ.` };
    year = typed;
  }
  if (year < 1900 || year > 2100) return { error: 'รองรับวันเกิดระหว่าง ค.ศ. 1900 ถึง 2100 (พ.ศ. 2443 ถึง 2643)' };
  if (new Date(Date.UTC(year, month - 1, day)).getUTCDate() !== day) return { error: `วันที่ ${day} ${T.MONTHS[month - 1]} ${typed} ไม่มีอยู่จริง` };

  const unknown = $('f-unknown').checked;
  if (!unknown && $('f-hour').value === '') return { error: 'เลือกชั่วโมงเกิด หรือติ๊ก "ไม่ทราบเวลาเกิด"' };
  const hour = unknown ? null : +$('f-hour').value;
  const minute = unknown ? 0 : +$('f-minute').value;

  let timeZone = TZ_TH, longitude = null, placeName = null;
  if (placeSel.value === 'abroad') {
    timeZone = $('f-tz').value || TZ_TH;
    const lonText = $('f-lon').value.trim().replace(',', '.').replace('−', '-');
    if (lonText) {
      const lon = Number(lonText);
      if (!Number.isFinite(lon) || lon < -180 || lon > 180) return { error: 'ลองจิจูดต้องเป็นตัวเลขระหว่าง -180 ถึง 180' };
      longitude = lon;
    }
    placeName = `ต่างประเทศ เขตเวลา ${timeZone.replace(/_/g, ' ')}`;
  } else if (placeSel.value !== '') {
    [placeName, longitude] = PLACES[+placeSel.value];
  }
  const useSolar = $('f-solar').checked && longitude != null && !unknown;
  return {
    input: {
      year, month, day, hour, minute, timeZone,
      longitude: useSolar ? longitude : null,
      lateZiRule: form.elements.lateZi.value,
      gender: form.elements.gender.value || null,
    },
    meta: { era, placeName, longitude, useSolar, unknown },
  };
}

function onSubmit(event) {
  event.preventDefault();
  const r = readForm();
  $('form-error').textContent = r.error ?? '';
  if (r.error) return;
  try {
    renderBirth(r.input, r.meta);
  } catch (err) {
    console.error(err);
    $('form-error').textContent = `คำนวณไม่สำเร็จ (${err.message})`;
  }
}

// ───────── ผังสี่เสา ─────────
let mode = 'now';
let nowKey = '';
let current = null;

function chartTable(chart, A) {
  const full = !!A;
  const P = chart.pillars, dm = P.day % 10;
  const dmCls = (k) => (full && k === 'day' ? ' class="is-dm"' : '');
  const btn = (g, inner) => `<button type="button" class="cell-btn" data-g="${g}" aria-pressed="false">${inner}</button>`;
  const bigEmpty = '<span class="big none">—</span><span class="sub">ไม่ทราบ</span>';
  const row = (label, fn, cls = '', empty = '<span class="sub">—</span>') =>
    `<tr${cls ? ` class="${cls}"` : ''}><th scope="row">${label}</th>${ORDER.map((k, c) => `<td${dmCls(k)}>${P[k] == null ? empty : fn(P[k], k, c)}</td>`).join('')}</tr>`;

  const rows = [];
  if (full) {
    rows.push(row('สิบเทพ', (idx, k) => {
      if (k === 'day') return btn('dm', '<span class="god">เจ้าวัน</span><span class="sub zh" lang="zh-Hans">日主</span>');
      const g = godOf(dm, idx % 10);
      return btn(`god:${g}`, `<span class="god">${T.GOD[g].short}</span><span class="sub zh" lang="zh-Hans">${g}</span>`);
    }));
  }
  const sub = (a, b) => `<span class="sub"><span class="nw">${a}</span> <span class="nw">${b}</span></span>`;
  rows.push(row('ก้านฟ้า', (idx, k, c) => {
    const s = idx % 10;
    return btn(`stem:${s}`, `<span class="big el-${s >> 1}" lang="zh-Hans" style="--i:${c}">${B.STEMS[s]}</span>${sub(T.STEM[s].read, T.STEM[s].kind)}`);
  }, 'r-stem', bigEmpty));
  rows.push(row('กิ่งดิน', (idx, k, c) => {
    const b = idx % 12, e = B.BRANCH_ELEMENT[b];
    return btn(`branch:${b}`, `<span class="big el-${e}" lang="zh-Hans" style="--i:${c + 4}">${B.BRANCHES[b]}</span>${sub(B.ZODIAC_TH[b], T.ELEMENT[e].th)}`);
  }, 'r-branch', bigEmpty));
  if (full) {
    rows.push(row('ก้านแฝง', (idx) => {
      const b = idx % 12;
      return btn(`hidden:${b}`, B.HIDDEN_STEMS[b].map((h) => `<span class="hid">${ch(B.STEMS[h])} <small>${T.GOD[godOf(dm, h)].short}</small></span>`).join(''));
    }));
    rows.push(row('รากเจ้าวัน', (idx) => {
      const st = B.LIFE_STAGES[B.lifeStage(dm, idx % 12)];
      return btn(`stage:${st}`, `<span class="zh-term" lang="zh-Hans">${st}</span><span class="sub">${T.STAGE[st].short}</span>`);
    }));
    rows.push(row('นาอิน', (idx) => btn(`nayin:${idx}`, `<span class="zh-term" lang="zh-Hans">${B.nayinOf(idx)}</span><span class="sub">${T.NAYIN[idx >> 1]}</span>`)));
  }
  const head = ORDER.map((k) => `<th scope="col"${dmCls(k)}>${btn(`palace:${k}`, PILLAR[k])}</th>`).join('');
  return `<table class="chart ${full ? 'is-full' : 'is-now'}">
    <caption class="sr">${full ? 'ผังสี่เสาของคุณ' : 'ผังสี่เสาของเวลาขณะนี้'} เรียงจากเสายามทางซ้ายไปเสาปีทางขวา</caption>
    <colgroup><col class="c-label"><col><col><col><col></colgroup>
    <thead><tr><td></td>${head}</tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

function glossText(key) {
  const [type, raw] = key.split(':');
  const A = current?.A;
  const dm = current ? current.chart.pillars.day % 10 : null;
  const big = (c) => `<span class="zh el-${elOfChar(c)}" lang="zh-Hans">${c}</span>`;
  switch (type) {
    case 'palace': {
      const p = T.PALACE[raw];
      return `<strong>เสา${PILLAR[raw]}</strong> ${p.place} บางตำราผูกกับช่วงอายุ ${p.ages} เสานี้${p.changes}`;
    }
    case 'stem': {
      const s = +raw, S = T.STEM[s];
      return `${big(B.STEMS[s])} <strong>${S.read}</strong> เป็น${S.kind} ภาพเปรียบคือ${S.image}${A && s === dm ? ' ก้านนี้คือเจ้าวันของผัง' : ''}`;
    }
    case 'branch': {
      const b = +raw;
      return `${big(B.BRANCHES[b])} <strong>${B.ZODIAC_TH[b]}</strong> เป็นธาตุ${T.ELEMENT[B.BRANCH_ELEMENT[b]].th} ครองยาม ${T.BRANCH_HOURS[b]} น. ก้านแฝงคือ ${B.HIDDEN_STEMS[b].map((h) => ch(B.STEMS[h])).join(' ')}`;
    }
    case 'god': {
      const G = T.GOD[raw];
      return `${zh(raw)} <strong>${G.th}</strong> คือ${G.rel} ตำรามักโยงกับ${G.meaning}`;
    }
    case 'dm':
      return `<strong>เจ้าวัน</strong> ${zh('日主')} คือก้านฟ้าของเสาวัน แทนตัวเจ้าชะตา สิบเทพของอักษรอื่นทุกตัวคิดเทียบกับก้านนี้`;
    case 'hidden': {
      const b = +raw, hs = B.HIDDEN_STEMS[b], w = B.HIDDEN_WEIGHTS[hs.length];
      return `ก้านแฝงของ ${big(B.BRANCHES[b])} คือ ${hs.map((h, i) => `${ch(B.STEMS[h])} ${Math.round(w[i] * 100)}%`).join(' ')} เรียงตัวหลัก ตัวกลาง และเศษ ตัวเลขคือน้ำหนักที่ใช้คิดกำลังธาตุ`;
    }
    case 'stage': {
      const S = T.STAGE[raw];
      return `${zh(raw)} <strong>${S.name}</strong> ขั้นที่ ${S.n} ของสิบสองวงจรชีวิต บอกว่าเจ้าวันมีรากบนกิ่งนี้ในระดับ "${S.short}" ชื่อขั้นเป็นภาพเปรียบ ไม่ใช่คำทำนายเหตุการณ์`;
    }
    case 'nayin': {
      const i = +raw;
      return `${zh(B.nayinOf(i))} <strong>${T.NAYIN[i >> 1]}</strong> นาอินคือชื่อธาตุเชิงกวีของคู่ ${pair(B.gzName(i))} นิยมใช้กับเสาปีในคำทำนายทั่วไป สำนักจื่อผิงไม่ใช้เป็นแกนวิเคราะห์`;
    }
    default:
      return GLOSS_HINT;
  }
}

function onChartClick(event) {
  const target = event.target.closest('[data-g]');
  if (!target) return;
  $('chart').querySelectorAll('[aria-pressed="true"]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  target.setAttribute('aria-pressed', 'true');
  $('gloss').innerHTML = glossText(target.dataset.g);
}

// ───────── โหมดเวลาขณะนี้ ─────────
function renderNow() {
  const input = nowInput();
  const key = `${input.year}-${input.month}-${input.day} ${input.hour}:${input.minute}`;
  if (key === nowKey) return;
  nowKey = key;
  const chart = B.computeChart(input);
  const t = { y: input.year, m: input.month, d: input.day, h: input.hour, mi: input.minute };
  current = { chart, A: null };
  $('chart-title').textContent = 'เวลาขณะนี้';
  $('chart-meta').innerHTML = `<span>วัน${weekday(t)}ที่ ${thDate(t)} เวลา ${hhmm(t)} น. ตามเวลาประเทศไทย</span>`;
  $('warnings').innerHTML = '';
  // บอกว่าเดือนปาจื้อนี้เริ่มเมื่อไร และจะเปลี่ยนเป็นอะไรเมื่อไร (คำนวณจากตำแหน่งดวงอาทิตย์)
  const { prevLon, prevJD, nextLon, nextJD } = chart.jie;
  const p = jdWall(prevJD, TZ_TH), n = jdWall(nextJD, TZ_TH);
  const nextMonth = B.gzName((chart.pillars.month + 1) % 60);
  const jie = (lon) => `${zh(B.JIE_NAMES[lon])} (${T.JIE[B.JIE_NAMES[lon]]})`;
  $('chart-foot').innerHTML = `<span>${ORDER_NOTE}</span>
    <span>เดือน ${pair(chart.names.month)} เริ่มเมื่อสารท ${jie(prevLon)} ${thDate(p, true)} ${hhmm(p)} น. และจะเปลี่ยนเป็นเดือน ${pair(nextMonth)} เมื่อถึงสารท ${jie(nextLon)} ${thDate(n, true)} ${hhmm(n)} น.</span>`;
  const box = $('chart');
  box.classList.remove('flip');
  box.innerHTML = chartTable(chart, null);
}

function backToNow() {
  mode = 'now';
  nowKey = '';
  $('back-now').hidden = true;
  $('results').hidden = true;
  $('results').innerHTML = '';
  $('gloss').textContent = GLOSS_HINT;
  $('form-box').open = true;
  renderNow();
}

// บนจอแคบ ฟอร์มยุบหลังคำนวณ ผลจะได้ต่อจากผังทันที บนจอกว้างฟอร์มเปิดตลอด
function syncFormBox() {
  const box = $('form-box');
  if (wide.matches) box.open = true;
  $('form-title').textContent = box.open || mode === 'now' ? 'ใส่วันเวลาเกิด' : 'แก้ไขวันเวลาเกิด';
}

// ───────── โหมดผังของผู้ใช้ ─────────
function renderBirth(input, meta) {
  const chart = B.computeChart(input);
  const A = B.analyze(chart);
  const luck = chart.gender ? B.luckPillars(chart, 8) : null;
  const today = stamp(nowWall());
  let cur = -1;
  if (luck) luck.pillars.forEach((p, i) => { if (stamp(p.startDate) <= today) cur = i; });
  const ctx = { chart, A, input, meta, luck, cur };

  mode = 'birth';
  current = ctx;
  $('chart-title').textContent = 'ผังดวงของคุณ';
  $('back-now').hidden = false;
  $('chart-meta').innerHTML = birthMeta(ctx);
  $('warnings').innerHTML = warningsHtml(ctx);
  const box = $('chart');
  box.classList.remove('flip');
  box.innerHTML = chartTable(chart, A);
  void box.offsetWidth; // เริ่มแอนิเมชันใหม่ทุกครั้งที่คำนวณ
  box.classList.add('flip');
  $('gloss').textContent = GLOSS_HINT;
  $('chart-foot').innerHTML = `<span>${ORDER_NOTE}</span>`;
  if (!wide.matches) $('form-box').open = false;
  syncFormBox();

  const results = $('results');
  results.innerHTML = [
    dayMasterSection(ctx), elementsSection(ctx), favorableSection(ctx), relationsSection(ctx),
    luckSection(ctx), yearsSection(ctx), starsSection(ctx), calcSection(ctx),
  ].join('');
  results.hidden = false;
  $('chart-panel').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
}

function birthMeta({ chart, input, meta }) {
  const t = { y: input.year, m: input.month, d: input.day, h: input.hour, mi: input.minute };
  const when = meta.unknown ? `${thDate(t)} ไม่ทราบเวลาเกิด` : `${thDate(t)} เวลา ${hhmm(t)} น.`;
  const ce = meta.era === 'BE' && input.year < 1941 && input.month <= 3 ? ` (ค.ศ. ${input.year})` : '';
  const where = meta.placeName ? ` ที่${meta.placeName}` : '';
  const sex = input.gender === 'M' ? ' เพศชาย' : input.gender === 'F' ? ' เพศหญิง' : '';
  const yb = chart.pillars.year % 12;
  let zodiac = `ปีนักษัตรตามปาจื้อคือปี${B.ZODIAC_TH[yb]} ${ch(B.BRANCHES[yb])}`;
  if (input.month <= 2) {
    const lc = jdWall(B.solarTermJD(input.year, 315), input.timeZone);
    const before = chart.baziYear < input.year;
    zodiac += before
      ? ` เพราะเกิดก่อนลี่ชุน ${thDate(lc, true)} ${hhmm(lc)} น. ซึ่งเป็นวันเปลี่ยนปีของปาจื้อ`
      : ` ปีของปาจื้อเปลี่ยนที่ลี่ชุน ${thDate(lc, true)} ${hhmm(lc)} น. ไม่ใช่ตรุษจีนหรือ 1 มกราคม`;
  }
  return `<span>เกิด ${when}${ce}${where}${sex}</span><span>${zodiac}</span>`;
}

function namesLine(alt, base) {
  return ORDER.filter((k) => alt.names[k]).map((k) =>
    `<span class="alt${alt.names[k] !== base.names[k] ? ' changed' : ''}">${PILLAR[k]} ${pair(alt.names[k])}</span>`).join(' ');
}
const warnBox = (title, body) => `<div class="warn"><strong>${title}</strong><p>${body}</p></div>`;

function warningsHtml({ chart, input, meta }) {
  const tz = input.timeZone;
  const out = [];
  for (const w of chart.warnings) {
    if (w.code === 'NEAR_JIE') {
      const { prevJD, nextJD, prevLon, nextLon } = chart.jie;
      const toPrev = (chart.jd - prevJD) * 1440, toNext = (nextJD - chart.jd) * 1440;
      const isPrev = toPrev < toNext;
      const name = B.JIE_NAMES[isPrev ? prevLon : nextLon];
      const t = jdWall(isPrev ? prevJD : nextJD, tz);
      const alt = B.computeChart(shiftInput(input, isPrev ? -Math.ceil(toPrev) - 1 : Math.ceil(toNext) + 1));
      out.push(warnBox('เกิดใกล้รอยต่อเดือน',
        `สารท ${zh(name)} (${T.JIE[name]}) ตกเวลา ${hhmm(t)} น. ของวันที่ ${thDate(t, true)} ห่างจากเวลาเกิด ${w.minutes} นาที ถ้าเวลาเกิดจริง${isPrev ? 'เร็ว' : 'ช้า'}กว่าที่กรอกจนข้ามจุดนี้ ผังจะเป็น ${namesLine(alt, chart)}`));
    } else if (w.code === 'NEAR_HOUR_BOUNDARY') {
      const L = chart.localUsed, mins = L.h * 60 + L.mi;
      const b = [-60, 60, 180, 300, 420, 540, 660, 780, 900, 1020, 1140, 1260, 1380, 1500]
        .reduce((a, x) => (Math.abs(x - mins) < Math.abs(a - mins) ? x : a));
      const alt = B.computeChart(shiftInput(input, b > mins ? b - mins : b - mins - 1));
      const bh = (((b % 1440) + 1440) % 1440) / 60;
      out.push(warnBox('เกิดใกล้รอยต่อยาม',
        `เวลาที่ใช้คำนวณคือ ${hhmm(L)} น. ห่างจากรอยต่อยาม ${pad(bh)}:00 น. เพียง ${w.minutes} นาที ถ้าเวลาเกิดจริงคลาดข้ามรอยต่อ ผังจะเป็น ${namesLine(alt, chart)}`));
    } else if (w.code === 'SOLAR_TIME_CHANGES_HOUR') {
      const alt = B.computeChart({ ...input, longitude: null, trueSolarTime: false });
      out.push(warnBox('เวลาสุริยะจริงทำให้ยามเปลี่ยน',
        `ที่${meta.placeName ?? 'สถานที่เกิด'} เวลาสุริยะจริงคือ ${hhmm(chart.localUsed)} น. ส่วนนาฬิกาบอก ${hhmm({ h: input.hour, mi: input.minute })} น. ผังนี้ใช้เวลาสุริยะจริง ถ้าใช้เวลานาฬิกาจะได้ ${namesLine(alt, chart)} เปลี่ยนได้ที่ "ตั้งค่าตามสำนัก"`));
    } else if (w.code === 'JIE_ON_BIRTHDAY') {
      const start = B.msToJD(B.zonedToUtcMs(input.year, input.month, input.day, 0, 0, tz));
      const { prevJD, nextJD, prevLon, nextLon } = chart.jie;
      const isPrev = prevJD >= start && prevJD < start + 1;
      const name = B.JIE_NAMES[isPrev ? prevLon : nextLon];
      const t = jdWall(isPrev ? prevJD : nextJD, tz);
      const at = { ...input, hour: t.h, minute: t.mi };
      const before = B.computeChart(shiftInput(at, -1)), after = B.computeChart(shiftInput(at, 1));
      const yearToo = before.names.year !== after.names.year;
      const pick = (c) => (yearToo ? `เสาปี ${pair(c.names.year)} เสาเดือน ${pair(c.names.month)}` : `เสาเดือน ${pair(c.names.month)}`);
      out.push(warnBox('วันเกิดตรงกับวันเปลี่ยนเดือน',
        `สารท ${zh(name)} (${T.JIE[name]}) ตกเวลา ${hhmm(t)} น. ถ้าเกิดก่อนเวลานี้ได้${pick(before)} ถ้าเกิดหลังจากนั้นได้${pick(after)} ผังด้านล่างคิดจากเวลาเที่ยงวัน`));
    }
  }
  return out.join('');
}

// ───────── ผลวิเคราะห์ ─────────
function supportTag(idx, fav) {
  const sFav = fav.includes((idx % 10) >> 1);
  const bFav = fav.includes(B.BRANCH_ELEMENT[idx % 12]);
  if (sFav && bFav) return { short: 'หนุนทั้งเสา', long: 'ทั้งก้านและกิ่งเป็นธาตุให้คุณ' };
  if (bFav) return { short: 'หนุนที่กิ่ง', long: 'กิ่งเป็นธาตุให้คุณ ส่วนก้านไม่ใช่' };
  if (sFav) return { short: 'หนุนที่ก้าน', long: 'ก้านเป็นธาตุให้คุณ ส่วนกิ่งไม่ใช่' };
  return { short: 'ไม่หนุน', long: 'ทั้งก้านและกิ่งไม่ใช่ธาตุให้คุณ' };
}

function scale(st) {
  const cuts = B.STRENGTH_LEVELS.map((l) => l.min).filter((m) => m > 0).sort((a, b) => a - b);
  const keys = ['veryWeak', 'weak', 'balanced', 'strong', 'veryStrong'];
  const edges = [0, ...cuts, 1];
  const x = Math.min(Math.max(st.ratio, 0), 1) * 100;
  const labels = keys.map((k, i) => {
    const left = i === 0 ? 0 : i === keys.length - 1 ? 100 : ((edges[i] + edges[i + 1]) / 2) * 100;
    const cls = ['lbl', i === 0 ? 'first' : '', i === keys.length - 1 ? 'last' : '', k === st.level ? 'on' : ''].filter(Boolean).join(' ');
    return `<span class="${cls}" style="left:${left}%">${LEVEL_SHORT[k]}</span>`;
  }).join('');
  return `<div class="scale" role="img" aria-label="กำลังเจ้าวัน ${(st.ratio * 100).toFixed(1)}% ระดับ${LEVEL[st.level]}">
    ${cuts.map((c) => `<span class="tick" style="left:${c * 100}%"></span>`).join('')}${labels}
    <span class="mark" style="left:${x}%"></span>
  </div>`;
}

function dayMasterSection({ chart, A }) {
  const dm = chart.pillars.day % 10, S = T.STEM[dm], E = dm >> 1;
  const st = A.favorable.strength;
  const lean = st.level === 'balanced' ? (st.ratio < B.BALANCE_PIVOT ? ' เอนไปทางอ่อน' : ' เอนไปทางแข็ง') : '';
  const extreme = st.level === 'veryStrong'
    ? ' ผังที่แข็งมากระดับนี้ บางสำนักอ่านเป็นโครงสร้างตามแข็ง ควรให้ผู้รู้ยืนยัน'
    : st.level === 'veryWeak' ? ' ผังที่อ่อนมากระดับนี้ บางสำนักอ่านเป็นโครงสร้างตามอ่อน ควรให้ผู้รู้ยืนยัน' : '';
  return `<section>
    <h2>เจ้าวัน${zh('日主')}</h2>
    <p class="lead">ก้านฟ้าของเสาวัน แทนตัวเจ้าชะตา อักษรอื่นทั้งหมดอ่านเทียบกับตัวนี้</p>
    <div class="dm">
      <span class="big el-${E}" lang="zh-Hans">${B.STEMS[dm]}</span>
      <div><p class="dm-name">${S.read} ${S.kind}</p><p>ภาพเปรียบคือ${S.image}</p></div>
    </div>
    <p>ตำรามักบรรยายคนที่มีเจ้าวันนี้ว่า ${S.trait}</p>
    <h3>กำลังเจ้าวัน</h3>
    <p>ระดับ<strong>${LEVEL[st.level]}</strong>${lean} ฝ่ายช่วยคือ${elWord(E)}กับ${elWord(B.mod(E - 1, 5))} รวมได้ ${(st.ratio * 100).toFixed(1)}% ของน้ำหนักในผัง</p>
    ${scale(st)}
    <p class="note">ผังทั่วไปมีค่ากลางราว 39% เพราะฝ่ายช่วยมีเพียง 2 ใน 5 ธาตุ${extreme}</p>
  </section>`;
}

function elementsSection({ chart, A }) {
  const st = A.favorable.strength, w = st.weights;
  const total = w.reduce((a, b) => a + b, 0), max = Math.max(...w);
  const fav = A.favorable.favorable, dmE = (chart.pillars.day % 10) >> 1;
  const count = chart.pillars.hour == null ? 5 : 7;
  const rows = [0, 1, 2, 3, 4].map((e) => {
    const tags = [e === dmE ? 'ธาตุเจ้าวัน' : '', fav.includes(e) ? 'ให้คุณ' : 'ให้โทษ'].filter(Boolean).join(' ');
    return `<span class="el-name el-${e}">${T.ELEMENT[e].th}${zh(T.ELEMENT[e].zh)}</span>
      <span class="el-track el-${e}"><span class="el-fill" style="width:${max ? (w[e] / max) * 100 : 0}%"></span></span>
      <span class="el-val"><b>${w[e].toFixed(2)}</b> ${tags}</span>`;
  }).join('');
  const group = A.relations.find((r) => r.level === 'group' && r.branches.includes(chart.pillars.month % 12));
  const groupNote = group
    ? `<p class="note">${T.REL[group.type].th} ${group.branches.map((b) => ch(B.BRANCHES[b])).join(' ')} ครบชุดและมีกิ่งเดือนร่วม จึงนับกิ่งทั้งชุดเป็นธาตุ${elWord(group.element)}เต็มน้ำหนัก</p>`
    : '';
  return `<section>
    <h2>สมดุลธาตุ${zh('五行')}</h2>
    <p class="lead">น้ำหนักธาตุจากอักษรอีก ${count} ตัวที่ไม่ใช่เจ้าวัน รวม ${total.toFixed(1)} หน่วย กิ่งเดือนหนัก 3 หน่วย กิ่งวัน 1.5 ตำแหน่งอื่นตำแหน่งละ 1 กิ่งดินแจกน้ำหนักตามก้านแฝง</p>
    <div class="el-rows">${rows}</div>
    ${groupNote}
  </section>`;
}

function favorableSection({ chart, A }) {
  const F = A.favorable;
  const mb = chart.pillars.month % 12;
  const items = F.favorable.map((e) => {
    const E = T.ELEMENT[e];
    return `<li><span class="el-head el-${e}">${E.th}${zh(E.zh)}</span>
      <dl><dt>สี</dt><dd>${E.colors}</dd><dt>ทิศ</dt><dd>${E.direction}</dd><dt>เลข</dt><dd>${E.numbers}</dd><dt>งานที่ตำราโยงไว้</dt><dd>${E.work}</dd></dl></li>`;
  }).join('');
  const notes = [];
  if (F.climate != null) {
    notes.push(`ได้${elWord(F.climate)}เพิ่มเพราะเกิดเดือน ${ch(B.BRANCHES[mb])} ซึ่งเป็นหน้า${[11, 0, 1].includes(mb) ? 'หนาว' : 'ร้อน'} และในผังมีธาตุนี้ไม่ถึง 1 หน่วย ตำราเรียกว่าการปรับอากาศ ${zh('调候')}`);
  }
  if (F.special) {
    notes.push(A.favorable.strength.level === 'veryStrong'
      ? `ผังแข็งมาก ผลนี้ใช้แนวตามแข็ง ${zh('专旺')} ซึ่งสำนักต่าง ๆ ยังเห็นไม่ตรงกัน ควรให้ผู้รู้ยืนยัน`
      : `ผังอ่อนมาก ผลนี้ใช้แนวตามอ่อน ${zh('从弱')} ซึ่งสำนักต่าง ๆ ยังเห็นไม่ตรงกัน ควรให้ผู้รู้ยืนยัน`);
  }
  return `<section>
    <h2>ธาตุให้คุณ${zh('用神')}</h2>
    <p class="lead">ธาตุที่ช่วยพาผังเข้าใกล้สมดุล เรียงจากสำคัญมากไปน้อย</p>
    <ol class="fav">${items}</ol>
    <p>ธาตุให้โทษคือ ${F.unfavorable.map(elWord).join(' ')}</p>
    ${notes.map((n) => `<p class="note">${n}</p>`).join('')}
    <p class="note">สี ทิศ เลข และงาน เป็นความเชื่อตามตำรา ใช้เป็นแรงบันดาลใจได้ แต่ไม่ใช่คำแนะนำอาชีพหรือการเงิน</p>
  </section>`;
}

function relationsSection({ chart, A }) {
  const P = chart.pillars;
  const DIST = ['', 'เสาติดกัน', 'ห่างกันหนึ่งเสา', 'ปีกับยามซึ่งอยู่ห่างกันที่สุด'];
  const items = [...A.relations].sort((a, b) => T.REL[a.type].rank - T.REL[b.type].rank).map((r) => {
    const R = T.REL[r.type];
    let where;
    if (r.level === 'group') {
      where = `${r.branches.map((b) => ch(B.BRANCHES[b])).join(' ')} ครบชุด เป็นธาตุ${elWord(r.element)}`
        + (r.branches.includes(P.month % 12) ? ' และมีกิ่งเดือนร่วม จึงนับทั้งชุดเป็นธาตุนี้ตอนคิดกำลัง' : '');
    } else {
      const [k1, k2] = r.between;
      const part = r.level === 'stem' ? 'ก้าน' : 'กิ่ง';
      const charOf = (k) => (r.level === 'stem' ? B.STEMS[P[k] % 10] : B.BRANCHES[P[k] % 12]);
      const dist = Math.abs(POS[k1] - POS[k2]);
      where = `${part}${PILLAR[k1]} ${ch(charOf(k1))} กับ${part}${PILLAR[k2]} ${ch(charOf(k2))} ${DIST[dist]}`
        + (r.element != null ? ` ธาตุของการรวมคือ${elWord(r.element)}` : '');
    }
    return `<li><p class="term">${R.th}${zh(r.type)}</p><p>${where}</p><p class="note">${R.meaning}</p></li>`;
  });
  const voidAt = ['year', 'month', 'hour'].filter((k) => P[k] != null && A.void.includes(B.BRANCHES[P[k] % 12]));
  const voidLine = `ช่องว่าง ${zh('空亡')} ของผังนี้คือ ${A.void.map(ch).join(' ')} `
    + (voidAt.length
      ? `${voidAt.map((k) => `กิ่ง${PILLAR[k]}`).join(' และ')}ตกช่องว่าง ตำราตีความว่าเรื่องของเสานั้นอาจเบาบางหรือล่าช้า`
      : 'ไม่มีกิ่งใดในผังตกช่องว่าง');
  return `<section>
    <h2>ความสัมพันธ์ในผัง${zh('合冲刑害')}</h2>
    <p class="lead">การรวมและปะทะระหว่างอักษร เรียงจากแรงไปเบา เสาที่อยู่ติดกันมีผลแรงกว่าเสาที่อยู่ห่างกัน</p>
    ${items.length ? `<ul class="plain rel-list">${items.join('')}</ul>` : '<p>ไม่พบการรวมหรือปะทะระหว่างอักษรในผังนี้</p>'}
    <p class="note">${voidLine}</p>
  </section>`;
}

function echoFlags(idx, P) {
  const out = [];
  for (const k of ['year', 'month', 'day', 'hour']) {
    const n = P[k];
    if (n == null) continue;
    if (n === idx) out.push({ k, type: 'fuyin' });
    else if (Math.abs((n % 10) - (idx % 10)) === 6 && Math.abs((n % 12) - (idx % 12)) === 6) out.push({ k, type: 'fanyin' });
  }
  return out;
}
const echoText = (f) => (f.type === 'fuyin' ? `ซ้ำรอยเสา${PILLAR[f.k]}` : `ย้อนรอยเสา${PILLAR[f.k]}`);
const addYears = (t, n) => ({ ...t, y: t.y + n });

function luckSection({ chart, A, luck, cur }) {
  const title = `<h2>วัยจร 10 ปี${zh('大运')}</h2>`;
  if (!luck) {
    return `<section class="span-2">${title}<p class="lead">เลือกเพศในฟอร์มแล้วกดดูผังอีกครั้ง ทิศทางของวัยจรขึ้นกับเพศและขั้วของปีเกิด</p></section>`;
  }
  const P = chart.pillars, dm = P.day % 10, fav = A.favorable.favorable;
  const ys = P.year % 10, o = luck.offset;
  const approx = chart.input.hourKnown ? '' : ' วันเริ่มเป็นค่าโดยประมาณเพราะไม่ทราบเวลาเกิด';
  const lead = `เดิน${luck.forward ? 'หน้า' : 'ถอยหลัง'}จากเสาเดือน เพราะเป็น${chart.gender === 'M' ? 'ชาย' : 'หญิง'}ที่เกิดปีก้าน${B.isYangStem(ys) ? 'หยาง' : 'หยิน'} ${ch(B.STEMS[ys])} เข้าวัยจรแรกวันที่ ${thDate(luck.startDate)} เมื่ออายุ ${o.years} ปี ${o.months} เดือน ${o.days} วัน${approx}`;
  let anyEcho = false;
  const items = luck.pillars.map((p, i) => {
    const s = p.index % 10, b = p.index % 12;
    const flags = echoFlags(p.index, P);
    if (flags.length) anyEcho = true;
    const isNow = i === cur;
    return `<li${isNow ? ' class="is-now" aria-current="true"' : ''}>
      ${isNow ? '<span class="now-tag">ตอนนี้</span>' : ''}
      <span class="age">อายุ ${Math.floor(p.startAge)}</span>
      <span class="when">${thMonthYear(p.startDate)}</span>
      <span class="lc el-${s >> 1}" lang="zh-Hans">${B.STEMS[s]}</span><span class="lg">${T.GOD[godOf(dm, s)].short}</span>
      <span class="lc el-${B.BRANCH_ELEMENT[b]}" lang="zh-Hans">${B.BRANCHES[b]}</span><span class="lg">${B.ZODIAC_TH[b]}</span>
      <span class="tag">${supportTag(p.index, fav).short}</span>
      ${flags.map((f) => `<span class="tag">${echoText(f)}</span>`).join('')}
    </li>`;
  }).join('');

  let detail;
  if (cur >= 0) {
    const p = luck.pillars[cur], s = p.index % 10, b = p.index % 12;
    const end = cur + 1 < luck.pillars.length ? luck.pillars[cur + 1].startDate : addYears(p.startDate, 10);
    const sE = s >> 1, bE = B.BRANCH_ELEMENT[b];
    const rels = ['month', 'day'].flatMap((k) => B.branchRelations(b, P[k] % 12)
      .map((r) => `${T.REL[r.type].th} ${zh(r.type)} กับกิ่ง${PILLAR[k]} ${ch(B.BRANCHES[P[k] % 12])}`));
    const flags = echoFlags(p.index, P);
    detail = `<h3>วัยจรตอนนี้ ${pair(p.name)}</h3>
      <p>ช่วง ${thMonthYear(p.startDate)} ถึง ${thMonthYear(end)} ก้าน ${ch(B.STEMS[s])} เป็น${T.GOD[godOf(dm, s)].th} ธาตุ${elWord(sE)}ซึ่ง${fav.includes(sE) ? 'เป็นธาตุให้คุณ' : 'เป็นธาตุให้โทษ'} กิ่ง ${ch(B.BRANCHES[b])} ปี${B.ZODIAC_TH[b]} ธาตุ${elWord(bE)}ซึ่ง${fav.includes(bE) ? 'เป็นธาตุให้คุณ' : 'เป็นธาตุให้โทษ'}</p>
      ${rels.length ? `<p>กิ่งของวัยจรนี้${rels.join(' และ')}</p>` : ''}
      ${flags.length ? `<p>วัยจรนี้${flags.map(echoText).join(' และ')} ตำราถือเป็นช่วงที่ควรเน้น</p>` : ''}`;
  } else {
    detail = '<p>ตอนนี้ยังไม่เข้าวัยจรแรก ช่วงก่อนหน้านั้นตำรามักอ่านจากเสาเดือน</p>';
  }
  return `<section class="span-2">
    ${title}
    <p class="lead">${lead}</p>
    <ol class="luck">${items}</ol>
    ${detail}
    <p class="note">ป้ายใต้แต่ละเสาบอกว่าก้านหรือกิ่งของช่วงนั้นเป็นธาตุให้คุณหรือไม่${anyEcho ? ' ซ้ำรอย (伏吟) คือวัยจรที่ตรงกับเสาในผังทุกตัวอักษร ย้อนรอย (反吟) คือวัยจรที่ปะทะเสาในผังทั้งก้านและกิ่ง' : ''}</p>
  </section>`;
}

function yearsSection({ chart, A, luck, cur }) {
  const P = chart.pillars, dm = P.day % 10, fav = A.favorable.favorable;
  const yb = P.year % 12, db = P.day % 12;
  const Y0 = B.computeChart(nowInput()).baziYear;
  const lb = luck && cur >= 0 ? luck.pillars[cur].index % 12 : null;
  const taisui = (list) => list.map((x) => `${T.TAISUI[x]} ${zh(x)}`).join(' ');
  const cards = [Y0, Y0 + 1].map((Y) => {
    const idx = B.yearPillarIndex(Y), s = idx % 10, b = idx % 12;
    const lc = jdWall(B.solarTermJD(Y, 315), TZ_TH);
    const ty = B.taiSuiRelations(yb, Y), td = B.taiSuiRelations(db, Y);
    const lines = [
      `ก้าน ${ch(B.STEMS[s])} เป็น${T.GOD[godOf(dm, s)].th} ${supportTag(idx, fav).long}`,
      ty.length ? `ชงกับปีเกิด ${ch(B.BRANCHES[yb])} แบบ${taisui(ty)}` : `ไม่ชงกับปีเกิด ${ch(B.BRANCHES[yb])}`,
      td.length ? `ชงกับกิ่งวัน ${ch(B.BRANCHES[db])} ซึ่งเป็นตำแหน่งคู่ครอง แบบ${taisui(td)}` : `ไม่ชงกับกิ่งวัน ${ch(B.BRANCHES[db])}`,
    ];
    if (lb != null && Math.abs(lb - b) === 6) {
      lines.push(`กิ่งปีปะทะกิ่งของวัยจรตอนนี้ ${ch(B.BRANCHES[lb])} ${zh('岁运相冲')} มักเป็นปีที่มีการเปลี่ยนแปลงหลายเรื่องพร้อมกัน`);
    }
    return `<div class="year-card">
      <h3>${pair(B.gzName(idx))}<span>ปี ${Y + 543}${Y === Y0 ? ' ปีปัจจุบัน' : ''}</span></h3>
      <p class="note">นักษัตร${B.ZODIAC_TH[b]} เริ่มที่ลี่ชุน ${thDate(lc, true)} ${hhmm(lc)} น.</p>
      <ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul>
    </div>`;
  }).join('');
  return `<section>
    <h2>ปีจรและปีชง${zh('流年 太岁')}</h2>
    <p class="lead">ปีของปาจื้อเริ่มที่ลี่ชุน ตรวจปีชงทั้งกับกิ่งปีเกิดและกิ่งวัน</p>
    <div class="years">${cards}</div>
  </section>`;
}

function starsSection({ A }) {
  const merged = new Map();
  for (const s of A.stars) {
    if (s.name === '空亡') continue; // แสดงในส่วนความสัมพันธ์แล้ว
    const m = merged.get(s.name) ?? { name: s.name, at: new Set(), basis: new Set() };
    s.at.forEach((k) => m.at.add(k));
    m.basis.add(s.basis);
    merged.set(s.name, m);
  }
  const weight = (m) => (m.at.has('day') || m.at.has('month') ? 1 : 0);
  const list = [...merged.values()].sort((a, b) => weight(b) - weight(a));
  const li = (m) => `<li><p class="term">${T.STAR[m.name].th}${zh(m.name)}</p>
    <p>พบที่${[...m.at].sort((a, b) => POS[a] - POS[b]).map((k) => `เสา${PILLAR[k]}`).join(' ')} นับจาก${[...m.basis].join('และ')}</p>
    <p class="note">${T.STAR[m.name].meaning}</p></li>`;
  const top = list.slice(0, 5), rest = list.slice(5);
  return `<section>
    <h2>ดาวพิเศษ${zh('神煞')}</h2>
    <p class="lead">สำนักจื่อผิงใช้ดาวพิเศษเป็นสีสันรอง มีน้ำหนักน้อยกว่าสิบเทพและธาตุ ดาวที่อยู่เสาวันและเสาเดือนแสดงก่อน</p>
    ${top.length ? `<ul class="plain star-list">${top.map(li).join('')}</ul>` : '<p>ไม่พบดาวพิเศษที่นิยมใช้ในผังนี้</p>'}
    ${rest.length ? `<details class="more"><summary>ดูอีก ${rest.length} ดวง</summary><ul class="plain star-list">${rest.map(li).join('')}</ul></details>` : ''}
  </section>`;
}

function dial(lambda) {
  const C = 120, R = 108, r1 = 68;
  const pt = (lon, r) => { const a = ((180 - lon) * Math.PI) / 180; return [C + r * Math.cos(a), C - r * Math.sin(a)]; };
  const f = (n) => n.toFixed(2);
  const m = Math.floor(B.mod(lambda - 315, 360) / 30);
  const a1 = 315 + 30 * m, a2 = a1 + 30;
  const [ox1, oy1] = pt(a1, R), [ox2, oy2] = pt(a2, R), [ix2, iy2] = pt(a2, r1), [ix1, iy1] = pt(a1, r1);
  const seg = `<path class="seg on" d="M${f(ox1)} ${f(oy1)} A${R} ${R} 0 0 1 ${f(ox2)} ${f(oy2)} L${f(ix2)} ${f(iy2)} A${r1} ${r1} 0 0 0 ${f(ix1)} ${f(iy1)} Z"/>`;
  let ticks = '', labels = '';
  for (let k = 0; k < 12; k++) {
    const lon = 315 + 30 * k;
    const [xa, ya] = pt(lon, r1), [xb, yb] = pt(lon, R);
    ticks += `<line class="tick" x1="${f(xa)}" y1="${f(ya)}" x2="${f(xb)}" y2="${f(yb)}"/>`;
    const [xl, yl] = pt(lon + 15, (R + r1) / 2);
    labels += `<text x="${f(xl)}" y="${f(yl)}"${k === m ? ' class="on"' : ''}>${B.BRANCHES[(k + 2) % 12]}</text>`;
  }
  const [sx, sy] = pt(lambda, R), [rx, ry] = pt(lambda, 26);
  const n1 = B.JIE_NAMES[a1 % 360], n2 = B.JIE_NAMES[a2 % 360];
  return `<figure class="dial">
    <svg viewBox="0 0 240 240" role="img" aria-label="ตำแหน่งดวงอาทิตย์บนเส้นสุริยวิถีตอนเกิด">
      <circle class="ring" cx="${C}" cy="${C}" r="${R}"/><circle class="ring" cx="${C}" cy="${C}" r="${r1}"/>
      ${seg}${ticks}${labels}
      <line class="ray" x1="${f(rx)}" y1="${f(ry)}" x2="${f(sx)}" y2="${f(sy)}"/>
      <circle class="sun" cx="${f(sx)}" cy="${f(sy)}" r="7"/>
      <text x="${C}" y="${C}">${lambda.toFixed(1)}°</text>
    </svg>
    <figcaption>ดวงอาทิตย์อยู่ที่ลองจิจูด ${lambda.toFixed(2)}° บนเส้นสุริยวิถี ตกในช่วงเดือน ${zh(B.BRANCHES[(m + 2) % 12])} ระหว่าง ${zh(n1)} (${a1 % 360}°) ถึง ${zh(n2)} (${a2 % 360}°) วงนี้วางทิศใต้ไว้ด้านบนตามแบบจีน</figcaption>
  </figure>`;
}

function calcSection({ chart, input, meta }) {
  const tz = input.timeZone;
  const typed = { y: input.year, m: input.month, d: input.day, h: input.hour, mi: input.minute };
  const rows = [
    ['เวลาเกิดที่ใช้', meta.unknown ? `${thDate(typed)} ไม่ทราบเวลา ใช้เที่ยงวันหาเสาเดือน` : `${thDate(typed)} ${hhmm(typed)} น. เขตเวลา ${tz}`],
    ['เวลาสากล (UTC)', chart.utc.slice(0, 16).replace('T', ' ')],
  ];
  if (!meta.unknown) {
    if (chart.equationOfTime != null) {
      const offset = B.tzOffsetMinutes(B.jdToMs(chart.jd), tz);
      rows.push(['เวลาที่ใช้หาเสาวันและยาม', `เวลาสุริยะจริง ${hhmm(chart.localUsed)} น. ลองจิจูด ${input.longitude.toFixed(2)}° แก้เวลา ${signed(input.longitude * 4 - offset)} นาที สมการเวลา ${signed(chart.equationOfTime)} นาที`]);
    } else {
      rows.push(['เวลาที่ใช้หาเสาวันและยาม', `เวลานาฬิกา ${hhmm(chart.localUsed)} น.`]);
    }
  }
  const m = Math.floor(B.mod(chart.sunLongitude - 315, 360) / 30);
  const pj = jdWall(chart.jie.prevJD, tz), nj = jdWall(chart.jie.nextJD, tz);
  const lc = jdWall(B.solarTermJD(chart.baziYear, 315), tz);
  const jieName = (lon) => { const n = B.JIE_NAMES[lon]; return `${zh(n)} ${T.JIE[n]}`; };
  rows.push(
    ['ลองจิจูดดวงอาทิตย์', `${chart.sunLongitude.toFixed(2)}° อยู่ในเดือน ${ch(B.BRANCHES[(m + 2) % 12])}`],
    ['สารทเริ่มเดือนก่อนหน้า', `${jieName(chart.jie.prevLon)} ${thDate(pj, true)} ${hhmm(pj)} น.`],
    ['สารทเริ่มเดือนถัดไป', `${jieName(chart.jie.nextLon)} ${thDate(nj, true)} ${hhmm(nj)} น.`],
    ['ปีปาจื้อ', `${pair(chart.names.year)} เริ่มที่ลี่ชุน ${thDate(lc, true)} ${hhmm(lc)} น.`],
    ['เกิด 23:00–23:59 น.', input.lateZiRule === 'sameDay' ? 'นับเป็นวันเดิม' : 'นับเป็นวันถัดไป'],
    ['กฎที่ใช้', `bazi-core.js ${VERSION} ก้านแฝง 60/30/10 และ 70/30 เกณฑ์กำลัง ${B.STRENGTH_LEVELS.map((l) => l.min).filter((x) => x > 0).sort((a, b) => a - b).join(' ')}`],
  );
  return `<details class="calc span-2">
    <summary>รายละเอียดการคำนวณ</summary>
    <div class="calc-body">
      <dl>${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>
      ${dial(chart.sunLongitude)}
    </div>
  </details>`;
}

// ───────── เริ่มทำงาน ─────────
setupForm();
$('chart').addEventListener('click', onChartClick);
$('back-now').addEventListener('click', backToNow);
$('form-box').addEventListener('toggle', syncFormBox);
wide.addEventListener('change', syncFormBox);
renderNow();
setInterval(() => { if (mode === 'now') renderNow(); }, 15000);

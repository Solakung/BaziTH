// ชุดทดสอบของ assets/reading.js (คำอ่านภาษาง่ายและถามดวง) — รันด้วย: npm test
// ตรวจกฎ จริยธรรม (บทที่ 18) และการแยกคำถามภาษาไทย ส่วนน้ำเสียงของข้อความต้องให้คนอ่านตรวจ
import * as B from '../src/bazi-core.js';
import * as R from '../assets/reading.js';
import * as T from '../assets/terms.js';

let pass = 0, fail = 0;
const check = (label, got, want) => {
  const ok = typeof want === 'function' ? want(got) : JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  else { fail++; console.log(`FAIL ${label}\n  ได้:  ${JSON.stringify(got)}${typeof want === 'function' ? '' : `\n  ควรได้: ${JSON.stringify(want)}`}`); }
};
const NOW = { y: 2026, m: 10, d: 10, h: 15, mi: 51 };
const ctx = (input) => {
  const chart = B.computeChart({ timeZone: 'Asia/Bangkok', ...input });
  return R.makeContext({ chart, A: B.analyze(chart), now: NOW });
};
const T1 = ctx({ year: 1995, month: 3, day: 15, hour: 14, minute: 30, gender: 'M' });

// ───── ผังตัวอย่างบทที่ 16: เจ้าวัน 乙 แข็งมาก ─────
check('T1 schools: agreed element is fire only', T1.fav, [1]);
check('T1 schools: follow-strong', T1.schools.follow.fav, [0, 4, 1]);
check('T1 schools: normal-strong', T1.schools.normal.fav, [1, 2, 3]);
const y2026 = R.readTopic(T1, 'overall', { type: 'year', offset: 0 });
check('T1 2026 is favorable', y2026.level, (n) => n >= 4);
check('T1 2026 clashes the 丙子 luck pillar', y2026.why.some((w) => w.includes('岁运相冲')), true);
check('T1 2026 note about many changes', y2026.readings.at(-1).notes.some((n) => n.includes('ปะทะกับวัยจร')), true);
const dec = R.readTopic(T1, 'overall', { type: 'decade', offset: 0 });
check('T1 next luck 乙亥 repeats the year pillar (伏吟)', dec.readings.at(-1).text.includes('ซ้ำรอยเสาปี'), true);
check('T1 persona warning follows strength (ch. 16 wording)', R.easySummary(T1).persona.text.includes('ยึดวิธีของตัวเองมากเกินไป'), true);

// ───── ดาวคู่ครองตามเพศ (บทที่ 8) ─────
for (const g of ['M', 'F']) {
  const c = ctx({ year: 1990, month: 6, day: 20, hour: 8, minute: 15, gender: g });
  const el = T.ELEMENT[B.mod(c.E + (g === 'M' ? 2 : 3), 5)].th; // ชายดูทรัพย์ (ธาตุที่ข่ม) หญิงดูอำนาจ (ธาตุที่ข่มเจ้าวัน)
  const natal = R.readTopic(c, 'love', { type: 'year', offset: 0 }).readings[0].text;
  check(`${g}: spouse element is ${g === 'M' ? 'wealth' : 'power'} (${el})`, natal.includes(`${g === 'M' ? 'ผู้ชายจากธาตุเงิน' : 'ผู้หญิงจากธาตุหน้าที่'}`) && natal.includes(`ธาตุ${el}`), true);
}

// ───── จริยธรรม ─────
const teen = ctx({ year: 2011, month: 8, day: 3, hour: 10, minute: 0, gender: 'F' });
check('minor: love refused in engine', R.readTopic(teen, 'love', { type: 'year', offset: 0 }).error, R.GUARD_TEXT.minor);
check('intent filtered by topic', R.readTopic(T1, 'career', { type: 'year', offset: 0 }, 'meet').headline.startsWith('มีโอกาสเจอคนใหม่'), false);
const banned = /ห้ามลงทุน|ควรลงทุน|ซื้อหุ้น|จะตาย|เสียชีวิต|เป็นโรค|ตั้งครรภ์/;

// ───── ทุกหัวข้อ ทุกช่วงเวลา บนผังสุ่ม: ไม่พัง ข้อความครบ ไม่มีคำต้องห้าม และกำหนดได้ ─────
let seed = 2026;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const periods = [{ type: 'day', offset: 0 }, { type: 'day', offset: 1 }, { type: 'month', offset: 0 }, { type: 'month', offset: 1 },
  { type: 'month', Y: 2027, m: 3 }, { type: 'year', offset: 0 }, { type: 'year', offset: 1 }, { type: 'year', Y: 2030 }, { type: 'decade', offset: 0 }];
const counts = [0, 0, 0, 0, 0, 0];
let problems = 0, total = 0, extremeNoAgreement = null;
for (let i = 0; i < 300; i++) {
  const input = { year: 1950 + Math.floor(rnd() * 60), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28),
    hour: rnd() < 0.1 ? null : Math.floor(rnd() * 24), minute: 30, gender: ['M', 'F', null][Math.floor(rnd() * 3)] };
  let c;
  try { c = ctx(input); } catch (e) { problems++; console.log('context', input, e.message); continue; }
  if (c.schools && !c.fav.length && !extremeNoAgreement) extremeNoAgreement = c;
  for (const t of R.TOPICS) for (const q of periods) {
    let r;
    try { r = R.readTopic(c, t.key, q); } catch (e) { problems++; if (problems < 4) console.log('throw', input, t.key, q, e.stack); continue; }
    if (r.error) continue;
    total++;
    counts[r.level]++;
    const text = [r.headline, ...r.readings.flatMap((x) => [x.text ?? '', ...(x.lines ?? []).map((l) => l.text), ...(x.notes ?? [])]), ...r.actions].join(' ');
    const bad = !r.headline || r.cards.length < 2 || !r.actions.length || r.level < 1 || r.level > 5
      || /undefined|NaN|null/.test(text) || banned.test(text);
    if (bad) { problems++; if (problems < 4) console.log('bad reading', input, t.key, q, text.slice(0, 200)); }
  }
}
check('random sweep: no crash, no empty or banned text', problems, 0);
check('random sweep: readings produced', total, (n) => n > 15000);
const share = counts.slice(1).map((n) => n / total);
check('levels spread (each level 5–45%)', share.map((x) => +x.toFixed(2)), (a) => a.every((x) => x >= 0.05 && x <= 0.45));
check('deterministic', JSON.stringify(R.readTopic(T1, 'money', { type: 'year', offset: 1 }, 'business')), JSON.stringify(R.readTopic(T1, 'money', { type: 'year', offset: 1 }, 'business')));
// หาผังอ่อนมากที่สองแนวไม่มีธาตุตรงกันเลย ถ้าผังสุ่มชุดแรกยังไม่เจอ
for (let i = 0; !extremeNoAgreement && i < 4000; i++) {
  const c = ctx({ year: 1950 + (i % 60), month: 1 + (i % 12), day: 1 + ((i * 7) % 28), hour: (i * 5) % 24, minute: 0, gender: 'M' });
  if (c.schools && !c.fav.length) extremeNoAgreement = c;
}
check('found an extreme chart without agreement', !!extremeNoAgreement, true);
if (extremeNoAgreement) {
  const e = R.easySummary(extremeNoAgreement);
  check('extreme chart without agreement: no helper tiles, schools shown', [e.fav.length, !!e.schools], [0, true]);
  check('extreme chart without agreement: readings still work', !R.readTopic(extremeNoAgreement, 'health', { type: 'year', offset: 0 }).error, true);
}

// ───── แยกคำถามภาษาไทย ─────
const P = (q) => R.parseQuestion(q, NOW, 2026);
const cases = [
  ['ปีหน้าควรเปลี่ยนงานไหม', 'career', { type: 'year', offset: 1 }, 'change_job', null],
  ['เดือนนี้ความรักเป็นยังไง', 'love', { type: 'month', offset: 0 }, null, null],
  ['10 ปีนี้ชีวิตจะเป็นยังไง', 'overall', { type: 'decade', offset: 0 }, null, null],
  ['ปี 2572 การเงินดีไหม', 'money', { type: 'year', Y: 2029 }, null, null],
  ['พรุ่งนี้สอบจะผ่านไหม', 'study', { type: 'day', offset: 1 }, 'exam', null],
  ['มีนาคมจะได้ย้ายบ้านไหม', 'travel', { type: 'month', Y: 2027, m: 3 }, 'move', null],
  ['ตุลาคมปีหน้าจะย้ายบ้านไหม', 'travel', { type: 'month', Y: 2027, m: 10 }, 'move', null],
  ['งานแต่งปีหน้า', 'love', { type: 'year', offset: 1 }, null, null],
  ['ปีนี้เหนื่อยจะตาย งานเยอะ', 'career', { type: 'year', offset: 0 }, null, null],
  ['เงินเดือน 25000 จะขึ้นไหม', 'money', null, null, null],
  ['เกิดปี 2538 ปีนี้งานเป็นยังไง', 'career', { type: 'year', offset: 0 }, null, null],
  ['อายุ 30 ปีนี้จะมีแฟนไหม', 'love', { type: 'year', offset: 0 }, 'meet', null],
  ['สอบ ก.พ. ปีนี้จะผ่านไหม', 'study', { type: 'year', offset: 0 }, 'exam', null],
  ['ปีนี้จะมีนายจ้างใหม่ไหม', 'career', { type: 'year', offset: 0 }, null, null],
  ['อีกสามปีจะรวยไหม', 'money', { type: 'year', Y: 2029 }, null, null],
  ['ปี 70 การเงินดีไหม', 'money', { type: 'year', Y: 2027 }, null, null],
  ['ขอสอบถามดวงปีนี้', 'overall', { type: 'year', offset: 0 }, null, null],
  ['คบเพื่อนแบบไหนดี', 'people', null, null, null],
  ['หัวหน้าคนใหม่จะดีไหม', 'career', null, null, null],
  ['เจ็บใจเรื่องความรัก', 'love', null, null, null],
  ['จะตายเมื่อไร', null, null, null, 'death'],
  ['พ่อเสียชีวิตไปแล้ว ปีนี้การงานจะเป็นยังไง', 'career', { type: 'year', offset: 0 }, null, null],
  ['ปวดท้องไหมเนี่ย ปีนี้สุขภาพ', 'health', { type: 'year', offset: 0 }, null, null],
  ['ปีนี้จะมีลูกไหม', 'people', { type: 'year', offset: 0 }, null, 'pregnancy'],
  ['ปีนี้จะเป็นมะเร็งไหม', 'health', { type: 'year', offset: 0 }, null, 'disease'],
  ['งวดนี้จะถูกหวยไหม', 'money', null, null, 'gamble'],
  ['ปีนี้ควรลงทุนหุ้นไหม', 'money', { type: 'year', offset: 0 }, 'business', 'invest'],
  ['จะชนะคดีไหม', null, null, null, 'legal'],
  ['ซื้อสลากออมสินดีไหม', 'money', null, null, null],
];
for (const [q, topic, period, intent, guard] of cases) {
  const p = P(q);
  check(`parse "${q}"`, [p.topic, p.period, p.intent, p.guard], [topic, period, intent, guard]);
}
check('parse "เขาจะกลับมาไหม" → note about the other person', P('เขาจะกลับมาไหม').soft, ['other']);

console.log(`${pass} ผ่าน · ${fail} ไม่ผ่าน`);
if (fail) process.exit(1);

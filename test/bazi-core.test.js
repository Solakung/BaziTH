// ชุดทดสอบของ bazi-core.js (ตรงกับภาคผนวก ก ของตำรา) — รันด้วย: npm test
import * as B from '../src/bazi-core.js';

let pass = 0, fail = 0;
const check = (label, got, want) => {
  if (got === want) pass++;
  else { fail++; console.log(`FAIL ${label}\n  ได้:  ${got}\n  ควรได้: ${want}`); }
};
const pillars = (c) => [c.names.year, c.names.month, c.names.day, c.names.hour ?? '—'].join(' ');

// ภาคผนวก ก: สี่เสา
const vectors = [
  ['T1', { year: 1995, month: 3, day: 15, hour: 14, minute: 30 }, '乙亥 己卯 乙巳 癸未'],
  ['T2', { year: 2000, month: 2, day: 4, hour: 19, minute: 0 }, '己卯 丁丑 壬辰 庚戌'],
  ['T3', { year: 2000, month: 2, day: 4, hour: 20, minute: 30 }, '庚辰 戊寅 壬辰 庚戌'],
  ['T4', { year: 2026, month: 2, day: 4, hour: 2, minute: 30 }, '乙巳 己丑 己酉 乙丑'],
  ['T5', { year: 2026, month: 2, day: 4, hour: 3, minute: 30 }, '丙午 庚寅 己酉 丙寅'],
  ['T6', { year: 1990, month: 7, day: 20, hour: 23, minute: 30, lateZiRule: 'nextDay' }, '庚午 癸未 丁亥 庚子'],
  ['T7', { year: 1990, month: 7, day: 20, hour: 23, minute: 30, lateZiRule: 'sameDay' }, '庚午 癸未 丙戌 庚子'],
  ['T8', { year: 1992, month: 8, day: 8, hour: 9, minute: 20 }, '壬申 戊申 丙辰 癸巳'],
  ['T9', { year: 1992, month: 8, day: 8, hour: 9, minute: 20, longitude: 98.99 }, '壬申 戊申 丙辰 壬辰'],
  ['T10', { year: 1949, month: 10, day: 1, hour: 15, minute: 0, timeZone: 'Asia/Shanghai' }, '己丑 癸酉 甲子 壬申'],
  ['T11', { year: 1985, month: 5, day: 5, hour: null }, '乙丑 庚辰 甲辰 —'],
  ['T12', { year: 2026, month: 10, day: 10, hour: 11, minute: 54 }, '丙午 戊戌 丁巳 丙午'],
];
for (const [id, input, want] of vectors) check(id, pillars(B.computeChart({ timeZone: 'Asia/Bangkok', ...input })), want);
check('T11 warning', B.computeChart({ year: 1985, month: 5, day: 5, hour: null }).warnings.map((w) => w.code).join(), 'JIE_ON_BIRTHDAY');

// ภาคผนวก ก: วัยจร
const luck = (gender) => {
  const L = B.luckPillars(B.computeChart({ year: 1995, month: 3, day: 15, hour: 14, minute: 30, gender }));
  const s = L.startDate;
  return `${L.forward ? 'forward' : 'backward'} ${s.y}-${s.m}-${s.d} ${L.pillars.map((p) => p.name).join(' ')}`;
};
check('L1', luck('M'), 'backward 1998-4-16 戊寅 丁丑 丙子 乙亥 甲戌 癸酉 壬申 辛未');
check('L2', luck('F'), 'forward 2002-3-10 庚辰 辛巳 壬午 癸未 甲申 乙酉 丙戌 丁亥');

// จุดอ้างอิงเสาวันและเสาปี
check('day 1900-01-01', B.gzName(B.dayPillarIndex(1900, 1, 1)), '甲戌');
check('day 1949-10-01', B.gzName(B.dayPillarIndex(1949, 10, 1)), '甲子');
check('day 2000-01-01', B.gzName(B.dayPillarIndex(2000, 1, 1)), '戊午');
check('year 2026', B.gzName(B.yearPillarIndex(2026)), '丙午');

// ลี่ชุน 2026 = 4 ก.พ. 03:02 เวลาไทย (04:02 เวลาฮ่องกง)
const lichun = new Date(B.jdToMs(B.solarTermJD(2026, 315)) + 7 * 3600e3).toISOString().slice(0, 16);
check('lichun 2026 (BKK)', lichun, '2026-02-04T03:02');

// สูตรธาตุนาอินตรงกับชื่อทั้ง 60 คู่
for (let i = 0; i < 60; i++) check(`nayin ${i}`, '木火土金水'[B.nayinElement(i)], B.nayinOf(i).slice(-1));

// ผังตัวอย่างในบทที่ 11 และ 16
const A = B.analyze(B.computeChart({ year: 1995, month: 3, day: 15, hour: 14, minute: 30, gender: 'M' }));
check('strength ratio', A.favorable.strength.ratio, 0.737);
check('strength level', A.favorable.strength.level, 'veryStrong');

console.log(`${pass} ผ่าน · ${fail} ไม่ผ่าน`);
if (fail) process.exit(1);

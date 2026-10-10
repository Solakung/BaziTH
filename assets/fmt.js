// ตัวช่วยแสดงผลที่หน้าเว็บใช้ร่วมกัน: อักษรจีนระบายสีธาตุ วันที่แบบไทย และเวลาตามเขตเวลา
import * as B from '../src/bazi-core.js';
import * as T from './terms.js';

export const TZ_TH = 'Asia/Bangkok';
export const $ = (id) => document.getElementById(id);
export const pad = (n) => String(n).padStart(2, '0');
export const zh = (s) => `<span class="zh" lang="zh-Hans">${s}</span>`;
export const elOfChar = (c) => {
  const s = B.STEMS.indexOf(c);
  if (s >= 0) return s >> 1;
  const b = B.BRANCHES.indexOf(c);
  if (b >= 0) return B.BRANCH_ELEMENT[b];
  return T.ELEMENT.findIndex((e) => e.zh === c);
};
export const ch = (c) => `<span class="zh el-${elOfChar(c)}" lang="zh-Hans">${c}</span>`;
export const pair = (name) => `<span class="pair">${[...name].map(ch).join('')}</span>`;
export const elWord = (e) => `<span class="el-${e}">${T.ELEMENT[e].th}</span>`;
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** ปี พ.ศ. ของวันที่ ค.ศ. — ก่อน ค.ศ. 1941 ไทยขึ้นปีใหม่ 1 เมษายน (ตำราบทที่ 7.6) */
export const beYear = (y, m) => (y < 1941 && m <= 3 ? y + 542 : y + 543);
export const thDate = (t, short = false) => `${t.d} ${(short ? T.MONTHS_SHORT : T.MONTHS)[t.m - 1]} ${beYear(t.y, t.m)}`;
export const thMonthYear = (t) => `${T.MONTHS_SHORT[t.m - 1]} ${beYear(t.y, t.m)}`;
export const hhmm = (t) => `${pad(t.h)}:${pad(t.mi)}`;
export const weekday = (t) => T.WEEKDAYS[new Date(Date.UTC(t.y, t.m - 1, t.d)).getUTCDay()];
export const stamp = (t) => Date.UTC(t.y, t.m - 1, t.d, t.h ?? 0, t.mi ?? 0);

const formatters = new Map();
/** เวลานาฬิกาของเขตเวลา timeZone ณ เวลา ms */
export function wall(ms, timeZone) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    formatters.set(timeZone, f);
  }
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute };
}
export const jdWall = (jd, timeZone) => wall(B.jdToMs(jd), timeZone);
export const nowWall = () => wall(Date.now(), TZ_TH);

/** แถบสีบอกธาตุ ใช้ใต้ผังและในหน้ามือใหม่ */
export const legend = () => `<span class="legend">${T.ELEMENT.map((e, i) => `<span class="lg-item el-${i}"><i aria-hidden="true"></i>${e.th}</span>`).join('')}</span>`;

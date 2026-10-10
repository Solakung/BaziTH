/**
 * bazi-core.js — โค้ดอ้างอิงประกอบ "ตำราปาจื้อ (八字) ฉบับนักพัฒนาแอป" (docs/bazi-textbook-th.md)
 *
 * - ไม่มี dependency ใช้ได้ทั้งเบราว์เซอร์และ Node (ES module)
 * - ดัชนีทั้งไฟล์: ก้านฟ้า 0–9 (甲=0) · กิ่งดิน 0–11 (子=0) · ธาตุ 0–4 (ไม้ ไฟ ดิน ทอง น้ำ)
 * - ตำแหน่งดวงอาทิตย์: VSOP87 แบบย่อตาม Meeus (Astronomical Algorithms, App. III)
 *   + นูเทชันแบบย่อ + aberration · ตรวจกับเวลาสารทของหอดูดาวฮ่องกงปี 2026 คลาดไม่เกินราว 1 นาที
 * - ชั้นวิเคราะห์ (กำลังเจ้าวัน ธาตุให้คุณ) เป็น heuristic รุ่นแรก ควรให้ผู้รู้ปรับเกณฑ์
 *
 * ตัวอย่าง:
 *   import { computeChart, analyze, luckPillars } from './bazi-core.js';
 *   const c = computeChart({ year: 1995, month: 3, day: 15, hour: 14, minute: 30,
 *                            timeZone: 'Asia/Bangkok', gender: 'M' });
 *   c.names            // { year: '乙亥', month: '己卯', day: '乙巳', hour: '癸未' }
 *   analyze(c)         // สิบเทพ ก้านแฝง ความสัมพันธ์ กำลังเจ้าวัน ธาตุให้คุณ ดาวพิเศษ
 *   luckPillars(c)     // วัยจร 10 ปี: ทิศ วันเริ่ม และ 8 เสาแรก
 *
 * ทดสอบ: npm test
 */

// ───────────────────────── ตารางพื้นฐาน ─────────────────────────
export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const ELEMENTS = ['木', '火', '土', '金', '水'];
export const ELEMENTS_TH = ['ไม้', 'ไฟ', 'ดิน', 'ทอง', 'น้ำ'];
export const ZODIAC_TH = ['ชวด', 'ฉลู', 'ขาล', 'เถาะ', 'มะโรง', 'มะเส็ง', 'มะเมีย', 'มะแม', 'วอก', 'ระกา', 'จอ', 'กุน'];
export const TEN_GODS = ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印'];
export const LIFE_STAGES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
export const NAYIN = ['海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土', '白蜡金', '杨柳木',
  '泉中水', '屋上土', '霹雳火', '松柏木', '长流水', '沙中金', '山下火', '平地木', '壁上土', '金箔金',
  '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'];

export const mod = (x, n) => ((x % n) + n) % n;
export const stemElement = (s) => s >> 1;
export const isYangStem = (s) => (s & 1) === 0;
export const BRANCH_ELEMENT = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
/** ก้านแฝง เรียง [หลัก, กลาง, เศษ] */
export const HIDDEN_STEMS = [[9], [5, 9, 7], [0, 2, 4], [1], [4, 1, 9], [2, 6, 4], [3, 5], [5, 3, 1], [6, 8, 4], [7], [4, 7, 3], [8, 0]];
export const HIDDEN_WEIGHTS = { 1: [1], 2: [0.7, 0.3], 3: [0.6, 0.3, 0.1] };

/** ดัชนีหกสิบกะจื้อจากก้านฟ้าและกิ่งดิน (ต้องมีขั้วตรงกัน) */
export const gzIndex = (s, b) => mod(6 * s - 5 * b, 60);
export const gzName = (i) => STEMS[i % 10] + BRANCHES[i % 12];
export const nayinOf = (i) => NAYIN[i >> 1];
/** ธาตุนาอินจากสูตรตัวเลข: ก้าน 甲乙=1…壬癸=5 · กิ่ง 子丑午未=1 寅卯申酉=2 辰巳戌亥=3 */
export function nayinElement(i) {
  const s = (i % 10 >> 1) + 1;
  const b = [1, 1, 2, 2, 3, 3][(i % 12) % 6];
  const n = mod(s + b - 1, 5) + 1; // 1 ไม้ 2 ทอง 3 น้ำ 4 ไฟ 5 ดิน
  return [0, 3, 4, 1, 2][n - 1];
}

// ───────────────────────── วันจูเลียน ─────────────────────────
/** Julian Day Number ของวันที่ตามปฏิทินเกรกอเรียน (ค่า ณ เที่ยงวัน) */
export function jdn(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}
export const msToJD = (ms) => ms / 864e5 + 2440587.5;
export const jdToMs = (jd) => (jd - 2440587.5) * 864e5;
/** เสาวันของวันที่ตามปฏิทิน (ดัชนี 0–59) */
export const dayPillarIndex = (y, m, d) => mod(jdn(y, m, d) + 49, 60);
/** เสาปีจร (流年) ของปี ค.ศ. Y — มีผลตั้งแต่ลี่ชุนของปีนั้น */
export const yearPillarIndex = (Y) => mod(Y - 4, 60);

// ───────────────────────── ตำแหน่งดวงอาทิตย์ ─────────────────────────
const EARTH_L = [
  [[175347046, 0, 0], [3341656, 4.6692568, 6283.07585], [34894, 4.6261, 12566.1517], [3497, 2.7441, 5753.3849], [3418, 2.8289, 3.5231], [3136, 3.6277, 77713.7715], [2676, 4.4181, 7860.4194], [2343, 6.1352, 3930.2097], [1324, 0.7425, 11506.7698], [1273, 2.0371, 529.691], [1199, 1.1096, 1577.3435], [990, 5.233, 5884.927], [902, 2.045, 26.298], [857, 3.508, 398.149], [780, 1.179, 5223.694], [753, 2.533, 5507.553], [505, 4.583, 18849.228], [492, 4.205, 775.523], [357, 2.92, 0.067], [317, 5.849, 11790.629], [284, 1.899, 796.298], [271, 0.315, 10977.079], [243, 0.345, 5486.778], [206, 4.806, 2544.314], [205, 1.869, 5573.143], [202, 2.458, 6069.777], [156, 0.833, 213.299], [132, 3.411, 2942.463], [126, 1.083, 20.775], [115, 0.645, 0.98], [103, 0.636, 4694.003], [102, 0.976, 15720.839], [102, 4.267, 7.114], [99, 6.21, 2146.17], [98, 0.68, 155.42], [86, 5.98, 161000.69], [85, 1.3, 6275.96], [85, 3.67, 71430.7], [80, 1.81, 17260.15], [79, 3.04, 12036.46], [75, 1.76, 5088.63], [74, 3.5, 3154.69], [74, 4.68, 801.82], [70, 0.83, 9437.76], [62, 3.98, 8827.39], [61, 1.82, 7084.9], [57, 2.78, 6286.6], [56, 4.39, 14143.5], [56, 3.47, 6279.55], [52, 0.19, 12139.55], [52, 1.33, 1748.02], [51, 0.28, 5856.48], [49, 0.49, 1194.45], [41, 5.37, 8429.24], [41, 2.4, 19651.05], [39, 6.17, 10447.39], [37, 6.04, 10213.29], [37, 2.57, 1059.38], [36, 1.71, 2352.87], [36, 1.78, 6812.77], [33, 0.59, 17789.85], [30, 0.44, 83996.85], [30, 2.74, 1349.87], [25, 3.16, 4690.48]],
  [[628331966747, 0, 0], [206059, 2.678235, 6283.07585], [4303, 2.6351, 12566.1517], [425, 1.59, 3.523], [119, 5.796, 26.298], [109, 2.966, 1577.344], [93, 2.59, 18849.23], [72, 1.14, 529.69], [68, 1.87, 398.15], [67, 4.41, 5507.55], [59, 2.89, 5223.69], [56, 2.17, 155.42], [45, 0.4, 796.3], [36, 0.47, 775.52], [29, 2.65, 7.11], [21, 5.34, 0.98], [19, 1.85, 5486.78], [19, 4.97, 213.3], [17, 2.99, 6275.96], [16, 0.03, 2544.31], [16, 1.43, 2146.17], [15, 1.21, 10977.08], [12, 2.83, 1748.02], [12, 3.26, 5088.63], [12, 5.27, 1194.45], [12, 2.08, 4694], [11, 0.77, 553.57], [10, 1.3, 6286.6], [10, 4.24, 1349.87], [9, 2.7, 242.73], [9, 5.64, 951.72], [8, 5.3, 2352.87], [6, 2.65, 9437.76], [6, 4.67, 4690.48]],
  [[52919, 0, 0], [8720, 1.0721, 6283.0758], [309, 0.867, 12566.152], [27, 0.05, 3.52], [16, 5.19, 26.3], [16, 3.68, 155.42], [10, 0.76, 18849.23], [9, 2.06, 77713.77], [7, 0.83, 775.52], [5, 4.66, 1577.34], [4, 1.03, 7.11], [4, 3.44, 5573.14], [3, 5.14, 796.3], [3, 6.05, 5507.55], [3, 1.19, 242.73], [3, 6.12, 529.69], [3, 0.31, 398.15], [3, 2.28, 553.57], [2, 4.38, 5223.69], [2, 3.75, 0.98]],
  [[289, 5.844, 6283.076], [35, 0, 0], [17, 5.49, 12566.15], [3, 5.2, 155.42], [1, 4.72, 3.52], [1, 5.3, 18849.23], [1, 5.97, 242.73]],
  [[114, 3.142, 0], [8, 4.13, 6283.08], [1, 3.84, 12566.15]],
  [[1, 3.14, 0]],
];
const EARTH_R = [
  [[100013989, 0, 0], [1670700, 3.0984635, 6283.07585], [13956, 3.05525, 12566.1517], [3084, 5.1985, 77713.7715], [1628, 1.1739, 5753.3849], [1576, 2.8469, 7860.4194], [925, 5.453, 11506.77], [542, 4.564, 3930.21], [472, 3.661, 5884.927], [346, 0.964, 5507.553], [329, 5.9, 5223.694], [307, 0.299, 5573.143], [243, 4.273, 11790.629], [212, 5.847, 1577.344], [186, 5.022, 10977.079], [175, 3.012, 18849.228], [110, 5.055, 5486.778], [98, 0.89, 6069.78], [86, 5.69, 15720.84], [86, 1.27, 161000.69], [65, 0.27, 17260.15], [63, 0.92, 529.69], [57, 2.01, 83996.85], [56, 5.24, 71430.7], [49, 3.25, 2544.31], [47, 2.58, 775.52], [45, 5.54, 9437.76], [43, 6.01, 6275.96], [39, 5.36, 4694], [38, 2.39, 8827.39], [37, 0.83, 19651.05], [37, 4.9, 12139.55], [36, 1.67, 12036.46], [35, 1.84, 2942.46], [33, 0.24, 7084.9], [32, 0.18, 5088.63], [32, 1.78, 398.15], [28, 1.21, 6286.6], [28, 1.9, 6279.55], [26, 4.59, 10447.39]],
  [[103019, 1.10749, 6283.07585], [1721, 1.0644, 12566.1517], [702, 3.142, 0], [32, 1.02, 18849.23], [31, 2.84, 5507.55], [25, 1.32, 5223.69], [18, 1.42, 1577.34], [10, 5.91, 10977.08], [9, 1.42, 6275.96], [9, 0.27, 5486.78]],
  [[4359, 5.7846, 6283.0758], [124, 5.579, 12566.152], [12, 3.14, 0], [9, 3.63, 77713.77], [6, 1.87, 5573.14], [3, 5.47, 18849.23]],
  [[145, 4.273, 6283.076], [7, 3.92, 12566.15]],
  [[4, 2.56, 6283.08]],
];
function vsop(series, tau) {
  let sum = 0, tp = 1;
  for (const terms of series) {
    let s = 0;
    for (const [A, B, C] of terms) s += A * Math.cos(B + C * tau);
    sum += s * tp;
    tp *= tau;
  }
  return sum / 1e8;
}
/** ΔT = TT − UT เป็นวินาที (พหุนาม Espenak & Meeus) ช่วง ค.ศ. 1900–2150 คลาดไม่เกินราว 10 วินาที */
export function deltaT(year) {
  let t;
  if (year < 1900) { t = year - 1860; return 7.62 + 0.5737 * t - 0.251754 * t * t + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4 + t ** 5 / 233174; }
  if (year < 1920) { t = year - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
  if (year < 1941) { t = year - 1920; return 21.2 + 0.84493 * t - 0.0761 * t * t + 0.0020936 * t ** 3; }
  if (year < 1961) { t = year - 1950; return 29.07 + 0.407 * t - t * t / 233 + t ** 3 / 2547; }
  if (year < 1986) { t = year - 1975; return 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718; }
  if (year < 2005) { t = year - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
  if (year < 2050) { t = year - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
  const u = (year - 1820) / 100;
  return year < 2150 ? -20 + 32 * u * u - 0.5628 * (2150 - year) : -20 + 32 * u * u;
}
const RAD = Math.PI / 180;
/** ลองจิจูดสุริยวิถีปรากฏของดวงอาทิตย์ (องศา) และค่าที่ใช้ต่อ ณ เวลา jdUT */
export function sunPosition(jdUT) {
  const jde = jdUT + deltaT(2000 + (jdUT - 2451545) / 365.25) / 86400;
  const tau = (jde - 2451545) / 365250;
  const T = tau * 10;
  const L = vsop(EARTH_L, tau);
  const R = vsop(EARTH_R, tau);
  const om = (125.04452 - 1934.136261 * T) * RAD;
  const ls = (280.4665 + 36000.7698 * T) * RAD;
  const lm = (218.3165 + 481267.8813 * T) * RAD;
  const dpsi = (-17.2 * Math.sin(om) - 1.32 * Math.sin(2 * ls) - 0.23 * Math.sin(2 * lm) + 0.21 * Math.sin(2 * om)) / 3600;
  const deps = (9.2 * Math.cos(om) + 0.57 * Math.cos(2 * ls) + 0.1 * Math.cos(2 * lm) - 0.09 * Math.cos(2 * om)) / 3600;
  const geometric = mod(L / RAD + 180 - 0.09033 / 3600, 360);
  const lambda = mod(geometric + dpsi - 20.4898 / 3600 / R, 360);
  const eps = 23.4392911 - (46.815 * T + 0.00059 * T * T - 0.001813 * T ** 3) / 3600 + deps;
  return { lambda, geometric, R, dpsi, eps, tau };
}
export const sunLongitude = (jdUT) => sunPosition(jdUT).lambda;

/** สมการเวลา (นาที) = เวลาสุริยะปรากฏ − เวลาสุริยะเฉลี่ย (Meeus บทที่ 28) */
export function equationOfTime(jdUT) {
  const { lambda, dpsi, eps, tau } = sunPosition(jdUT);
  const L0 = mod(280.4664567 + 360007.6982779 * tau + 0.03032028 * tau ** 2 + tau ** 3 / 49931 - tau ** 4 / 15300 - tau ** 5 / 2e6, 360);
  const alpha = mod(Math.atan2(Math.cos(eps * RAD) * Math.sin(lambda * RAD), Math.cos(lambda * RAD)) / RAD, 360);
  const E = L0 - 0.0057183 - alpha + dpsi * Math.cos(eps * RAD);
  return (mod(E + 180, 360) - 180) * 4;
}

function solveLongitude(lon, jdGuess) {
  let jd = jdGuess;
  for (let i = 0; i < 30; i++) {
    const diff = mod(lon - sunLongitude(jd) + 180, 360) - 180;
    jd += diff / 0.98564736;
    if (Math.abs(diff) < 1e-8) break;
  }
  return jd;
}
/** เวลา (JD, UT) ที่ดวงอาทิตย์ถึงลองจิจูด lon ภายในปี ค.ศ. Y เช่น lon = 315 คือลี่ชุน */
export function solarTermJD(Y, lon) {
  const daysAfterEquinox = lon < 280 ? lon : lon - 360;
  return solveLongitude(lon, jdn(Y, 3, 20) + daysAfterEquinox * 1.0146);
}
/** สารทเริ่มเดือน (节) ก่อนหน้าและถัดไปของเวลา jdUT */
export function jieAround(jdUT) {
  const lam = sunLongitude(jdUT);
  const prevLon = mod(Math.floor((lam - 15) / 30) * 30 + 15, 360);
  const prevJD = solveLongitude(prevLon, jdUT - mod(lam - prevLon, 360) / 0.9856);
  const nextLon = mod(prevLon + 30, 360);
  const nextJD = solveLongitude(nextLon, prevJD + 30.4);
  return { prevLon, prevJD, nextLon, nextJD };
}
export const JIE_NAMES = { 315: '立春', 345: '惊蛰', 15: '清明', 45: '立夏', 75: '芒种', 105: '小暑', 135: '立秋', 165: '白露', 195: '寒露', 225: '立冬', 255: '大雪', 285: '小寒' };

// ───────────────────────── เวลาและไทม์โซน ─────────────────────────
/** ออฟเซ็ตไทม์โซน (นาที) ของ IANA zone ณ เวลา ms */
export function tzOffsetMinutes(ms, timeZone) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUTC - Math.floor(ms / 1000) * 1000) / 60000);
}
/** เวลานาฬิกาท้องถิ่น → ms (UTC) · timeZone เป็นชื่อ IANA หรือออฟเซ็ตเป็นนาที เช่น 420 */
export function zonedToUtcMs(y, m, d, h, mi, timeZone) {
  const wall = Date.UTC(y, m - 1, d, h, mi);
  if (typeof timeZone === 'number') return wall - timeZone * 60000;
  let guess = wall;
  for (let i = 0; i < 4; i++) {
    const next = wall - tzOffsetMinutes(guess, timeZone) * 60000;
    if (next === guess) break;
    guess = next;
  }
  return guess;
}
const fields = (ms) => { const t = new Date(ms); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes() }; };

// ───────────────────────── คำนวณสี่เสา ─────────────────────────
/**
 * @param {object} p
 * @param {number} p.year, p.month, p.day   วันเกิดตามปฏิทิน ค.ศ. (เวลานาฬิกาท้องถิ่น)
 * @param {number|null} p.hour, p.minute     ไม่ทราบเวลาให้ hour = null (ได้ 3 เสา)
 * @param {string|number} p.timeZone         IANA เช่น 'Asia/Bangkok' หรือออฟเซ็ตนาที
 * @param {number|null} p.longitude          องศาตะวันออก (กรุงเทพฯ ≈ 100.5) ใช้คิดเวลาสุริยะจริง
 * @param {boolean} p.trueSolarTime          ค่าเริ่มต้น: ใช้เมื่อมีลองจิจูด
 * @param {'nextDay'|'sameDay'} p.lateZiRule 23:00–23:59 เปลี่ยนวันเลย (子平) หรือยังเป็นวันเดิม (夜子时)
 * @param {'M'|'F'|null} p.gender            ใช้หาทิศวัยจร
 */
export function computeChart(p) {
  const { year, month, day, minute = 0, timeZone = 'Asia/Bangkok', longitude = null, lateZiRule = 'nextDay', gender = null } = p;
  const hourKnown = p.hour != null;
  const trueSolarTime = p.trueSolarTime ?? longitude != null;
  const hour = hourKnown ? p.hour : 12;
  const utcMs = zonedToUtcMs(year, month, day, hour, hourKnown ? minute : 0, timeZone);
  const jd = msToJD(utcMs);

  // เสาปี: เปลี่ยนที่ลี่ชุน (ดวงอาทิตย์ 315°)
  const yUtc = new Date(utcMs).getUTCFullYear();
  const lichunJD = solarTermJD(yUtc, 315);
  const baziYear = jd < lichunJD ? yUtc - 1 : yUtc;
  const yearIdx = yearPillarIndex(baziYear);

  // เสาเดือน: นับจากลี่ชุนทีละ 30°
  const lam = sunLongitude(jd);
  const m = Math.floor(mod(lam - 315, 360) / 30); // 0 = เดือน寅
  const monthIdx = gzIndex(mod((yearIdx % 10) * 2 + 2 + m, 10), mod(m + 2, 12));

  // เสาวันและยาม: เวลาท้องถิ่น (นาฬิกา หรือ สุริยะจริง)
  const clock = { y: year, m: month, d: day, h: hour, mi: hourKnown ? minute : 0 };
  let local = clock, eot = null;
  if (hourKnown && trueSolarTime && longitude != null) {
    eot = equationOfTime(jd);
    local = fields(utcMs + (longitude * 4 + eot) * 60000);
  }
  const base = jdn(local.y, local.m, local.d);
  const late = hourKnown && local.h >= 23;
  const dayIdx = mod(base + 49 + (late && lateZiRule === 'nextDay' ? 1 : 0), 60);
  let hourIdx = null;
  if (hourKnown) {
    const hb = Math.floor((local.h + 1) / 2) % 12;
    const stemForHour = mod(base + 49 + (late ? 1 : 0), 60) % 10; // ยามชวดดึกใช้ก้านของวันถัดไปเสมอ
    hourIdx = gzIndex(mod(stemForHour * 2 + hb, 10), hb);
  }

  // คำเตือนเมื่อใกล้รอยต่อ
  const jie = jieAround(jd);
  const warnings = [];
  const minToJie = Math.min(jd - jie.prevJD, jie.nextJD - jd) * 1440;
  if (hourKnown && minToJie < 60) warnings.push({ code: 'NEAR_JIE', minutes: Math.round(minToJie) });
  if (!hourKnown) {
    const dayStart = msToJD(zonedToUtcMs(year, month, day, 0, 0, timeZone));
    if ((jie.prevJD >= dayStart && jie.prevJD < dayStart + 1) || (jie.nextJD >= dayStart && jie.nextJD < dayStart + 1)) warnings.push({ code: 'JIE_ON_BIRTHDAY' });
  }
  if (hourKnown) {
    const minsOfDay = local.h * 60 + local.mi;
    const toBoundary = Math.min(...[-60, 60, 180, 300, 420, 540, 660, 780, 900, 1020, 1140, 1260, 1380, 1500].map((b) => Math.abs(minsOfDay - b)));
    if (toBoundary < 15) warnings.push({ code: 'NEAR_HOUR_BOUNDARY', minutes: toBoundary });
    if (eot != null) {
      const hbClock = Math.floor((clock.h + 1) / 2) % 12;
      if (hbClock !== hourIdx % 12 || clock.d !== local.d) warnings.push({ code: 'SOLAR_TIME_CHANGES_HOUR', clockHourBranch: BRANCHES[hbClock] });
    }
  }

  return {
    input: { ...p, hourKnown, trueSolarTime },
    utc: new Date(utcMs).toISOString(), jd, sunLongitude: lam, baziYear,
    localUsed: local, equationOfTime: eot,
    pillars: { year: yearIdx, month: monthIdx, day: dayIdx, hour: hourIdx },
    names: { year: gzName(yearIdx), month: gzName(monthIdx), day: gzName(dayIdx), hour: hourIdx == null ? null : gzName(hourIdx) },
    jie, gender, warnings,
  };
}

// ───────────────────────── วัยจร 10 ปี ─────────────────────────
function addCalendar(t, dy, dm, dd, dh) {
  let Y = t.y + dy, M = t.m + dm;
  Y += Math.floor((M - 1) / 12);
  M = mod(M - 1, 12) + 1;
  const dim = new Date(Date.UTC(Y, M, 0)).getUTCDate();
  return fields(Date.UTC(Y, M - 1, Math.min(t.d, dim), t.h, t.mi) + (dd * 24 + dh) * 3600000);
}
/** วัยจร: หยางชาย/หยินหญิงเดินหน้า หยินชาย/หยางหญิงถอยหลัง · 3 วันจริง = 1 ปี (1 นาที = 2 ชั่วโมง) */
export function luckPillars(chart, count = 8) {
  if (!chart.gender) throw new Error('ต้องระบุเพศ (M/F) จึงหาวัยจรได้');
  const yearStem = chart.pillars.year % 10;
  const forward = isYangStem(yearStem) === (chart.gender === 'M');
  const target = forward ? chart.jie.nextJD : chart.jie.prevJD;
  const minutes = Math.abs(target - chart.jd) * 1440;
  const years = Math.floor(minutes / 4320);
  let r = minutes - years * 4320;
  const months = Math.floor(r / 360); r -= months * 360;
  const days = Math.floor(r / 12); r -= days * 12;
  const hours = Math.floor(r * 2);
  const birth = { y: chart.input.year, m: chart.input.month, d: chart.input.day, h: chart.input.hourKnown ? chart.input.hour : 12, mi: chart.input.minute ?? 0 };
  const start = addCalendar(birth, years, months, days, hours);
  const startAge = minutes / 4320;
  const list = [];
  for (let k = 1; k <= count; k++) {
    const idx = mod(chart.pillars.month + (forward ? k : -k), 60);
    list.push({ index: idx, name: gzName(idx), startAge: +(startAge + 10 * (k - 1)).toFixed(2), startDate: addCalendar(start, 10 * (k - 1), 0, 0, 0) });
  }
  return { forward, offset: { years, months, days, hours }, startDate: start, pillars: list };
}

// ───────────────────────── ชั้นวิเคราะห์ ─────────────────────────
/** สิบเทพของก้าน s เมื่อมองจากเจ้าวัน dm: 0 比肩 … 9 正印 */
export function tenGod(dm, s) {
  const rel = mod(stemElement(s) - stemElement(dm), 5);
  return rel * 2 + (isYangStem(s) === isYangStem(dm) ? 0 : 1);
}
const CHANGSHENG = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];
/** สิบสองวงจรชีวิตของก้าน s บนกิ่ง b (0 长生 … 11 养) */
export const lifeStage = (s, b) => (isYangStem(s) ? mod(b - CHANGSHENG[s], 12) : mod(CHANGSHENG[s] - b, 12));
/** สองกิ่งที่เป็นช่องว่าง (空亡) ของเสาดัชนี i */
export function voidBranches(i) {
  const b0 = mod((i % 12) - (i % 10), 12);
  return [mod(b0 + 10, 12), mod(b0 + 11, 12)];
}

const SIX_COMBINE_EL = { 0: 2, 2: 0, 3: 1, 4: 3, 5: 4, 6: 1 };
const PUNISH_GROUPS = [[2, 5, 8], [1, 10, 7]];
/** ความสัมพันธ์ระหว่างกิ่งดินสองตัว */
export function branchRelations(a, b) {
  const out = [];
  if (a === b) {
    if ([4, 6, 9, 11].includes(a)) out.push({ type: '自刑' });
    return out;
  }
  if (mod(a + b, 12) === 1) out.push({ type: '六合', element: SIX_COMBINE_EL[Math.min(a, b)] });
  if (Math.abs(a - b) === 6) out.push({ type: '六冲' });
  if (mod(a + b, 12) === 7) out.push({ type: '六害' });
  const yang = a % 2 === 0 ? a : b, other = yang === a ? b : a;
  if (mod(yang + 9, 12) === other) out.push({ type: '破' });
  if (PUNISH_GROUPS.some((g) => g.includes(a) && g.includes(b)) || (Math.min(a, b) === 0 && Math.max(a, b) === 3)) out.push({ type: '刑' });
  if (a % 4 === b % 4) out.push({ type: a % 3 === 0 || b % 3 === 0 ? '半合' : '拱合', element: [4, 3, 1, 0][a % 4] });
  return out;
}
/** ความสัมพันธ์ระหว่างก้านฟ้าสองตัว */
export function stemRelations(a, b) {
  const d = Math.abs(a - b);
  if (d === 5) return [{ type: '合', element: mod(Math.min(a, b) + 2, 5) }];
  if (d === 6) return [{ type: '冲' }];
  return [];
}
/** สามรวม (三合) และสามทิศ (三会) ที่ครบชุดในรายการกิ่ง */
export function branchGroups(branches) {
  const set = new Set(branches), out = [];
  [[8, 0, 4, 4], [11, 3, 7, 0], [2, 6, 10, 1], [5, 9, 1, 3]].forEach(([x, y, z, el]) => { if (set.has(x) && set.has(y) && set.has(z)) out.push({ type: '三合', branches: [x, y, z], element: el }); });
  [[2, 3, 4, 0], [5, 6, 7, 1], [8, 9, 10, 3], [11, 0, 1, 4]].forEach(([x, y, z, el]) => { if (set.has(x) && set.has(y) && set.has(z)) out.push({ type: '三会', branches: [x, y, z], element: el }); });
  return out;
}

/** ตำแหน่งและน้ำหนักสำหรับประเมินกำลังเจ้าวัน (heuristic v1) */
export const POSITION_WEIGHTS = { yearStem: 1, monthStem: 1, hourStem: 1, yearBranch: 1, monthBranch: 3, dayBranch: 1.5, hourBranch: 1 };
/** เกณฑ์ระดับกำลัง: ตั้งจากการกระจายของผังสุ่ม 20,000 ผัง (ค.ศ. 1950–2030) ให้ระดับสุดขั้วมีราว 5% · ค่ามัธยฐาน ≈ 0.39 */
export const STRENGTH_LEVELS = [
  { min: 0.72, key: 'veryStrong', th: 'แข็งมาก (ตรวจโครงสร้างตามแข็ง)' },
  { min: 0.45, key: 'strong', th: 'แข็ง' },
  { min: 0.33, key: 'balanced', th: 'ค่อนข้างสมดุล' },
  { min: 0.12, key: 'weak', th: 'อ่อน' },
  { min: -1, key: 'veryWeak', th: 'อ่อนมาก (ตรวจโครงสร้างตามอ่อน)' },
];
export const BALANCE_PIVOT = 0.39;
/**
 * น้ำหนักธาตุรวมในผัง (ไม่นับเจ้าวัน)
 * กฎแปรธาตุ v1: สามรวม/สามทิศที่ครบชุดและมีกิ่งเดือนร่วม → กิ่งทั้งชุดนับเป็นธาตุของกลุ่มทั้งหมด
 */
export function elementWeights(pillars) {
  const w = [0, 0, 0, 0, 0];
  const add = (s, x) => { w[stemElement(s)] += x; };
  const { year, month, day, hour } = pillars;
  add(year % 10, POSITION_WEIGHTS.yearStem);
  add(month % 10, POSITION_WEIGHTS.monthStem);
  if (hour != null) add(hour % 10, POSITION_WEIGHTS.hourStem);
  const br = [[year % 12, POSITION_WEIGHTS.yearBranch], [month % 12, POSITION_WEIGHTS.monthBranch], [day % 12, POSITION_WEIGHTS.dayBranch]];
  if (hour != null) br.push([hour % 12, POSITION_WEIGHTS.hourBranch]);
  const group = branchGroups(br.map(([b]) => b)).find((g) => g.branches.includes(month % 12));
  for (const [b, pw] of br) {
    if (group && group.branches.includes(b)) { w[group.element] += pw; continue; }
    HIDDEN_STEMS[b].forEach((s, k) => add(s, pw * HIDDEN_WEIGHTS[HIDDEN_STEMS[b].length][k]));
  }
  return w;
}
/** กำลังเจ้าวัน: สัดส่วนฝ่ายช่วย (ธาตุเดียวกัน + ธาตุที่ให้กำเนิด) */
export function dayMasterStrength(pillars) {
  const dm = pillars.day % 10, E = stemElement(dm);
  const w = elementWeights(pillars);
  const total = w.reduce((a, b) => a + b, 0);
  const support = w[E] + w[mod(E - 1, 5)];
  const ratio = support / total;
  const level = STRENGTH_LEVELS.find((l) => ratio >= l.min);
  return { ratio: +ratio.toFixed(3), level: level.key, levelTh: level.th, weights: w.map((x) => +x.toFixed(2)) };
}
/** ธาตุให้คุณ/ให้โทษ แบบ扶抑 + 调候 อย่างง่าย (heuristic v1) */
export function favorableElements(pillars) {
  const dm = pillars.day % 10, E = stemElement(dm);
  const st = dayMasterStrength(pillars), w = st.weights;
  const rel = (k) => mod(E + k, 5); // 0 เดียวกัน 1 ผลผลิต 2 ทรัพย์ 3 อำนาจ 4 ทรัพยากร
  let fav, special = null;
  if (st.level === 'veryWeak') {
    const k = [1, 2, 3].reduce((a, b) => (w[rel(b)] > w[rel(a)] ? b : a));
    fav = k === 1 ? [rel(1), rel(2)] : [rel(k), rel(k - 1)];
    special = 'ตามอ่อน (从弱) — ควรให้ผู้รู้ยืนยัน';
  } else if (st.level === 'weak' || (st.level === 'balanced' && st.ratio < BALANCE_PIVOT)) {
    fav = [rel(4), rel(0)];
  } else if (st.level === 'veryStrong') {
    fav = [rel(0), rel(4), rel(1)];
    special = 'ตามแข็ง/专旺 — ควรให้ผู้รู้ยืนยัน';
  } else if (w[rel(4)] > w[rel(0)]) {
    fav = [rel(2), rel(1), rel(3)]; // แข็งเพราะทรัพยากร → ใช้ทรัพย์ข่มทรัพยากร
  } else {
    fav = w[rel(3)] >= 1 ? [rel(3), rel(1), rel(2)] : [rel(1), rel(2), rel(3)]; // แข็งเพราะพวก → อำนาจคุม หรือผลผลิตระบาย
  }
  const mb = pillars.month % 12;
  let climate = null;
  if ([11, 0, 1].includes(mb) && w[1] < 1) climate = 1; // เกิดหน้าหนาว ขาดไฟ
  if ([5, 6, 7].includes(mb) && w[4] < 1) climate = 4; // เกิดหน้าร้อน ขาดน้ำ
  if (climate != null && !fav.includes(climate)) fav = [...fav, climate];
  const unfav = [0, 1, 2, 3, 4].filter((e) => !fav.includes(e));
  return { favorable: fav, unfavorable: unfav, climate, special, strength: st };
}

// ───────────────────────── ดาวพิเศษ (神煞) ─────────────────────────
const NOBLE = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [2, 6], [3, 5], [3, 5]];
const ACADEMIC = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];
const LU = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
const BY_GROUP = { horse: [2, 11, 8, 5], peach: [9, 6, 3, 0], canopy: [4, 1, 10, 7], general: [0, 9, 6, 3] };
/** ดาวพิเศษที่พบในผัง: คืนชื่อดาว กิ่งเป้าหมาย และเสาที่พบ */
export function symbolicStars(pillars) {
  const P = Object.entries(pillars).filter(([, v]) => v != null);
  const dm = pillars.day % 10, yb = pillars.year % 12, db = pillars.day % 12;
  const found = [];
  const look = (name, targets, basis) => {
    const at = P.filter(([, v]) => targets.includes(v % 12)).map(([k]) => k);
    if (at.length) found.push({ name, branches: targets.map((t) => BRANCHES[t]), at, basis });
  };
  look('天乙贵人', NOBLE[dm], 'ก้านวัน');
  look('文昌', [ACADEMIC[dm]], 'ก้านวัน');
  look('禄神', [LU[dm]], 'ก้านวัน');
  if (isYangStem(dm)) look('羊刃', [mod(LU[dm] + 1, 12)], 'ก้านวัน');
  for (const [basisName, b] of [['กิ่งปี', yb], ['กิ่งวัน', db]]) {
    look('驿马', [BY_GROUP.horse[b % 4]], basisName);
    look('桃花', [BY_GROUP.peach[b % 4]], basisName);
    look('华盖', [BY_GROUP.canopy[b % 4]], basisName);
  }
  look('红鸾', [mod(3 - yb, 12)], 'กิ่งปี');
  look('天喜', [mod(9 - yb, 12)], 'กิ่งปี');
  const voids = voidBranches(pillars.day);
  const atVoid = P.filter(([k, v]) => k !== 'day' && voids.includes(v % 12)).map(([k]) => k);
  if (atVoid.length) found.push({ name: '空亡', branches: voids.map((t) => BRANCHES[t]), at: atVoid, basis: 'เสาวัน' });
  return found;
}

/** ความสัมพันธ์กับ "ไท่ส่วย" ของปีจร (ปีชง): natalYearBranch เทียบกับกิ่งของปี Y */
export function taiSuiRelations(natalYearBranch, Y) {
  const t = yearPillarIndex(Y) % 12, a = natalYearBranch;
  const out = [];
  if (a === t) out.push('值太岁');
  if (Math.abs(a - t) === 6) out.push('冲太岁');
  const rel = branchRelations(a, t).map((r) => r.type);
  if (rel.includes('刑') || (a === t && [4, 6, 9, 11].includes(a))) out.push('刑太岁');
  if (rel.includes('六害')) out.push('害太岁');
  if (rel.includes('破')) out.push('破太岁');
  return out;
}

// ───────────────────────── รวมทุกชั้น ─────────────────────────
export function analyze(chart) {
  const P = chart.pillars, dm = P.day % 10;
  const keys = ['year', 'month', 'day', 'hour'].filter((k) => P[k] != null);
  const pillars = keys.map((k) => {
    const i = P[k], s = i % 10, b = i % 12;
    return {
      key: k, name: gzName(i), stem: STEMS[s], branch: BRANCHES[b],
      stemGod: k === 'day' ? '日主' : TEN_GODS[tenGod(dm, s)],
      hidden: HIDDEN_STEMS[b].map((h) => ({ stem: STEMS[h], god: TEN_GODS[tenGod(dm, h)] })),
      stageOfDayMaster: LIFE_STAGES[lifeStage(dm, b)], stageSelf: LIFE_STAGES[lifeStage(s, b)],
      nayin: nayinOf(i),
    };
  });
  const rel = [];
  for (let x = 0; x < keys.length; x++) for (let y = x + 1; y < keys.length; y++) {
    const a = P[keys[x]], b = P[keys[y]];
    stemRelations(a % 10, b % 10).forEach((r) => rel.push({ between: [keys[x], keys[y]], level: 'stem', ...r }));
    branchRelations(a % 12, b % 12).forEach((r) => rel.push({ between: [keys[x], keys[y]], level: 'branch', ...r }));
  }
  branchGroups(keys.map((k) => P[k] % 12)).forEach((g) => rel.push({ level: 'group', ...g }));
  return {
    dayMaster: { stem: STEMS[dm], element: ELEMENTS_TH[stemElement(dm)], yang: isYangStem(dm) },
    pillars, relations: rel,
    void: voidBranches(P.day).map((b) => BRANCHES[b]),
    favorable: favorableElements(P),
    stars: symbolicStars(P),
  };
}

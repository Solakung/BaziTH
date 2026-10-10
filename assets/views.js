// แท็บ "อ่านง่าย" และ "ถามดวง" ของหน้าผังดวง
// ข้อความทั้งหมดมาจาก reading.js ไฟล์นี้จัดหน้าและรับคำถามเท่านั้น
import * as B from '../src/bazi-core.js';
import * as T from './terms.js';
import * as R from './reading.js';
import { $, zh, pair, esc, elOfChar, elWord, legend, beYear } from './fmt.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const meter = (n) => `<span class="meter" aria-hidden="true">${[1, 2, 3, 4, 5].map((i) => `<i${i <= n ? ' class="on"' : ''}></i>`).join('')}</span>`;
const glyphs = (list) => list.map((g) => `<span class="zh el-${elOfChar(g)}" lang="zh-Hans">${g}</span>`).join('');
const dm = (t) => `${t.d} ${T.MONTHS_SHORT[t.m - 1]}`;

// ───────── แท็บอ่านง่าย ─────────
export function easyPanel(ctx) {
  const c = ctx.rc;
  const s = R.easySummary(c);
  const S = T.STEM[c.dm];
  const st = s.strength;

  const howto = `<aside class="howto span-2" aria-labelledby="howto-t">
    <h2 id="howto-t">อ่านผังด้านบนอย่างไร</h2>
    <ol>
      <li>ผังมี 4 คอลัมน์ คือ ยาม วัน เดือน และปีที่คุณเกิด คอลัมน์ละ 2 ตัวอักษร รวม 8 ตัว ปาจื้อจึงแปลว่า "แปดอักษร"</li>
      <li>ตัวบนของคอลัมน์<strong>วัน</strong> (ช่องพื้นสีอ่อน) คือตัวคุณ ตำราเรียกว่าเจ้าวัน ตัวอื่นแทนคน งาน และสิ่งแวดล้อมรอบตัว</li>
      <li>สีบอกธาตุ ${legend()}</li>
      <li>แตะตัวอักษรในผังเพื่อดูความหมาย หรืออ่าน<a href="guide.html">ปาจื้อสำหรับมือใหม่</a>ก่อนก็ได้</li>
    </ol>
  </aside>`;

  const self = `<section>
    <h2>ตัวตนของคุณ</h2>
    <div class="dm">
      <span class="big el-${c.E}" lang="zh-Hans">${B.STEMS[c.dm]}</span>
      <div><p class="dm-name">คุณคือ${s.persona.title}</p><p class="note">${S.read} ${S.kind} · ตัวบนของเสาวัน</p></div>
    </div>
    <p>${s.persona.text}</p>
  </section>`;

  const power = `<section>
    <h2>พลังในตัวคุณ</h2>
    <div class="steps" role="img" aria-label="พลังในตัวคุณ ระดับ${st.label}">
      ${R.STRENGTH_STEPS.map((t, i) => `<span${i + 1 === st.step ? ' class="on"' : ''}>${t}</span>`).join('')}
    </div>
    <p><strong>${st.label}</strong> ${st.text}</p>
    <p class="note">พลังมากหรือน้อยไม่ได้แปลว่าดีหรือแย่ บอกแค่ว่าธาตุไหนช่วยให้คุณสมดุล${st.note ? ` ${st.note}` : ''}</p>
  </section>`;

  const shared = s.fav.length > 1 && s.fav.every((f) => f.why === s.fav[0].why);
  const els = (list) => list.map(elWord).join(' ');
  const schools = s.schools ? `<div class="schools">
      <p><strong>ผังของคุณเป็นแบบสุดขั้ว</strong> ตำราแต่ละสำนักแนะนำธาตุต่างกัน ${s.fav.length ? 'ด้านล่างแสดงเฉพาะธาตุที่ทุกแนวเห็นตรงกัน' : 'และไม่มีธาตุไหนที่ทุกแนวเห็นตรงกัน'} ควรให้ผู้รู้ดูผังจริงก่อนเลือกใช้ธาตุอื่น</p>
      <dl><dt>${s.schools.follow.name}</dt><dd>${els(s.schools.follow.fav)}</dd><dt>${s.schools.normal.name}</dt><dd>${els(s.schools.normal.fav)}</dd></dl>
    </div>` : '';
  const helpers = `<section class="span-2">
    <h2>ธาตุที่เป็นตัวช่วยของคุณ</h2>
    <p class="lead">ปาจื้อมองว่าชีวิตลงตัวเมื่อธาตุสมดุล ธาตุด้านล่างคือสิ่งที่ผังของคุณต้องการ เรียงจากสำคัญมากไปน้อย สี ทิศ และงานเป็นสิ่งที่ตำราโยงไว้กับธาตุนั้น ใช้เป็นแรงบันดาลใจได้ ไม่ใช่กฎที่ต้องทำตาม</p>
    ${schools}
    ${shared ? `<p>${s.fav[0].why}</p>` : ''}
    <div class="helpers">
      ${s.fav.map((f) => {
        const E = T.ELEMENT[f.e];
        return `<article class="helper tint-${f.e}">
          <h3><span class="el-${f.e}">${E.th}${zh(E.zh)}</span><small>${f.role.short}</small></h3>
          <p>${f.role.text}</p>
          ${shared ? '' : `<p class="note">${f.why}</p>`}
          <dl>
            <dt>ลองทำ</dt><dd>${R.thList(f.life)}</dd>
            <dt>สี</dt><dd>${E.colors}</dd>
            <dt>ทิศ</dt><dd>${E.direction}</dd>
            <dt>งาน</dt><dd>${E.work}</dd>
          </dl>
        </article>`;
      }).join('')}
    </div>
    ${s.unfav.length ? `<p>ธาตุที่ควรใช้แต่พอดี คือ ${els(s.unfav)} มีได้ตามปกติ แค่ไม่ต้องเติมเพิ่มเป็นพิเศษ</p>` : ''}
  </section>`;

  let decade;
  if (s.decade) {
    const d = s.decade, info = d.info;
    decade = `<section>
      <h2>ช่วง 10 ปีนี้</h2>
      <div class="phead">
        <span class="pglyph">${pair(d.ev.name)}</span>
        <div><p><strong>${info.pre ? 'ก่อนเข้าวัยจรแรก' : 'วัยจรตอนนี้'}</strong></p><p class="note">${info.range}</p><p><span class="tone ${d.tone.cls}">${d.tone.text}</span></p></div>
      </div>
      <ul class="plain plines">
        ${d.lines.map((l) => `<li><p class="pl-h">${l.when ? `<strong>${l.when}</strong> · ` : ''}${l.theme}</p><p>${l.text}</p></li>`).join('')}
      </ul>
      ${d.echo.map((n) => `<p class="rnote">${n}</p>`).join('')}
      <p class="note">ปาจื้อแบ่งชีวิตเป็นช่วงละ 10 ปี เรียกว่าวัยจร แต่ละช่วงมีพลังต่างกันเหมือนฤดูกาล${info.pre ? ' ก่อนเข้าวัยจรแรก ตำราให้อ่านจากเสาเดือน' : ''}</p>
      <button type="button" class="link-btn" data-goask="overall|decade|0">เปิดไพ่ 10 ปีนี้</button>
    </section>`;
  } else {
    decade = `<section>
      <h2>ช่วง 10 ปีนี้</h2>
      <p class="lead">เลือกเพศในฟอร์มแล้วกดดูผังอีกครั้ง จึงจะเห็นช่วง 10 ปีของคุณ เพราะทิศทางของวัยจรขึ้นกับเพศและขั้วของปีเกิด</p>
    </section>`;
  }

  const years = `<section>
    <h2>ปีนี้และปีหน้า</h2>
    <div class="yrs">
      ${s.years.map((r, i) => {
        const main = r.readings.find((x) => x.lines);
        return `<article class="yr">
          <div class="phead">
            <span class="pglyph">${pair(B.gzName(r.period.idx))}</span>
            <div><p><strong>${r.period.label}</strong></p><p class="note">${r.period.range}</p></div>
          </div>
          <p class="verdict-mini">${meter(r.level)}<strong>${r.levelInfo.label}</strong></p>
          ${main.lines.map((l) => `<p>${l.when ? `<strong>${l.when}</strong> ` : ''}${l.text}</p>`).join('')}
          ${main.notes.map((n) => `<p class="rnote">${n}</p>`).join('')}
          ${r.taisui ? `<p class="rnote">${r.taisui.text}</p>` : ''}
          <button type="button" class="link-btn" data-goask="overall|year|${i}">เปิดไพ่${r.period.word}แบบเต็ม</button>
        </article>`;
      }).join('')}
    </div>
  </section>`;

  const foot = `<p class="note span-2 easy-foot">ข้อความในแท็บนี้เลือกจากกฎในตำราตามผังของคุณ ไม่มีการสุ่ม ใช้เพื่อทบทวนตัวเอง ไม่ใช่คำตัดสินชีวิต อยากรู้ว่าแต่ละข้อมาจากไหน ดูแท็บ "ละเอียด" หรือกด "ทำไมได้คำตอบนี้" ในแท็บถามดวง</p>`;
  return howto + self + power + helpers + decade + years + foot;
}

/** ปุ่มในแท็บอ่านง่ายที่พาไปเปิดไพ่ในแท็บถามดวง */
export function bindEasy(ctx, go) {
  // แผงนี้อยู่ถาวร แต่เนื้อหาเปลี่ยนทุกครั้งที่คำนวณ จึงตั้ง onclick ตัวเดียวแทนการเพิ่ม listener ซ้อน
  $('panel-easy').onclick = (event) => {
    const b = event.target.closest('[data-goask]');
    if (!b) return;
    const [topic, type, offset] = b.dataset.goask.split('|');
    go({ topic, q: { type, offset: +offset } });
  };
}

// ───────── แท็บถามดวง ─────────
const WHEN = [
  { v: 'day0', label: 'วันนี้', q: { type: 'day', offset: 0 } },
  { v: 'month0', label: 'เดือนนี้', q: { type: 'month', offset: 0 } },
  { v: 'month1', label: 'เดือนหน้า', q: { type: 'month', offset: 1 } },
  { v: 'year0', label: 'ปีนี้', q: { type: 'year', offset: 0 } },
  { v: 'year1', label: 'ปีหน้า', q: { type: 'year', offset: 1 } },
  { v: 'decade0', label: '10 ปีนี้', q: { type: 'decade', offset: 0 } },
];
const EXAMPLES = ['ปีหน้าควรเปลี่ยนงานไหม', 'เดือนนี้ความรักเป็นยังไง', 'ปีนี้การเงินจะดีขึ้นไหม', 'สอบปีหน้าจะผ่านไหม', '10 ปีนี้ชีวิตจะเป็นยังไง'];

const backs = (n) => `<ol class="spread closed placeholder n${n}" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<li class="tcard" style="--i:${i}"><div class="tcard-in"><div class="tface"></div><div class="tback"><span lang="zh-Hans">八字</span></div></div></li>`).join('')}</ol>`;

export function askPanel(ctx) {
  const c = ctx.rc;
  const minor = c.age < 18;
  const nowY = c.nowChart.baziYear;
  const years = [];
  for (let Y = Math.max(c.chart.baziYear, nowY - 5); Y <= Math.min(2100, nowY + 20); Y++) years.push(Y);
  const pick = years.includes(nowY + 2) ? nowY + 2 : years[years.length - 1];
  return `<section class="ask">
    <div class="ask-head">
      <h2>ถามดวง</h2>
      <p class="lead">เลือกเรื่องกับช่วงเวลา หรือพิมพ์คำถามเอง แล้วกดเปิดไพ่ ใบแรกคือพื้นดวงของคุณ ใบถัดไปคือพลังของช่วงชีวิตและช่วงเวลาที่ถาม ต่างจากไพ่ยิปซีตรงที่ไม่มีการสุ่ม ถามเรื่องเดิมในช่วงเดิมจะได้คำตอบเดิมเสมอ</p>
    </div>
    <form id="ask-form" class="ask-form" novalidate>
      <label class="field-label" for="ask-q">พิมพ์คำถาม <span class="opt">ไม่บังคับ</span></label>
      <input id="ask-q" type="text" autocomplete="off" maxlength="120" enterkeyhint="go" placeholder="เช่น ปีหน้าควรเปลี่ยนงานไหม">
      <p id="ask-parsed" class="ask-parsed" aria-live="polite"></p>
      <div class="ask-ex"><span>ลองถาม</span>${EXAMPLES.filter((e) => !(minor && e.includes('ความรัก'))).map((e) => `<button type="button" class="ex" data-q="${esc(e)}">${esc(e)}</button>`).join('')}</div>
      <fieldset class="chips">
        <legend>เรื่องที่อยากรู้</legend>
        <div class="chip-row">${R.TOPICS.map((t) => `<label class="chip"><input type="radio" name="topic" value="${t.key}"${t.key === 'overall' ? ' checked' : ''}${minor && t.key === 'love' ? ' disabled' : ''}><span><b lang="zh-Hans">${t.zh}</b>${t.th}</span></label>`).join('')}</div>
        ${minor ? `<p class="hint">${R.GUARD_TEXT.minor}</p>` : ''}
      </fieldset>
      <fieldset class="chips">
        <legend>ช่วงเวลา</legend>
        <div class="chip-row">
          ${WHEN.map((w) => `<label class="chip"><input type="radio" name="when" value="${w.v}"${w.v === 'year0' ? ' checked' : ''}${w.v === 'decade0' && !c.luck ? ' disabled' : ''}><span>${w.label}</span></label>`).join('')}
          <span class="chip-year"><label class="chip"><input type="radio" name="when" value="pick"><span>ปี พ.ศ.</span></label><select id="ask-year" aria-label="เลือกปี พ.ศ.">${years.map((Y) => `<option value="${Y}"${Y === pick ? ' selected' : ''}>${Y + 543}</option>`).join('')}</select></span>
        </div>
        ${c.luck ? '' : '<p class="hint">เลือกเพศในฟอร์มวันเกิดเพื่อเปิดช่วง "10 ปีนี้" และไพ่วัยจร</p>'}
      </fieldset>
      <button type="submit" class="btn">เปิดไพ่</button>
      <p class="hint">ไม่ทำนายความตาย โรค การตั้งครรภ์ หรือเลขเสี่ยงโชค และบอกได้แค่แนวโน้มฝั่งคุณ ไม่ได้บอกใจคนอื่น</p>
    </form>
    <div id="ask-out" class="ask-out">
      ${backs(3)}
      <p class="ask-empty">ไพ่ของคุณจะเปิดที่นี่</p>
    </div>
    <p id="ask-status" class="sr" aria-live="polite"></p>
  </section>`;
}

function shortSub(cd) {
  const i = cd.info;
  if (cd.role === 'natal') return cd.sub;
  if (cd.role === 'year') return `ปี ${i.Y + 543}`;
  if (cd.role === 'day') return dm(i.start);
  if (cd.role === 'month') return i.start ? `${dm(i.start)}–${dm(i.end)}` : 'เดือนเดียวกัน';
  if (i.pre) return 'ใช้เสาเดือนแทน';
  if (i.start) return `${beYear(i.start.y, i.start.m)}–${beYear(i.end.y, i.end.m)}${i.startAge != null ? ` · อายุ ${i.startAge}–${i.startAge + 10}` : ''}`;
  return '';
}

function cardHtml(cd, i) {
  return `<li class="tcard" style="--i:${i}">
    <div class="tcard-in">
      <div class="tface">
        <p class="tlabel">ใบที่ ${cd.n}<span>${cd.label}</span></p>
        <p class="tglyph">${glyphs(cd.glyph)}</p>
        <p class="tsub">${shortSub(cd)}</p>
        <p class="ttitle">${cd.title}</p>
        ${cd.tone ? `<p class="ttone ${cd.tone.cls}">${cd.tone.text}</p>` : ''}
      </div>
      <div class="tback" aria-hidden="true"><span lang="zh-Hans">八字</span></div>
    </div>
  </li>`;
}

function answerHtml(r, question, soft) {
  const reading = (x) => `<li>
    <p class="rn">ใบที่ ${x.n} · ${x.label}</p>
    ${x.text ? `<p>${x.text}</p>` : ''}
    ${(x.lines || []).map((l) => `<p>${l.when ? `<strong>${l.when}</strong> ` : ''}${l.text}</p>`).join('')}
    ${(x.notes || []).map((n) => `<p class="rnote">${n}</p>`).join('')}
  </li>`;
  return `<div class="answer">
    ${question ? `<p class="asked">“${esc(question)}”</p>` : ''}
    <p class="scope">อ่านเรื่อง<strong>${r.topicTh}</strong> · ${r.period.label}${r.period.range ? ` · ${r.period.range}` : ''}</p>
    <ol class="spread n${r.cards.length}${reduceMotion.matches ? '' : ' closed'}">${r.cards.map(cardHtml).join('')}</ol>
    ${soft.map((t) => `<p class="soft">${t}</p>`).join('')}
    <div class="verdict">${meter(r.level)}<strong>${r.levelInfo.label}</strong>${r.active && r.topic !== 'overall' ? '<span class="focus">เรื่องนี้เด่นในช่วงนี้</span>' : ''}</div>
    <p class="headline">${r.headline}</p>
    <h3>คำอ่านทีละใบ</h3>
    <ol class="readings">${r.readings.map(reading).join('')}</ol>
    ${r.taisui ? `<p class="soft"><strong>ปีชง</strong> ${r.taisui.text}</p>` : ''}
    <h3>สิ่งที่ทำได้</h3>
    <ul class="actions">${r.actions.map((a) => `<li>${a}</li>`).join('')}</ul>
    <details class="why"><summary>ทำไมได้คำตอบนี้</summary><ul>${r.why.map((w) => `<li>${w}</li>`).join('')}</ul></details>
    ${r.notes.map((n) => `<p class="note">${n}</p>`).join('')}
    <p class="note">คำอ่านเลือกจากกฎในตำรา ไม่มีการสุ่ม ใช้เพื่อทบทวนตัวเอง ไม่ใช่คำตัดสิน</p>
  </div>`;
}

/** ผูกฟอร์มถามดวง คืนฟังก์ชันสำหรับเปิดไพ่จากที่อื่น เช่น ปุ่มในแท็บอ่านง่าย */
export function bindAsk(ctx) {
  const c = ctx.rc;
  const nowY = c.nowChart.baziYear;
  const form = $('ask-form'), q = $('ask-q'), yearSel = $('ask-year'), parsedEl = $('ask-parsed'), out = $('ask-out');
  let typed = null; // ช่วงเวลาจากคำถามที่ไม่มีปุ่มตรง เช่น "มีนาคม" หรือ "พรุ่งนี้"

  const radio = (name, value) => form.querySelector(`input[name="${name}"][value="${value}"]`);
  const check = (name, value) => { const el = radio(name, value); if (el && !el.disabled) { el.checked = true; return true; } return false; };
  const clearWhen = () => form.querySelectorAll('input[name="when"]').forEach((el) => { el.checked = false; });

  function applyPeriod(p) {
    typed = null;
    const Y = p.type === 'year' ? (p.Y ?? nowY + (p.offset ?? 0)) : null;
    if (p.type === 'day' && !p.offset) return check('when', 'day0');
    if (p.type === 'month' && p.m == null && (p.offset ?? 0) <= 1) return check('when', `month${p.offset ?? 0}`);
    if (p.type === 'decade') return check('when', 'decade0') || ((typed = p), clearWhen());
    if (Y === nowY) return check('when', 'year0');
    if (Y === nowY + 1) return check('when', 'year1');
    if (Y != null && [...yearSel.options].some((o) => +o.value === Y)) { yearSel.value = String(Y); return check('when', 'pick'); }
    typed = p;
    clearWhen();
    return true;
  }

  function periodLabel(p) {
    if (p.type === 'day') return p.offset ? 'พรุ่งนี้' : 'วันนี้';
    if (p.type === 'month') return p.m != null ? `เดือน${T.MONTHS[p.m - 1]} ${beYear(p.Y, p.m)}` : p.offset ? 'เดือนหน้า' : 'เดือนนี้';
    if (p.type === 'decade') return '10 ปีนี้';
    const Y = p.Y ?? nowY + (p.offset ?? 0);
    return Y === nowY ? 'ปีนี้' : Y === nowY + 1 ? 'ปีหน้า' : `ปี ${Y + 543}`;
  }

  function onType() {
    const p = R.parseQuestion(q.value, c.now, nowY);
    if (p.empty) { parsedEl.textContent = ''; typed = null; return p; }
    if (p.topic) check('topic', p.topic);
    if (p.period) applyPeriod(p.period);
    const bits = [];
    if (p.topic) bits.push(`เรื่อง${R.TOPIC[p.topic].th}`);
    if (p.period) bits.push(`ช่วง${periodLabel(p.period)}`);
    parsedEl.textContent = p.guard ? '' : bits.length ? `เข้าใจว่าถาม${bits.join(' ')}` : 'ไม่พบคำบอกเรื่องหรือช่วงเวลาในคำถาม จะใช้ตัวเลือกด้านล่าง';
    return p;
  }

  function currentPeriod() {
    const w = form.elements.when.value;
    if (w === 'pick') return { type: 'year', Y: +yearSel.value };
    const hit = WHEN.find((x) => x.v === w);
    if (hit) return hit.q;
    return typed ?? { type: 'year', offset: 0 };
  }

  function show(html, status, flip) {
    out.innerHTML = html;
    $('ask-status').textContent = status;
    const spread = out.querySelector('.spread.closed');
    if (spread && flip) requestAnimationFrame(() => requestAnimationFrame(() => spread.classList.remove('closed')));
    const top = out.getBoundingClientRect().top;
    if (top < 0 || top > innerHeight * 0.6) out.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
  }

  // ปุ่มเรื่องและช่วงเวลาถูกตั้งจากคำถามตอนพิมพ์แล้ว ตอนเปิดไพ่จึงอ่านเฉพาะเจตนาและเรื่องที่ไม่ทำนาย
  // ผู้ใช้จะเปลี่ยนปุ่มหลังพิมพ์ก็ได้ ปุ่มที่เลือกล่าสุดเป็นตัวตัดสิน
  function run() {
    const question = q.value.trim();
    const p = question ? R.parseQuestion(question, c.now, nowY) : { soft: [], intent: null, guard: null };
    if (p.guard) {
      const fb = R.GUARD_FALLBACK[p.guard];
      const label = fb === 'overall' ? 'ดูภาพรวมของช่วงเวลาที่เลือกแทน' : `ดูแนวโน้ม${R.TOPIC[fb]?.th ?? ''}โดยรวมของช่วงเวลาที่เลือกแทน`;
      show(`<div class="answer"><p class="asked">“${esc(question)}”</p><p class="soft">${R.GUARD_TEXT[p.guard]}</p>${fb ? `<p><button type="button" class="link-btn" data-fallback="${fb}">${label}</button></p>` : ''}</div>`, 'คำถามนี้อยู่นอกขอบเขตที่เว็บนี้ทำนาย', false);
      return;
    }
    const topic = form.elements.topic.value || 'overall';
    if ((topic === 'love' || p.topic === 'love') && c.age < 18) {
      show(`<div class="answer"><p class="soft">${R.GUARD_TEXT.minor}</p></div>`, R.GUARD_TEXT.minor, false);
      return;
    }
    const r = R.readTopic(c, topic, currentPeriod(), p.intent);
    if (r.error) { show(`<div class="answer"><p class="soft">${r.error}</p></div>`, r.error, false); return; }
    const soft = (p.soft || []).map((g) => R.GUARD_TEXT[g]).filter(Boolean);
    show(answerHtml(r, question, soft), `เปิดไพ่แล้ว ${r.topicTh} ${r.period.label} ${r.levelInfo.label}`, true);
  }

  q.addEventListener('input', onType);
  yearSel.addEventListener('change', () => check('when', 'pick'));
  form.addEventListener('change', (event) => { if (event.target.name === 'when') typed = null; });
  form.querySelector('.ask-ex').addEventListener('click', (event) => {
    const b = event.target.closest('.ex');
    if (!b) return;
    q.value = b.dataset.q;
    onType();
    run();
  });
  form.addEventListener('submit', (event) => { event.preventDefault(); run(); });
  out.addEventListener('click', (event) => {
    const b = event.target.closest('[data-fallback]');
    if (!b) return;
    q.value = '';
    parsedEl.textContent = '';
    check('topic', b.dataset.fallback);
    run();
  });

  return (preset) => {
    q.value = '';
    parsedEl.textContent = '';
    check('topic', preset.topic);
    applyPeriod(preset.q);
    run();
  };
}

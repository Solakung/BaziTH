// หน้าตำรา: โหลด docs/bazi-textbook-th.md แล้วแปลงเป็น HTML พร้อมสารบัญ สูตร และรูป
const MD_URL = 'docs/bazi-textbook-th.md';
const MARKED_URL = 'https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js';
const REPO_BLOB = 'https://github.com/Solakung/BaziTH/blob/main/';

const doc = document.getElementById('doc');
const tocBox = document.getElementById('toc-box');
const tocList = document.getElementById('toc');
const wide = matchMedia('(min-width: 960px)');

const syncToc = () => { if (wide.matches) tocBox.open = true; };
syncToc();
wide.addEventListener('change', syncToc);
tocList.addEventListener('click', (e) => { if (e.target.closest('a') && !wide.matches) tocBox.open = false; });

function slug(text, used) {
  const base = text.trim().toLowerCase()
    .replace(/[()（）:：,，、"'“”‘’!?/\\[\]{}<>·—–]+/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'section';
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}

function fixLinks() {
  const base = new URL('docs/', location.href);
  const root = new URL('./', location.href).pathname;
  for (const a of doc.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (href.startsWith('#')) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) { a.target = '_blank'; a.rel = 'noopener'; continue; }
    const url = new URL(href, base);
    const rel = url.pathname.startsWith(root) ? url.pathname.slice(root.length) : null;
    if (rel && /\.(js|md|json)$/.test(rel)) {
      a.href = REPO_BLOB + rel; // ไฟล์โค้ดเปิดบน GitHub อ่านง่ายกว่าไฟล์ดิบ
      a.target = '_blank';
      a.rel = 'noopener';
    } else {
      a.href = url.href;
    }
  }
  for (const img of doc.querySelectorAll('img[src]')) {
    img.src = new URL(img.getAttribute('src'), base).href;
    img.loading = 'lazy';
    img.decoding = 'async';
  }
}

function renderMath() {
  if (!window.katex) return; // ถ้าโหลด KaTeX ไม่ได้ สูตรจะแสดงเป็นโค้ดตามเดิม
  for (const code of doc.querySelectorAll('pre > code.language-math')) {
    const box = document.createElement('div');
    box.className = 'math';
    try {
      window.katex.render(code.textContent, box, { displayMode: true, throwOnError: false, strict: 'ignore' });
      code.parentElement.replaceWith(box);
    } catch { /* คงโค้ดเดิมไว้ */ }
  }
}

function wrapTables() {
  for (const table of doc.querySelectorAll('table')) {
    const box = document.createElement('div');
    box.className = 'table-scroll';
    table.replaceWith(box);
    box.append(table);
  }
}

function buildToc() {
  const used = new Set();
  const links = new Map();
  const frag = document.createDocumentFragment();
  for (const h of doc.querySelectorAll('h2, h3')) {
    h.id = slug(h.textContent, used);
    const li = document.createElement('li');
    li.className = `lvl-${h.tagName[1]}`;
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.textContent = h.textContent;
    li.append(a);
    frag.append(li);
    links.set(h.id, a);
  }
  tocList.replaceChildren(frag);

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const a = links.get(entry.target.id);
      if (!a) continue;
      tocList.querySelectorAll('[aria-current]').forEach((x) => x.removeAttribute('aria-current'));
      a.setAttribute('aria-current', 'true');
      if (wide.matches) {
        const top = a.offsetTop, view = tocBox.scrollTop;
        if (top < view + 40 || top > view + tocBox.clientHeight - 60) tocBox.scrollTop = top - tocBox.clientHeight / 3;
      }
    }
  }, { rootMargin: '0px 0px -75% 0px' });
  doc.querySelectorAll('h2[id], h3[id]').forEach((h) => observer.observe(h));
}

async function main() {
  try {
    const [{ marked }, res] = await Promise.all([import(MARKED_URL), fetch(MD_URL)]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    doc.innerHTML = marked.parse(await res.text(), { gfm: true });
    fixLinks();
    renderMath();
    wrapTables();
    buildToc();
    const h1 = doc.querySelector('h1');
    if (h1) document.title = `${h1.textContent} BaziTH`;
    doc.removeAttribute('aria-busy');
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  } catch (err) {
    console.error(err);
    doc.removeAttribute('aria-busy');
    doc.innerHTML = `<h1>ตำราปาจื้อ</h1>
      <p class="doc-state">โหลดตำราไม่สำเร็จ ลองรีเฟรชหน้านี้ หรืออ่านฉบับบน GitHub ที่
      <a href="${REPO_BLOB}docs/bazi-textbook-th.md">docs/bazi-textbook-th.md</a></p>`;
  }
}

main();

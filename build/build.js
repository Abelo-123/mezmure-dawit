// Builds mezmure-dawit.html from "qsalm storage.txt" + build/template.html
// Usage: node build/build.js [--test]   (--test also writes build/test-app.html with a self-test appended)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const SRC = path.join(root, 'qsalm storage.txt');

const E = { '፩': 1, '፪': 2, '፫': 3, '፬': 4, '፭': 5, '፮': 6, '፯': 7, '፰': 8, '፱': 9 };
const T = { '፲': 10, '፳': 20, '፴': 30, '፵': 40, '፶': 50, '፷': 60, '፸': 70, '፹': 80, '፺': 90 };
function eth(s) {
  let n = 0;
  for (const c of s) {
    if (E[c]) n += E[c];
    else if (T[c]) n += T[c];
    else if (c === '፻') n = (n || 1) * 100;
    else return null;
  }
  return n;
}

// commentary lines the compiler of the file inserted between psalms
const PROSE = /^(በኢትዮጵያ ኦርቶዶክስ|✨|📖)/;
function parse(raw) {
  const L = raw.replace(/\r/g, '').split('\n');
  const hA = /^መዝሙር\s+\S+\s*\(Psalm\s+(\d+)\)\s*$/;
  const h118 = /^መዝሙር ፻፲፰ \(Psalm 118\) — ክፍል/;
  const heads = [];
  L.forEach((l, i) => {
    let m = hA.exec(l);
    if (m) heads.push({ i, n: +m[1] });
    else if (h118.test(l)) heads.push({ i, n: 118 });
  });
  const psalms = new Map();
  heads.forEach((h, k) => {
    const end = k + 1 < heads.length ? heads[k + 1].i : L.length;
    const body = L.slice(h.i + 1, end);
    const seg = parseSeg(body);
    if (!psalms.has(h.n)) psalms.set(h.n, { n: h.n, sub: [], g: [], a: [] });
    const p = psalms.get(h.n);
    p.sub.push(...seg.sub);
    p.g.push(...seg.g);
    p.a.push(...seg.a);
  });
  return [...psalms.values()].sort((x, y) => x.n - y.n);
}

function parseSeg(body) {
  const isB = body.some(l => /^\s*- (ግዕዝ|አማርኛ)፦/.test(l));
  // subtitle / note lines: parenthesised items before the first marker or numbered line
  const sub = [];
  let curSub = null;
  for (const l of body) {
    const t = l.trim();
    if (!t) { curSub = null; continue; }
    if (t === 'በግዕዝ' || /^(- )?[፩-፼]+$/.test(t) || /^[፩-፼]+\.\s/.test(t) || /^- (ግዕዝ|አማርኛ)፦/.test(t)) break;
    if (t.startsWith('(')) { curSub = { t }; sub.push(curSub); }
    else if (curSub) curSub.t += ' ' + t;
  }
  const subs = sub.map(s => s.t.replace(/^\(/, '').replace(/\)(።?)\s*$/, '$1'));
  const g = [], a = [];
  if (!isB) {
    let mode = null, cur = null, prose = false;
    for (const l of body) {
      const t = l.trim();
      if (!t) { cur = null; prose = false; continue; }
      if (t === 'በግዕዝ') { mode = 'g'; cur = null; continue; }
      if (t === 'በአማርኛ') { mode = 'a'; cur = null; continue; }
      if (!mode) continue;
      if (PROSE.test(t)) { cur = null; prose = true; continue; }
      if (prose) continue;
      if (t.startsWith('(')) { cur = null; continue; } // e.g. "(የመዝሙር ፱ ሁለተኛ ክፍል፦)" marker lines
      const m = /^([፩-፼]+)\s+(.+)$/.exec(t);
      if (m && eth(m[1]) !== null) {
        cur = [eth(m[1]), m[2]];
        (mode === 'g' ? g : a).push(cur);
        continue;
      }
      if (cur) cur[1] += ' ' + t;
    }
  } else {
    let n = null, cur = null, prose = false;
    for (const l of body) {
      const t = l.trim();
      if (!t) { cur = null; prose = false; continue; }
      if (PROSE.test(t)) { cur = null; prose = true; continue; }
      if (prose) continue;
      let m = /^(?:- )?([፩-፼]+)$/.exec(t);
      if (m && eth(m[1]) !== null) { n = eth(m[1]); cur = null; continue; }
      m = /^- (ግዕዝ|አማርኛ)፦\s*(.*)$/.exec(t);
      if (m) {
        cur = [n, m[2]];
        (m[1] === 'ግዕዝ' ? g : a).push(cur);
        continue;
      }
      if (cur && /^\s/.test(l)) cur[1] += ' ' + t;
    }
  }
  return { sub: subs, g, a };
}

const BS = String.fromCharCode(92);
function build() {
  const raw = fs.readFileSync(SRC, 'utf8');
  const data = parse(raw);
  const json = JSON.stringify(data)
    .replace(/</g, BS + 'u003c').replace(new RegExp(String.fromCharCode(0x2028),'g'), BS + 'u2028').replace(new RegExp(String.fromCharCode(0x2029),'g'), BS + 'u2029');
  const tpl = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
  if (!tpl.includes('/*__DATA__*/')) throw new Error('template placeholder missing');
  const html = tpl.replace('/*__DATA__*/null', () => json);
  fs.writeFileSync(path.join(root, 'mezmure-dawit.html'), html);
  console.log('wrote mezmure-dawit.html', (html.length / 1024).toFixed(0) + ' KB-chars,', data.length, 'psalms');
  return { data, html };
}

if (require.main === module) {
  const { html } = build();
  if (process.argv.includes('--test')) {
    const selftest = fs.readFileSync(path.join(__dirname, 'selftest.js'), 'utf8');
    fs.writeFileSync(path.join(__dirname, 'test-app.html'), html.replace('</body>', '<script>' + selftest + '</script></body>'));
  }
}
module.exports = { parse, eth };

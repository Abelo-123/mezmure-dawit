// Independent integrity test of the generated HTML against the source text.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'mezmure-dawit.html'), 'utf8');
const m = /const DATA = (\[.*?\]);\n<\/script>/s.exec(html);
if (!m) throw new Error('DATA not found');
const DATA = JSON.parse(m[1]);
const srcLines = fs.readFileSync(path.join(root, 'qsalm storage.txt'), 'utf8').replace(/\r/g, '').split('\n');
const src = srcLines.join('').replace(/\s+/g, '');
let fail = 0;
const bad = (...a) => { fail++; console.log('FAIL', ...a); };

if (DATA.length !== 118) bad('psalm count', DATA.length);
if (m[1].includes("</script") || m[1].includes(String.fromCharCode(0x2028)) || m[1].includes(String.fromCharCode(0x2029))) bad("unescaped < or line separator in embedded data");
const endsOK = /[።፨»?፤፥)!፦]$/;
DATA.forEach((p, i) => {
  if (p.n !== i + 1) bad('numbering', p.n);
  if (!p.g.length) bad('no geez', p.n);
  if (!p.a.length) bad('no amharic', p.n);
  for (const lang of ['g', 'a']) {
    let last = 0; const seen = new Set();
    p[lang].forEach(([n, t], k) => {
      if (!(n >= 1)) bad('verse num', p.n, lang, k);
      if (seen.has(n)) bad('duplicate verse number', p.n, lang, n);
      seen.add(n);
      if (n <= last && p.n !== 118) bad('order', p.n, lang, n, last);
      last = n;
      if (!src.includes(t.replace(/\s+/g, ''))) bad('text not found verbatim in source', p.n, lang, n);
      if (/በኢትዮጵያ ኦርቶዶክስ|✨|📖|\(Psalm|ማስታወሻ|እንደሚከተለው ቀርቧል/.test(t)) bad('prose leaked into verse', p.n, lang, n);
      if (!endsOK.test(t)) console.log('  note: verse not ending in punctuation', p.n, lang, n, '…' + t.slice(-14));
    });
  }
  const gs = new Set(p.g.map(x => x[0])), as = new Set(p.a.map(x => x[0]));
  p.a.forEach(([n]) => { if (!gs.has(n)) console.log('  MISMATCH: Amharic verse', n, 'has no Ge’ez verse in psalm', p.n); });
  p.g.forEach(([n]) => { if (!as.has(n)) console.log('  MISMATCH: Ge’ez verse', n, 'has no Amharic in psalm', p.n); });
});

// Reverse coverage: every source line after the intro must be in the data, or be a recognised non-verse line.
const all = DATA.map(p => p.g.concat(p.a).map(x => x[1]).join('')).join('').replace(/\s+/g, '');
const skipped = [];
srcLines.forEach((l, i) => {
  if (i < 24) return;
  let t = l.trim();
  if (!t) return;
  if (/^መዝሙር\s+\S+\s*\(Psalm \d+\)\s*$/.test(t) || /^መዝሙር ፻፲፰ \(Psalm 118\) — ክፍል/.test(t) || t === 'በግዕዝ' || t === 'በአማርኛ') return;
  t = t.replace(/^- (ግዕዝ|አማርኛ)፦\s*/, '').replace(/^(- )?[፩-፼]+\s*/, '').replace(/\s+/g, '');
  if (!t) return;
  if (all.includes(t)) return;
  skipped.push((i + 1) + ': ' + l.trim().slice(0, 70));
});
fs.writeFileSync(path.join(__dirname, 'uncovered.txt'), skipped.join('\n'));
console.log('source lines not in verse data (should be only commentary/subtitles/headings):', skipped.length, '-> build/uncovered.txt');
console.log('psalms', DATA.length, '| geez verses', DATA.reduce((s, p) => s + p.g.length, 0), '| amharic verses', DATA.reduce((s, p) => s + p.a.length, 0));
console.log(fail ? ('FAILURES: ' + fail) : 'DATA TEST PASSED');
process.exit(fail ? 1 : 0);

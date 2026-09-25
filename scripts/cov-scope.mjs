// 解析 lcov，按目录口径汇总行覆盖率（LF/LH）
import { readFileSync } from 'node:fs';
const file = process.argv[2] ?? 'coverage/lcov.info';
const text = readFileSync(file, 'utf8');

const records = [];
let cur = null;
for (const line of text.split(/\r?\n/)) {
  if (line.startsWith('SF:')) cur = { sf: line.slice(3), lh: 0, lf: 0 };
  else if (line.startsWith('LH:')) cur.lh = Number(line.slice(3));
  else if (line.startsWith('LF:')) cur.lf = Number(line.slice(3));
  else if (line === 'end_of_record') { records.push(cur); cur = null; }
}

const norm = (p) => p.replace(/\\/g, '/').replace(/^[A-Za-z]:\/[^/]+\/[^/]+\/[^/]+\/new-chat-1\//, '');
function agg(list, label) {
  let lf = 0, lh = 0;
  for (const r of list) { lf += r.lf; lh += r.lh; }
  const pct = lf ? (100 * lh / lf) : 0;
  console.log(`${label.padEnd(42)} files=${String(list.length).padStart(3)}  LH/LF=${lh}/${lf}  lines=${pct.toFixed(2)}%`);
}

const recs = records.map((r) => ({ ...r, n: norm(r.sf) }));
agg(recs, 'ALL loaded files');
agg(recs.filter((r) => r.n.startsWith('src/')), 'src/**');
agg(recs.filter((r) => r.n.startsWith('src/') && !r.n.startsWith('src/ui/')), 'src/** excluding src/ui');
agg(recs.filter((r) => r.n.startsWith('src/bff/') || r.n.startsWith('src/db/')), 'src/bff + src/db');
agg(recs.filter((r) => r.n.startsWith('src/bff/')), 'src/bff');
agg(recs.filter((r) => r.n.startsWith('src/db/')), 'src/db');
agg(recs.filter((r) => !r.n.startsWith('tests/') && !r.n.startsWith('web/')), 'excluding tests/ and web/');
agg(recs.filter((r) => r.n.startsWith('src/') && !r.n.startsWith('src/ui/') && !r.n.startsWith('src/entrypoints/')), 'src excl ui & entrypoints');

// 未覆盖（加载但行覆盖低）的 top 文件，便于判断拖累
console.log('\nLowest line coverage among loaded src files:');
recs.filter((r) => r.n.startsWith('src/'))
  .map((r) => ({ n: r.n, pct: r.lf ? 100 * r.lh / r.lf : 0, lf: r.lf }))
  .sort((a, b) => a.pct - b.pct)
  .slice(0, 15)
  .forEach((r) => console.log(`  ${r.pct.toFixed(1).padStart(6)}%  LF=${String(r.lf).padStart(4)}  ${r.n}`));

// 打印住院相关文件的行覆盖率明细（lcov）
import { readFileSync } from 'node:fs';
const text = readFileSync(process.argv[2] ?? 'coverage/lcov.info', 'utf8');
const rows = [];
let cur = null;
for (const line of text.split(/\r?\n/)) {
  if (line.startsWith('SF:')) cur = { sf: line.slice(3), lh: 0, lf: 0 };
  else if (line.startsWith('LH:')) cur.lh = +line.slice(3);
  else if (line.startsWith('LF:')) cur.lf = +line.slice(3);
  else if (line === 'end_of_record') rows.push(cur);
}
const norm = (p) => p.replace(/\\/g, '/');
rows
  .filter((r) => /inpatient|admissionRepo|bedRepo|wardRepo|auditChain/.test(norm(r.sf)))
  .map((r) => ({ n: norm(r.sf).split('/src/')[1] ?? norm(r.sf), pct: r.lf ? 100 * r.lh / r.lf : 0, lh: r.lh, lf: r.lf }))
  .sort((a, b) => a.n.localeCompare(b.n))
  .forEach((r) => console.log(`${r.pct.toFixed(1).padStart(6)}%  ${String(r.lh).padStart(4)}/${String(r.lf).padStart(4)}  src/${r.n}`));

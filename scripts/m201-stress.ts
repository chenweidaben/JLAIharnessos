/**
 * M201 压测脚本
 * 用法: bun run scripts/m201-stress.ts <concurrency> <endpoint>
 */
const concurrency = parseInt(process.argv[2] || '20');
const endpoint = process.argv[3] || '/api/v1/dashboard/stats';
const base = 'http://localhost:8080';

async function one() {
  const start = performance.now();
  try {
    const r = await fetch(base + endpoint);
    const ms = performance.now() - start;
    return { ok: r.ok, ms };
  } catch {
    return { ok: false, ms: 0 };
  }
}

const t0 = performance.now();
const results = await Promise.all(Array.from({ length: concurrency }, one));
const elapsed = (performance.now() - t0) / 1000;

const ok = results.filter(r => r.ok).length;
const msList = results.map(r => r.ms).sort((a, b) => a - b);
const avg = msList.reduce((a, b) => a + b, 0) / msList.length;
const p99 = msList[Math.floor(msList.length * 0.99)] || msList[msList.length - 1];
const max = msList[msList.length - 1];
const qps = concurrency / elapsed;

console.log(JSON.stringify({
  endpoint,
  concurrency,
  elapsed_sec: elapsed.toFixed(2),
  qps: qps.toFixed(2),
  success: `${ok}/${concurrency}`,
  success_rate: `${(ok / concurrency * 100).toFixed(1)}%`,
  avg_ms: avg.toFixed(0),
  p99_ms: p99.toFixed(0),
  max_ms: max.toFixed(0),
}, null, 2));

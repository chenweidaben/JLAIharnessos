/**
 * BFF 性能与并发测试
 * 运行：bun run scripts/verify-perf.ts
 */
const BASE = 'http://127.0.0.1:8099';

async function getToken(): Promise<string> {
  const r = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'doc', password: 'x' }),
  });
  const j = await r.json();
  return j.data.tokens.accessToken;
}

async function timeRequest(url: string, headers: Record<string, string> = {}): Promise<number> {
  const start = performance.now();
  await fetch(url, { headers });
  return performance.now() - start;
}

async function main() {
  const token = await getToken();
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 1) 单接口响应时间 P50/P95/P99
  console.log('=== 单接口响应时间（/api/v1/patients）===');
  const samples: number[] = [];
  for (let i = 0; i < 200; i++) {
    samples.push(await timeRequest(`${BASE}/api/v1/patients`, authHeaders));
  }
  samples.sort((a, b) => a - b);
  const p50 = samples[Math.floor(samples.length * 0.5)];
  const p95 = samples[Math.floor(samples.length * 0.95)];
  const p99 = samples[Math.floor(samples.length * 0.99)];
  console.log(`P50=${p50.toFixed(1)}ms  P95=${p95.toFixed(1)}ms  P99=${p99.toFixed(1)}ms`);
  console.log(`目标 P95<100ms: ${p95 < 100 ? 'PASS' : 'WARN'}`);

  // 2) 健康检查响应时间
  console.log('\n=== /health 响应时间 ===');
  const hSamples: number[] = [];
  for (let i = 0; i < 100; i++) hSamples.push(await timeRequest(`${BASE}/health`));
  hSamples.sort((a, b) => a - b);
  console.log(`P50=${hSamples[50].toFixed(1)}ms  P95=${hSamples[95].toFixed(1)}ms`);

  // 3) 并发测试：10/50/100 并发
  console.log('\n=== 并发测试（/api/v1/patients）===');
  for (const concurrency of [10, 50, 100]) {
    const start = performance.now();
    let ok = 0;
    let fail = 0;
    const tasks = Array(concurrency).fill(0).map(async () => {
      try {
        const r = await fetch(`${BASE}/api/v1/patients`, { headers: authHeaders });
        if (r.ok) ok++; else fail++;
      } catch { fail++; }
    });
    await Promise.all(tasks);
    const elapsed = performance.now() - start;
    const rps = (concurrency / (elapsed / 1000)).toFixed(0);
    console.log(`并发${concurrency}: 总耗时=${elapsed.toFixed(0)}ms  成功=${ok}  失败=${fail}  RPS=${rps}`);
  }

  console.log('\n=== 性能测试完成 ===');
}

main().catch(console.error);

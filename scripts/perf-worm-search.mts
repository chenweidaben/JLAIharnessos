/**
 * 健澜AI原生医院操作系统OS - P5-8 WORM search 性能复测脚本
 *
 * 用法（仓库根）：
 *   bun run scripts/perf-worm-search.mts
 *
 * 行为：
 *   1. 自动建临时 WORM_STORE_DIR，造 50 段 × 20 事件（真实 SM4-CBC + SM2 签名）
 *   2. 跑三档 A/B/C，每档 10 次取 min/median/p90
 *   3. 打印固定格式表格
 *   4. 清理临时目录
 *
 * 注意：B/C 档毫秒量级，计时噪声可能占比较大；以 A→B 粗筛降幅为主结论。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

process.env.DEMO_MODE = '1';
const tmp = mkdtempSync(join(tmpdir(), 'worm-perf-'));
process.env.WORM_STORE_DIR = tmp;

const { recordEvent } = await import('../src/bff/aggregators/auditEventAggregator');
const { seal } = await import('../src/bff/aggregators/wormArchiveAggregator');
const { search } = await import('../src/bff/aggregators/wormAuto');
const { __resetKeyProvider, DemoEphemeralKeyProvider } = await import('../src/bff/aggregators/wormKeyProvider');

__resetKeyProvider(new DemoEphemeralKeyProvider());

console.log('造段中（50 段 × 20 事件）...');
for (let i = 0; i < 50; i++) {
  for (let j = 0; j < 20; j++) {
    recordEvent({
      actorId: i % 17 === 0 ? 'TARGET-ACTOR' : 'doctor-' + (i % 5),
      actorRole: 'doctor',
      action: 'create',
      module: 'cds',
      resourceType: 'medication',
      resourceId: `r-${i}-${j}`,
      result: 'success',
      ip: '127.0.0.1',
    });
  }
  seal();
}
console.log('造段完成，预热索引...');
search({ actorId: 'NON-EXIST' });

function stats(arr: number[]): { min: number; median: number; p90: number } {
  const s = arr.slice().sort((a, b) => a - b);
  return {
    min: s[0],
    median: s[Math.floor(s.length / 2)],
    p90: s[Math.floor(s.length * 0.9)],
  };
}

function bench(fn: () => void, n = 10): number[] {
  const times: number[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    fn();
    times.push(performance.now() - t0);
  }
  return times;
}

const A = stats(bench(() => search({ limit: 500 })));
const B = stats(bench(() => search({ actorId: 'TARGET-ACTOR' })));
// C 档：先暖 LRU
search({ actorId: 'TARGET-ACTOR' });
const C = stats(bench(() => search({ actorId: 'TARGET-ACTOR' })));

console.log('--- P5-8 WORM search 性能（50 真加密段 × 20 事件，10 次采样）---');
console.log(`A full-scan-first = ${A.median.toFixed(2)} ms (min=${A.min.toFixed(2)}, p90=${A.p90.toFixed(2)})`);
console.log(`B idx-first       = ${B.median.toFixed(2)} ms (min=${B.min.toFixed(2)}, p90=${B.p90.toFixed(2)})`);
console.log(`C idx-repeat      = ${C.median.toFixed(2)} ms (min=${C.min.toFixed(2)}, p90=${C.p90.toFixed(2)})`);
console.log(`coarse-gain A->B  = ${((1 - B.median / A.median) * 100).toFixed(1)} %`);
console.log(`lru-gain    B->C  = ${((1 - C.median / B.median) * 100).toFixed(1)} %`);
if (C.p90 / Math.max(C.min, 0.001) > 2) {
  console.log('[注] C 档 p90/min > 2x，毫秒量级计时噪声大，LRU 收益仅供参考；主结论以 A→B 粗筛降幅为准。');
}

rmSync(tmp, { recursive: true, force: true });

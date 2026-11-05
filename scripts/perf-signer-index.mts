/**
 * P5-10 性能对比：countBySigner 索引 vs 全量 list().filter()
 * 用法：bun run scripts/perf-signer-index.mts
 *
 * 段数扫掠：200 / 1000 / 5000 / 20000
 * 只用元数据段（signerKeyId 齐备），测的是 O(n) 扫描 vs O(1) Map 查询本身，不涉解密。
 * 每格 10 次采样，报 median。
 */
import { MemoryWormStore } from '../src/bff/aggregators/wormStore';

function benchMedian(fn: () => void, times = 10): number {
  const samples: number[] = [];
  for (let i = 0; i < times; i++) {
    const t0 = performance.now();
    fn();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

function buildStore(n: number): MemoryWormStore {
  const s = new MemoryWormStore();
  for (let i = 0; i < n; i++) {
    s.put({
      segmentId: `WORM-${String(i + 1).padStart(6, '0')}-abc`,
      seq: i + 1,
      signerKeyId: 'k-old',
    } as never);
  }
  return s;
}

const sizes = [200, 1000, 5000, 20000];
console.log('size\tindex_ms\tlist_ms');
for (const n of sizes) {
  const store = buildStore(n);
  const idx = benchMedian(() => store.countBySigner('k-old'));
  const lst = benchMedian(() => store.list().filter((s) => s.signerKeyId === 'k-old').length);
  console.log(`${n}\t${idx.toFixed(4)}\t${lst.toFixed(4)}`);
}

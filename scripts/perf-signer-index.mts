/**
 * P5-10 性能对比：countBySigner 索引 vs 全量 list().filter()
 * 用法：bun run scripts/perf-signer-index.mts
 *
 * 造 200 段（等价构造：不做真加密，只填 signerKeyId；测量的是 O(段数) 扫描 vs O(1) Map 查询）
 * 10 次采样，输出 min / median / p90。
 */
import { MemoryWormStore } from '../src/bff/aggregators/wormStore';

function bench(fn: () => void, times: number): number[] {
  const samples: number[] = [];
  for (let i = 0; i < times; i++) {
    const t0 = performance.now();
    fn();
    samples.push(performance.now() - t0);
  }
  return samples.sort((a, b) => a - b);
}
function stats(s: number[]): { min: number; median: number; p90: number } {
  return { min: s[0], median: s[Math.floor(s.length / 2)], p90: s[Math.floor(s.length * 0.9)] };
}

const store = new MemoryWormStore();
// 造 200 段，199 段用 k-old，1 段用 k-active
for (let i = 0; i < 200; i++) {
  store.put({
    segmentId: `WORM-${String(i + 1).padStart(4, '0')}-abc`,
    seq: i + 1,
    signerKeyId: i < 199 ? 'k-old' : 'k-active',
  } as never);
}

const idxSamples = bench(() => store.countBySigner('k-old'), 10);
const listSamples = bench(() => store.list().filter((s) => s.signerKeyId === 'k-old').length, 10);

const idx = stats(idxSamples);
const lst = stats(listSamples);

console.log('200 segments, lookup signerKeyId=k-old');
console.log(`index  countBySigner : min=${idx.min.toFixed(3)}ms median=${idx.median.toFixed(3)}ms p90=${idx.p90.toFixed(3)}ms`);
console.log(`list   filter       : min=${lst.min.toFixed(3)}ms median=${lst.median.toFixed(3)}ms p90=${lst.p90.toFixed(3)}ms`);
const gain = ((lst.median - idx.median) / lst.median) * 100;
console.log(`median improvement  : ${gain.toFixed(1)}%`);

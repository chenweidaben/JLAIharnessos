/**
 * jlmedaios - 韧性层（熔断/舱壁/信号量/有界队列）进程内压测
 *
 * 运行：bun run scripts/loadtest.ts
 *
 * 不依赖真实 HTTP/数据库，直接在进程内构造 N 个并发"虚拟医生用户"，
 * 调用被 熔断器 + 舱壁 + 有界队列 包裹的模拟"检验结果查询"下游 handler，
 * 统计 P50/P95/P99 延迟、吞吐、错误率，并验证：
 *   1) 正常负载下韧性层的开销与吞吐；
 *   2) 下游故障注入后熔断跳闸、fail-fast 保护下游；
 *   3) 有界队列对批量回推流量的削峰与背压行为。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { CircuitBreaker, ResilienceErrorCodes } from '../src/resilience/CircuitBreaker.js';
import { Bulkhead } from '../src/resilience/Bulkhead.js';
import { AsyncQueue } from '../src/resilience/AsyncQueue.js';
import { MedicalAgentError } from '../src/core/errors/index.js';

/** 取分位数 */
function percentile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor(sortedAsc.length * q));
  return sortedAsc[idx];
}

/** 模拟下游"检验结果查询"：5~15ms 随机延迟；按概率注入失败 */
function makeDownstream(latencyMin: number, latencyMax: number, failProb: number) {
  return async (): Promise<string> => {
    const delay = latencyMin + Math.random() * (latencyMax - latencyMin);
    await new Promise((r) => setTimeout(r, delay));
    if (Math.random() < failProb) {
      throw new MedicalAgentError('EXTERNAL_SYSTEM_ERROR', 'LIS 网关超时');
    }
    return 'lab-result';
  };
}

interface RunResult {
  total: number;
  ok: number;
  rejected: number; // 熔断/舱壁/队列主动拒绝（受保护）
  downstreamFailed: number; // 下游真实失败（未被保护的部分）
  latencies: number[];
  wallMs: number;
}

/**
 * 并发虚拟用户压测。
 * @param concurrency 并发虚拟用户数
 * @param perUser 每个用户发起的请求数
 */
async function runLoad(opts: {
  concurrency: number;
  perUser: number;
  failProb: number;
  circuit: CircuitBreaker;
  bulkhead: Bulkhead;
}): Promise<RunResult> {
  const { concurrency, perUser, failProb, circuit, bulkhead } = opts;
  const downstream = makeDownstream(5, 15, failProb);

  const latencies: number[] = [];
  let ok = 0;
  let rejected = 0;
  let downstreamFailed = 0;
  const total = concurrency * perUser;

  const t0 = performance.now();
  const workers: Promise<void>[] = [];
  for (let u = 0; u < concurrency; u++) {
    const w = (async () => {
      for (let i = 0; i < perUser; i++) {
        const s = performance.now();
        try {
          await circuit.execute(() => bulkhead.execute('lab-query', downstream));
          ok++;
          latencies.push(performance.now() - s);
        } catch (e) {
          const code = e instanceof MedicalAgentError ? e.code : '';
          if (
            code === ResilienceErrorCodes.CIRCUIT_OPEN ||
            code === ResilienceErrorCodes.CIRCUIT_HALF_OPEN_BUSY ||
            code === ResilienceErrorCodes.BULKHEAD_REJECTED
          ) {
            rejected++; // 韧性层快速拒绝，下游未被实际调用
          } else {
            downstreamFailed++; // 下游真实失败（计入熔断统计）
          }
          latencies.push(performance.now() - s);
        }
      }
    })();
    workers.push(w);
  }
  await Promise.all(workers);
  const wallMs = performance.now() - t0;

  latencies.sort((a, b) => a - b);
  return {
    total,
    ok,
    rejected,
    downstreamFailed,
    latencies,
    wallMs,
  };
}

function printRun(label: string, r: RunResult): void {
  const throughput = (r.total / (r.wallMs / 1000)).toFixed(0);
  const errRate = (((r.rejected + r.downstreamFailed) / r.total) * 100).toFixed(1);
  console.log(`\n--- ${label} ---`);
  console.log(
    `请求数=${r.total}  成功=${r.ok}  韧性拒绝=${r.rejected}  下游失败=${r.downstreamFailed}`,
  );
  console.log(
    `P50=${percentile(r.latencies, 0.5).toFixed(1)}ms  ` +
      `P95=${percentile(r.latencies, 0.95).toFixed(1)}ms  P99=${percentile(r.latencies, 0.99).toFixed(1)}ms`,
  );
  console.log(`吞吐=${throughput} req/s  错误/拒绝率=${errRate}%  耗时=${r.wallMs.toFixed(0)}ms`);
}

async function main(): Promise<void> {
  console.log('========================================================');
  console.log(' jlmedaios 韧性层进程内压测（熔断器/舱壁/信号量/有界队列）');
  console.log('========================================================');

  // 韧性原语装配：舱壁隔离 lab-query 资源，最大并发 30
  const bulkhead = new Bulkhead();
  bulkhead.register({ name: 'lab-query', maxConcurrent: 30, policy: 'queue', queueAcquireTimeoutMs: 2000 });

  // 第一阶段：正常负载（下游 2% 偶发失败）
  const cbNormal = new CircuitBreaker({
    name: 'lab-query',
    failureThreshold: 20,
    errorRateThreshold: 0.5,
    minimumCalls: 50,
    resetTimeoutMs: 1000,
    halfOpenMaxProbes: 5,
  });
  const normal = await runLoad({ concurrency: 80, perUser: 25, failProb: 0.02, circuit: cbNormal, bulkhead });
  printRun('阶段1 正常负载（80 并发 × 25 次，下游 2% 失败）', normal);
  console.log(`熔断状态=${cbNormal.getState()}（应保持 closed）`);

  // 第二阶段：下游故障注入（60% 失败），验证熔断跳闸 + fail-fast
  const cbFault = new CircuitBreaker({
    name: 'lab-query-fault',
    failureThreshold: 15, // 连续失败 15 次即跳闸
    errorRateThreshold: 0.4,
    minimumCalls: 20,
    resetTimeoutMs: 800,
    halfOpenMaxProbes: 3,
  });
  const fault = await runLoad({ concurrency: 80, perUser: 25, failProb: 0.6, circuit: cbFault, bulkhead });
  printRun('阶段2 下游故障注入（80 并发 × 25 次，下游 60% 失败）', fault);
  console.log(`熔断状态=${cbFault.getState()}（故障下应 open）`);
  const m = cbFault.getMetrics();
  console.log(`熔断指标：累计被快速拒绝=${m.rejected}  连续失败=${m.consecutiveFailures}`);

  // 第三阶段：有界队列削峰——一次性灌入 5000 条"检验结果回推"，并发 8、队列上限 500
  console.log('\n--- 阶段3 有界队列削峰（灌入 5000 条回推，worker=8，队列上限=500）---');
  const q = new AsyncQueue<number, number>({
    name: 'lab-push',
    concurrency: 8,
    maxSize: 500,
    onFull: 'drop-oldest',
    handler: async (x) => {
      await new Promise((r) => setTimeout(r, 3)); // 模拟写库 3ms
      return x;
    },
  });
  const qt0 = performance.now();
  let qOk = 0;
  let qDrop = 0;
  const pushes: Promise<unknown>[] = [];
  for (let i = 0; i < 5000; i++) {
    pushes.push(
      q.push(i).then(() => qOk++).catch(() => qDrop++),
    );
  }
  await Promise.all(pushes);
  await q.drain();
  const qWall = performance.now() - qt0;
  const qm = q.getMetrics();
  console.log(
    `入队=5000  成功消费=${qm.completed}  丢弃=${qm.dropped}  ` +
      `吞吐=${(5000 / (qWall / 1000)).toFixed(0)} req/s  总耗时=${qWall.toFixed(0)}ms`,
  );
  console.log(`（drop-oldest 策略下，队列背压时优先保护已入队的高价值任务）`);
  void qOk;
  void qDrop;
}

main()
  .then(() => {
    console.log('\n压测完成。');
    process.exit(0);
  })
  .catch((e) => {
    console.error('压测失败:', e);
    process.exit(1);
  });

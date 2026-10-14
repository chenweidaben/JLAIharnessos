/**
 * 健澜科技 jlmedaios - MEDMUSE Agent 健康度看板纯函数单测。
 *
 * 不依赖数据库与 BFF：直接测 agents/agentMetrics 导出的纯函数 buildHealthBoard——
 *   1) 空快照 -> healthy / 空表 / 零合计；
 *   2) 低失败率 + 快响应 -> healthy；
 *   3) 失败率达 warning 阈值但样本不足熔断门槛 -> warning 不熔断；
 *   4) 样本达标且失败率达熔断阈值 -> critical + circuitOpen，overall=critical；
 *   5) 慢平均响应 -> warning；
 *   6) 平均耗时与合计的数值正确性；
 *   7) 排序：调用数多者在前。
 * 另测 recordCall/takeSnapshot/resetMetrics 的内存计数闭环。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect, beforeEach } from 'bun:test';
import {
  buildHealthBoard,
  recordCall,
  takeSnapshot,
  resetMetrics,
  CIRCUIT_FAILURE_RATE,
  MIN_CALLS_TO_TRIP,
  SLOW_AVG_MS,
  WARNING_FAILURE_RATE,
  type AgentCallRecord,
} from '../../src/bff/agents/agentMetrics';

const NOW = '2026-10-14T00:00:00.000Z';

function rec(calls: number, failures: number, totalDurationMs: number): AgentCallRecord {
  return { calls, failures, totalDurationMs };
}

describe('buildHealthBoard（空快照）', () => {
  it('无调用记录 -> overall healthy、空表、零合计', () => {
    const board = buildHealthBoard({}, NOW);
    expect(board.overall).toBe('healthy');
    expect(board.agents).toEqual([]);
    expect(board.totals).toEqual({ calls: 0, failures: 0, avgDurationMs: 0 });
    expect(board.generatedAt).toBe(NOW);
  });
});

describe('buildHealthBoard（逐 agent 状态）', () => {
  it('低失败率 + 快响应 -> healthy，失败率/均值正确', () => {
    const board = buildHealthBoard({ attending: rec(10, 1, 5000) }, NOW);
    const row = board.agents[0];
    expect(row.calls).toBe(10);
    expect(row.failures).toBe(1);
    expect(row.avgDurationMs).toBe(500); // 5000/10
    expect(row.failureRate).toBeCloseTo(0.1, 5);
    expect(row.circuitOpen).toBe(false);
    expect(row.status).toBe('healthy');
    expect(board.overall).toBe('healthy');
  });

  it('失败率达 warning 阈值但样本不足熔断门槛 -> warning，不熔断', () => {
    // calls=4 (< MIN_CALLS_TO_TRIP=5), failures=2 -> 失败率 0.5 但样本不足
    const board = buildHealthBoard({ nurse: rec(4, 2, 4000) }, NOW);
    const row = board.agents[0];
    expect(row.failureRate).toBeCloseTo(0.5, 5);
    expect(row.circuitOpen).toBe(false);
    expect(row.status).toBe('warning');
    expect(board.overall).toBe('warning');
  });

  it('样本达标且失败率达熔断阈值 -> critical + circuitOpen，overall=critical', () => {
    // calls=10, failures=8 -> 失败率 0.8 >= 0.5，calls>=5
    const board = buildHealthBoard({ pharmacist: rec(10, 8, 6000) }, NOW);
    const row = board.agents[0];
    expect(row.circuitOpen).toBe(true);
    expect(row.status).toBe('critical');
    expect(board.overall).toBe('critical');
  });

  it('慢平均响应（>= SLOW_AVG_MS）-> warning', () => {
    // 10 次全成功，但总耗时 40000ms -> 平均 4000ms >= 3000
    const board = buildHealthBoard({ resident: rec(10, 0, 40000) }, NOW);
    const row = board.agents[0];
    expect(row.avgDurationMs).toBe(4000);
    expect(row.failures).toBe(0);
    expect(row.circuitOpen).toBe(false);
    expect(row.status).toBe('warning');
  });

  it('熔断优先级高于 warning：既熔断又慢响应仍判 critical', () => {
    const board = buildHealthBoard({ bad: rec(10, 9, 90000) }, NOW);
    expect(board.agents[0].circuitOpen).toBe(true);
    expect(board.agents[0].status).toBe('critical');
  });
});

describe('buildHealthBoard（合计与排序）', () => {
  it('totals 汇总所有 agent 的 calls/failures/加权平均耗时', () => {
    const board = buildHealthBoard(
      {
        a: rec(10, 2, 10000), // 平均 1000
        b: rec(30, 3, 30000), // 平均 1000
      },
      NOW,
    );
    expect(board.totals.calls).toBe(40);
    expect(board.totals.failures).toBe(5);
    expect(board.totals.avgDurationMs).toBe(1000); // 40000/40
  });

  it('按调用数降序排列；同数按字典序', () => {
    const board = buildHealthBoard(
      { zeta: rec(1, 0, 100), alpha: rec(1, 0, 100), middle: rec(5, 0, 500) },
      NOW,
    );
    expect(board.agents.map((r) => r.agent)).toEqual(['middle', 'alpha', 'zeta']);
  });

  it('overall 取最高严重度：有熔断即 critical，无熔断但有 warning 即 warning', () => {
    const mixed = buildHealthBoard({
      good: rec(5, 0, 1000),
      slow: rec(5, 0, 90000),
    }, NOW);
    expect(mixed.overall).toBe('warning');

    const withTrip = buildHealthBoard({
      good: rec(5, 0, 1000),
      trip: rec(10, 8, 5000),
    }, NOW);
    expect(withTrip.overall).toBe('critical');
  });
});

describe('内存计数闭环 recordCall / takeSnapshot / resetMetrics', () => {
  beforeEach(() => resetMetrics());

  it('recordCall 累计 calls/failures/totalDurationMs，takeSnapshot 返回拷贝', () => {
    recordCall('attending', 100, true);
    recordCall('attending', 300, false);
    recordCall('nurse', 200, true);

    const snap = takeSnapshot();
    expect(snap.attending).toEqual({ calls: 2, failures: 1, totalDurationMs: 400 });
    expect(snap.nurse).toEqual({ calls: 1, failures: 0, totalDurationMs: 200 });

    // 派生到看板
    const board = buildHealthBoard(snap, NOW);
    const att = board.agents.find((r) => r.agent === 'attending')!;
    expect(att.calls).toBe(2);
    expect(att.avgDurationMs).toBe(200);
    expect(att.failureRate).toBeCloseTo(0.5, 5);
    // calls=2 < MIN_CALLS_TO_TRIP -> 不熔断
    expect(att.circuitOpen).toBe(false);
  });

  it('resetMetrics 清空计数', () => {
    recordCall('attending', 100, true);
    resetMetrics();
    expect(takeSnapshot()).toEqual({});
  });

  it('阈值常量符合预期', () => {
    expect(CIRCUIT_FAILURE_RATE).toBe(0.5);
    expect(MIN_CALLS_TO_TRIP).toBe(5);
    expect(SLOW_AVG_MS).toBe(3000);
    expect(WARNING_FAILURE_RATE).toBe(0.2);
  });
});

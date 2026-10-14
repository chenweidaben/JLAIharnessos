/**
 * 健澜科技 jlmedaios - 系统健康聚合器纯函数单测
 *
 * 仅覆盖 buildHealth（纯函数）：分级口径与 overall 归并，不触碰 IO。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildHealth,
  DEFAULT_THRESHOLDS,
  type HealthSnapshot,
} from '../../src/bff/aggregators/systemHealthAggregator';

const NOW = 1_700_000_000_000;
const STARTED = NOW - 60_000; // 已运行 60 秒

/** 构造一份"全部健康"的基准快照，各用例按需覆写 */
function base(overrides: Partial<HealthSnapshot> = {}): HealthSnapshot {
  return {
    demo: false,
    bff: { startedAtMs: STARTED, requestCount: 123 },
    db: { reachable: true, totalCount: 5, idleCount: 3, max: 20 }, // 在用 2/20 = 10%
    outbox: { reachable: true, pending: 10, dead: 0, oldestAgeSeconds: 2 },
    agents: { total: 7, tripped: [] },
    ...overrides,
  };
}

describe('buildHealth', () => {
  it('全部正常 → overall=healthy，BFF uptime 推导为 60 秒', () => {
    const h = buildHealth(base(), DEFAULT_THRESHOLDS, NOW);
    expect(h.overall).toBe('healthy');
    expect(h.bff.status).toBe('healthy');
    expect(h.bff.uptimeSeconds).toBe(60);
    expect(h.bff.requestCount).toBe(123);
    expect(h.demo).toBe(false);
    expect(h.checks).toHaveLength(4);
  });

  it('DEMO 模式：DB/outbox 标 unknown，overall 保守降为 warning', () => {
    const h = buildHealth(base({ demo: true }), DEFAULT_THRESHOLDS, NOW);
    expect(h.demo).toBe(true);
    expect(h.db.status).toBe('unknown');
    expect(h.outbox.status).toBe('unknown');
    expect(h.overall).toBe('warning');
  });

  it('非演示模式 DB 不可达 → critical', () => {
    const h = buildHealth(
      base({ db: { reachable: false, totalCount: null, idleCount: null, max: 20 } }),
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(h.db.status).toBe('critical');
    expect(h.overall).toBe('critical');
  });

  it('连接池使用率分级：≥90% critical，≥75% warning', () => {
    const crit = buildHealth(
      base({ db: { reachable: true, totalCount: 19, idleCount: 1, max: 20 } }), // 90%
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(crit.db.status).toBe('critical');

    const warn = buildHealth(
      base({ db: { reachable: true, totalCount: 17, idleCount: 1, max: 20 } }), // 80%
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(warn.db.status).toBe('warning');
    expect(warn.db.usedCount).toBe(16);
  });

  it('连接池计数缺失（驱动版本不暴露）：连通即 healthy', () => {
    const h = buildHealth(
      base({ db: { reachable: true, totalCount: null, idleCount: null, max: 20 } }),
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(h.db.status).toBe('healthy');
    expect(h.db.usedCount).toBeNull();
  });

  it('outbox：pending≥1000 critical；pending≥200 warning；死信>0 warning', () => {
    const crit = buildHealth(
      base({ outbox: { reachable: true, pending: 1200, dead: 0, oldestAgeSeconds: 5 } }),
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(crit.outbox.status).toBe('critical');

    const warn = buildHealth(
      base({ outbox: { reachable: true, pending: 300, dead: 0, oldestAgeSeconds: 5 } }),
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(warn.outbox.status).toBe('warning');

    const dead = buildHealth(
      base({ outbox: { reachable: true, pending: 10, dead: 3, oldestAgeSeconds: 1 } }),
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(dead.outbox.status).toBe('warning');
  });

  it('outbox：最老 pending 滞留 ≥300s critical，≥60s warning', () => {
    const crit = buildHealth(
      base({ outbox: { reachable: true, pending: 5, dead: 0, oldestAgeSeconds: 320 } }),
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(crit.outbox.status).toBe('critical');

    const warn = buildHealth(
      base({ outbox: { reachable: true, pending: 5, dead: 0, oldestAgeSeconds: 90 } }),
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(warn.outbox.status).toBe('warning');
  });

  it('outbox 统计查询失败 → unknown，overall=warning', () => {
    const h = buildHealth(
      base({ outbox: { reachable: false, pending: 0, dead: 0, oldestAgeSeconds: null } }),
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(h.outbox.status).toBe('unknown');
    expect(h.overall).toBe('warning');
  });

  it('agent 熔断 → warning；多组件取最严重结论', () => {
    const tripped = buildHealth(
      base({ agents: { total: 7, tripped: ['attending', 'nurse'] } }),
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(tripped.agents.status).toBe('warning');
    expect(tripped.agents.tripped).toEqual(['attending', 'nurse']);
    expect(tripped.overall).toBe('warning');

    // DB critical + agent warning → overall 仍为 critical（最严重优先）
    const mixed = buildHealth(
      base({
        db: { reachable: false, totalCount: null, idleCount: null, max: 20 },
        agents: { total: 7, tripped: ['nurse'] },
      }),
      DEFAULT_THRESHOLDS,
      NOW,
    );
    expect(mixed.overall).toBe('critical');
  });

  it('阈值可注入覆盖', () => {
    const strict = buildHealth(
      base({ outbox: { reachable: true, pending: 50, dead: 0, oldestAgeSeconds: 10 } }),
      { ...DEFAULT_THRESHOLDS, outboxWarnPending: 30 },
      NOW,
    );
    expect(strict.outbox.status).toBe('warning');
  });
});

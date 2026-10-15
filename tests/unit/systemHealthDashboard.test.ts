/**
 * 健澜科技 jlmedaios - M124-D 系统健康总览聚合器纯函数单测（运维工具）。
 *
 * 不依赖数据库与 BFF：直接测 systemHealthDashboardAggregator 导出的纯函数——
 *   1) buildSystemHealthDashboard：状态映射、百分数归一化、越界收敛、lastBackup 兜底；
 *   2) getOverallHealthStatus：down / degraded / healthy 三态判定与阈值边界；
 *   3) 阈值常量：磁盘/内存 ≥90%、错误率 ≥5% 的边界值行为。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildSystemHealthDashboard,
  getOverallHealthStatus,
  DISK_DEGRADED_RATIO,
  MEMORY_DEGRADED_RATIO,
  ERROR_RATE_DEGRADED,
  type SystemHealthMetrics,
} from '../../src/bff/aggregators/systemHealthDashboardAggregator';

/** 构造一份全绿的基准指标，便于用例只改单一场景 */
function baseMetrics(
  over: Partial<SystemHealthMetrics> = {},
): SystemHealthMetrics {
  return {
    db: { reachable: true },
    llm: { reachable: true },
    disk: { usedRatio: 0.4 },
    memory: { usedRatio: 0.5 },
    todayRequests: 1234,
    errorRate: 0.01,
    lastBackup: '2026-10-16T08:00:00.000Z',
    ...over,
  };
}

describe('buildSystemHealthDashboard（状态聚合）', () => {
  it('可达组件映射为 up，原始比例归一化为百分数', () => {
    const d = buildSystemHealthDashboard(baseMetrics());
    expect(d.dbStatus).toBe('up');
    expect(d.llmStatus).toBe('up');
    expect(d.diskUsage).toBe(40);
    expect(d.memoryUsage).toBe(50);
    expect(d.errorRate).toBe(1);
    expect(d.todayRequests).toBe(1234);
    expect(d.lastBackup).toBe('2026-10-16T08:00:00.000Z');
  });

  it('不可达组件映射为 down', () => {
    const d = buildSystemHealthDashboard(
      baseMetrics({ db: { reachable: false }, llm: { reachable: false } }),
    );
    expect(d.dbStatus).toBe('down');
    expect(d.llmStatus).toBe('down');
  });

  it('越界 / 非法输入被收敛到安全范围，不产生 NaN', () => {
    const d = buildSystemHealthDashboard(
      baseMetrics({
        disk: { usedRatio: 1.5 },
        memory: { usedRatio: -0.2 },
        errorRate: Number.NaN,
        todayRequests: -99,
      }),
    );
    expect(d.diskUsage).toBe(100);
    expect(d.memoryUsage).toBe(0);
    expect(d.errorRate).toBe(0);
    expect(d.todayRequests).toBe(0);
    expect(Number.isFinite(d.diskUsage)).toBe(true);
  });

  it('lastBackup 为空字符串 / null 兜底为 null', () => {
    expect(
      buildSystemHealthDashboard(baseMetrics({ lastBackup: '' })).lastBackup,
    ).toBeNull();
    expect(
      buildSystemHealthDashboard(baseMetrics({ lastBackup: null })).lastBackup,
    ).toBeNull();
  });

  it('百分数保留 1 位小数', () => {
    const d = buildSystemHealthDashboard(
      baseMetrics({ disk: { usedRatio: 0.1234 } }),
    );
    expect(d.diskUsage).toBe(12.3);
  });
});

describe('getOverallHealthStatus（健康判断）', () => {
  it('全绿 -> healthy', () => {
    const d = buildSystemHealthDashboard(baseMetrics());
    expect(getOverallHealthStatus(d)).toBe('healthy');
  });

  it('数据库不可达 -> down（优先级最高）', () => {
    const d = buildSystemHealthDashboard(
      baseMetrics({ db: { reachable: false }, disk: { usedRatio: 0.95 } }),
    );
    expect(getOverallHealthStatus(d)).toBe('down');
  });

  it('LLM 网关不可达 -> down', () => {
    const d = buildSystemHealthDashboard(
      baseMetrics({ llm: { reachable: false } }),
    );
    expect(getOverallHealthStatus(d)).toBe('down');
  });

  it('磁盘越线 -> degraded', () => {
    const d = buildSystemHealthDashboard(
      baseMetrics({ disk: { usedRatio: DISK_DEGRADED_RATIO } }),
    );
    expect(getOverallHealthStatus(d)).toBe('degraded');
  });

  it('内存越线 -> degraded', () => {
    const d = buildSystemHealthDashboard(
      baseMetrics({ memory: { usedRatio: MEMORY_DEGRADED_RATIO } }),
    );
    expect(getOverallHealthStatus(d)).toBe('degraded');
  });

  it('错误率越线 -> degraded', () => {
    const d = buildSystemHealthDashboard(
      baseMetrics({ errorRate: ERROR_RATE_DEGRADED }),
    );
    expect(getOverallHealthStatus(d)).toBe('degraded');
  });

  it('阈值边界之下（差 1 个百分点）-> healthy', () => {
    const d = buildSystemHealthDashboard(
      baseMetrics({
        disk: { usedRatio: DISK_DEGRADED_RATIO - 0.01 },
        memory: { usedRatio: MEMORY_DEGRADED_RATIO - 0.01 },
        errorRate: ERROR_RATE_DEGRADED - 0.005,
      }),
    );
    expect(getOverallHealthStatus(d)).toBe('healthy');
  });
});

/**
 * 健澜科技 jlmedaios - M168-D 系统运维智能化单元测试
 *
 * 【AI深化与智能运营】覆盖：
 *  - buildIntelligentMonitoring：五大监控项结构齐全、P50<=P95<=P99、
 *    错误率行 / 时间窗行 / 磁盘行数量正确、健康分区间 0-100；
 *  - detectAnomaly：内置快照检出全部 5 类异常（P95 毛刺 / 错误率突增 /
 *    连接池饱和 / 缓存击穿 / 磁盘告急），z-Score 有限、偏离% >=0、
 *    健康样本（无越界指标）检出 0 异常；
 *  - generateOpsAlert：critical 异常 → P1、渠道含 phone/sms/im、
 *    去重键以 ops: 开头、runbook 非空；
 *  - autoRemediate：步骤 order 连续 1..n、每步含风险与预期收益、
 *    回滚预案非空、预计恢复时长 > 0；
 *  - 纯函数性：各函数两次调用结果深相等（不读时钟 / 不访问 IO）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  autoRemediate,
  buildIntelligentMonitoring,
  buildOpsHistoryBaseline,
  detectAnomaly,
  generateOpsAlert,
  type AnomalyKind,
  type MonitoringMetrics,
} from '../../src/bff/aggregators/opsMonitorAggregator.js';

describe('buildIntelligentMonitoring 智能监控快照', () => {
  it('五大监控项结构齐全且分位数单调', () => {
    const m = buildIntelligentMonitoring();
    expect(m.apiLatency.p50Ms).toBeLessThanOrEqual(m.apiLatency.p95Ms);
    expect(m.apiLatency.p95Ms).toBeLessThanOrEqual(m.apiLatency.p99Ms);
    expect(m.apiLatency.sampleCount).toBeGreaterThan(0);
    expect(m.routeErrors.length).toBe(4);
    expect(m.timeErrors.length).toBe(5);
    expect(m.disk.length).toBe(3);
    expect(m.healthScore).toBeGreaterThanOrEqual(0);
    expect(m.healthScore).toBeLessThanOrEqual(100);
  });

  it('连接池与缓存字段为非负防御值', () => {
    const m = buildIntelligentMonitoring();
    expect(m.dbPool.usagePct).toBeGreaterThanOrEqual(0);
    expect(m.dbPool.usagePct).toBeLessThanOrEqual(100);
    expect(m.cache.hitRatePct).toBeGreaterThanOrEqual(0);
    expect(m.cache.hitRatePct).toBeLessThanOrEqual(100);
    for (const d of m.disk) {
      expect(d.usedPct).toBeGreaterThanOrEqual(0);
      expect(d.usedPct).toBeLessThanOrEqual(100);
    }
  });
});

describe('detectAnomaly 异常检测', () => {
  it('内置快照检出全部 5 类异常且字段可解释', () => {
    const m = buildIntelligentMonitoring();
    const history = buildOpsHistoryBaseline();
    const anomalies = detectAnomaly(m, history);
    expect(anomalies.length).toBe(5);
    const kinds = anomalies.map((a) => a.kind).sort();
    expect(kinds).toEqual(
      (
        [
          'CACHE_MISS_DROP',
          'DB_POOL_SATURATION',
          'DISK_SPACE_RISK',
          'ERROR_RATE_SPIKE',
          'LATENCY_P95_SPIKE',
        ] as AnomalyKind[]
      ).sort(),
    );
    for (const a of anomalies) {
      expect(Number.isFinite(a.zScore)).toBe(true);
      expect(a.deviationPct).toBeGreaterThanOrEqual(0);
      expect(a.current).toBeGreaterThan(0);
      expect(a.threshold).toBeGreaterThan(0);
    }
  });

  it('健康样本（无越界指标）检出 0 异常', () => {
    const healthy: MonitoringMetrics = {
      apiLatency: { p50Ms: 60, p95Ms: 150, p99Ms: 260, avgMs: 90, sampleCount: 10_000 },
      routeErrors: [
        { route: '/api/v1/a', method: 'GET', errorRatePct: 0.1, requests: 5_000, errors: 5 },
        { route: '/api/v1/b', method: 'POST', errorRatePct: 0.2, requests: 3_000, errors: 6 },
      ],
      timeErrors: [
        { window: 'T-5m', errorRatePct: 0.2, requests: 8_000, errors: 16 },
      ],
      dbPool: { active: 20, idle: 20, max: 40, usagePct: 50, waitMsAvg: 8, waitMsP99: 30, acquisitionTimeouts: 0 },
      cache: { hitRatePct: 96.0, hits: 20_000, misses: 800, evictions: 10 },
      disk: [{ path: '/data', totalGb: 2_048, usedGb: 1_229, usedPct: 60.0, inodeUsedPct: 40.0 }],
      healthScore: 95,
    };
    const anomalies = detectAnomaly(healthy, buildOpsHistoryBaseline());
    expect(anomalies.length).toBe(0);
  });
});

describe('generateOpsAlert 智能告警', () => {
  it('critical 异常生成 P1 告警且渠道 / 去重键齐全', () => {
    const m = buildIntelligentMonitoring();
    const anomalies = detectAnomaly(m, buildOpsHistoryBaseline());
    for (const a of anomalies) {
      const alert = generateOpsAlert(a);
      expect(alert.alertId).toBe(`alt_${a.id}`);
      expect(alert.level).toBe('P1');
      expect(alert.channel).toContain('phone');
      expect(alert.channel).toContain('sms');
      expect(alert.channel).toContain('im');
      expect(alert.dedupKey.startsWith('ops:')).toBe(true);
      expect(alert.needAck).toBe(true);
      expect(alert.runbookUrl.length).toBeGreaterThan(0);
      expect(alert.content).toContain('基线');
    }
  });
});

describe('autoRemediate 自动修复建议', () => {
  it('每类异常均给出有序步骤 / 风险 / 预期收益 / 回滚预案', () => {
    const m = buildIntelligentMonitoring();
    const anomalies = detectAnomaly(m, buildOpsHistoryBaseline());
    for (const a of anomalies) {
      const plan = autoRemediate(a);
      expect(plan.issueId).toBe(a.id);
      expect(plan.steps.length).toBeGreaterThanOrEqual(2);
      plan.steps.forEach((step, i) => {
        expect(step.order).toBe(i + 1);
        expect(['low', 'medium', 'high']).toContain(step.risk);
        expect(step.expectedEffect.length).toBeGreaterThan(0);
      });
      expect(plan.rollback.length).toBeGreaterThan(0);
      expect(plan.estimatedRecoveryMin).toBeGreaterThan(0);
    }
  });
});

describe('纯函数性（不读时钟 / 不访问 IO）', () => {
  it('两次调用结果深相等', () => {
    const a1 = buildIntelligentMonitoring();
    const a2 = buildIntelligentMonitoring();
    expect(a1).toEqual(a2);

    const h = buildOpsHistoryBaseline();
    const d1 = detectAnomaly(a1, h);
    const d2 = detectAnomaly(a2, h);
    expect(d1).toEqual(d2);

    expect(d1.map(generateOpsAlert)).toEqual(d2.map(generateOpsAlert));
    expect(d1.map(autoRemediate)).toEqual(d2.map(autoRemediate));
  });
});

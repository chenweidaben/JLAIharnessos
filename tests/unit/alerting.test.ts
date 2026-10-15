/**
 * 健澜科技 jlmedaios - 监控告警聚合器单测（M136-D）
 *
 * 覆盖：
 *  - 阈值判断 checkAlertThresholds（四条规则、边界、多触发排序、非法值防御、阈值覆盖）；
 *  - 告警触发 triggerAlert（工厂字段透传、默认签收态、身份与时间戳）；
 *  - 通知发送 notifyAlert（未注册/已注册/sink 异常三种情形）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterEach, describe, expect, it } from 'bun:test';

import {
  checkAlertThresholds,
  DEFAULT_ALERT_THRESHOLDS,
  notifyAlert,
  setAlertNotifier,
  triggerAlert,
  type Alert,
  type AlertMetrics,
} from '../../src/bff/aggregators/alertingAggregator';

/** 全部指标健康（均在阈值之内） */
const healthy: AlertMetrics = {
  apiErrorRate: 0.01, // 1% < 2%
  p95LatencyMs: 300, // < 500
  diskUsedRatio: 0.6, // 60% < 80%
  memoryUsedRatio: 0.5, // 50% < 85%
};

afterEach(() => {
  // 每个用例后清空通知 sink，避免跨用例泄漏
  setAlertNotifier(null);
});

describe('checkAlertThresholds - 阈值判断', () => {
  it('全部指标在阈值内 → 空数组', () => {
    expect(checkAlertThresholds(healthy)).toEqual([]);
  });

  it('API 错误率 > 2% → 一条 red（source=api-error-rate）', () => {
    const alerts = checkAlertThresholds({ ...healthy, apiErrorRate: 0.05 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('red');
    expect(alerts[0].source).toBe('api-error-rate');
    expect(alerts[0].message).toContain('5.00%');
  });

  it('P95 > 500ms → 一条 yellow（source=p95-latency）', () => {
    const alerts = checkAlertThresholds({ ...healthy, p95LatencyMs: 800 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('yellow');
    expect(alerts[0].source).toBe('p95-latency');
  });

  it('磁盘 > 80% → 一条 yellow（source=disk）', () => {
    const alerts = checkAlertThresholds({ ...healthy, diskUsedRatio: 0.9 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('yellow');
    expect(alerts[0].source).toBe('disk');
  });

  it('内存 > 85% → 一条 red（source=memory）', () => {
    const alerts = checkAlertThresholds({ ...healthy, memoryUsedRatio: 0.95 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('red');
    expect(alerts[0].source).toBe('memory');
  });

  it('边界等于阈值不触发（严格大于）', () => {
    const atBoundary: AlertMetrics = {
      apiErrorRate: 0.02, // 等于红线
      p95LatencyMs: 500, // 等于黄线
      diskUsedRatio: 0.8, // 等于黄线
      memoryUsedRatio: 0.85, // 等于红线
    };
    expect(checkAlertThresholds(atBoundary)).toEqual([]);
  });

  it('多规则同时触发 → red 排在 yellow 之前', () => {
    const alerts = checkAlertThresholds({
      ...healthy,
      apiErrorRate: 0.1, // red
      p95LatencyMs: 900, // yellow
      diskUsedRatio: 0.95, // yellow
      memoryUsedRatio: 0.99, // red
    });
    expect(alerts).toHaveLength(4);
    expect(alerts[0].level).toBe('red');
    expect(alerts[1].level).toBe('red');
    expect(alerts[2].level).toBe('yellow');
    expect(alerts[3].level).toBe('yellow');
    const sources = alerts.map((a) => a.source);
    expect(sources).toContain('api-error-rate');
    expect(sources).toContain('memory');
  });

  it('非有限数指标（NaN/undefined）防御跳过，不抛错不误报', () => {
    const alerts = checkAlertThresholds({
      apiErrorRate: Number.NaN,
      p95LatencyMs: undefined as unknown as number,
      diskUsedRatio: Infinity as unknown as number,
      memoryUsedRatio: 0.5,
    });
    expect(alerts).toEqual([]);
  });

  it('metrics 为 null/undefined → 空数组', () => {
    expect(checkAlertThresholds(null)).toEqual([]);
    expect(checkAlertThresholds(undefined)).toEqual([]);
  });

  it('config 覆盖默认阈值生效', () => {
    // 把错误率红线收紧到 0.005，1% 即触发 red
    const alerts = checkAlertThresholds(
      { ...healthy, apiErrorRate: 0.01 },
      { errorRateRed: 0.005 },
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0].threshold).toBe(0.005);
  });

  it('默认阈值与产品口径一致', () => {
    expect(DEFAULT_ALERT_THRESHOLDS).toEqual({
      errorRateRed: 0.02,
      p95YellowMs: 500,
      diskYellowRatio: 0.8,
      memoryRedRatio: 0.85,
    });
  });
});

describe('triggerAlert - 告警触发', () => {
  it('透传 level/message，默认未签收', () => {
    const a = triggerAlert('red', 'API 错误率告警');
    expect(a.level).toBe('red');
    expect(a.message).toBe('API 错误率告警');
    expect(a.acknowledged).toBe(false);
  });

  it('从 metadata 提取 source/value/threshold，其余挂到上下文', () => {
    const a = triggerAlert('yellow', 'P95 超时', {
      source: 'p95-latency',
      value: 800,
      threshold: 500,
      route: '/api/v1/heavy',
    });
    expect(a.source).toBe('p95-latency');
    expect(a.value).toBe(800);
    expect(a.threshold).toBe(500);
    expect(a.metadata).toEqual({ route: '/api/v1/heavy' });
  });

  it('无 metadata 时 source=custom、value/threshold 为 NaN', () => {
    const a = triggerAlert('yellow', '自定义告警');
    expect(a.source).toBe('custom');
    expect(Number.isNaN(a.value)).toBe(true);
    expect(Number.isNaN(a.threshold)).toBe(true);
  });

  it('id 非空且 triggeredAt 为有效 ISO 时间戳', () => {
    const a = triggerAlert('red', 'x');
    expect(typeof a.id).toBe('string');
    expect(a.id.length).toBeGreaterThan(0);
    expect(Number.isNaN(Date.parse(a.triggeredAt))).toBe(false);
  });
});

describe('notifyAlert - 通知发送', () => {
  it('未注册投递器 → 返回 false 且不抛错', () => {
    const a = triggerAlert('red', 'x');
    expect(notifyAlert(a)).toBe(false);
  });

  it('注册投递器后 → 返回 true 且收到同一条告警', () => {
    const received: Alert[] = [];
    setAlertNotifier((alert) => received.push(alert));
    const a = triggerAlert('red', '磁盘告急', { source: 'disk' });
    expect(notifyAlert(a)).toBe(true);
    expect(received).toHaveLength(1);
    expect(received[0].id).toBe(a.id);
    expect(received[0].source).toBe('disk');
  });

  it('sink 抛错 → 吞掉异常返回 false，不影响主流程', () => {
    setAlertNotifier(() => {
      throw new Error('channel down');
    });
    expect(notifyAlert(triggerAlert('yellow', 'x'))).toBe(false);
  });
});

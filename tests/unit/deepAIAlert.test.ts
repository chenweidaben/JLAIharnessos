/**
 * 健澜科技 jlmedaios - 【质量与新场景】AI 深度智能预警纯函数单测（M175-B）
 *
 * 覆盖：
 *   - buildDeepAIAlert：阈值目录评估 / 越线才预警 / 未登记 code 忽略 / 证据链 / 严重度；
 *   - prioritizeAIAlert：按综合分降序、同级按偏离度与类别权重；
 *   - generateAIAlertAction：措施 / 责任岗 / SLA / 量化目标 / 第一步动作；
 *   - trackAIAlertResolution：SLA 是否达标 / 闭环状态映射 / 闭环结论。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  ALERT_CATALOG,
  buildDeepAIAlert,
  generateAIAlertAction,
  prioritizeAIAlert,
  trackAIAlertResolution,
  type DeepAIAlert,
} from '../../src/bff/aggregators/deepAIAlertAggregator';

/** 与路由一致的演示信号快照 */
const liveSignals = [
  { code: 'MED_RECORD_DEFECT_RATE', current: 7.8 },
  { code: 'MED_PRESCRIPTION_IRRATIONAL_RATE', current: 2.1 },
  { code: 'MED_SURGICAL_COMPLICATION_RATE', current: 4.6 },
  { code: 'OPS_BED_OCCUPANCY', current: 97.4 },
  { code: 'OPS_OUTPATIENT_WAIT_MIN', current: 52 },
  { code: 'OPS_KEY_DRUG_SHORTAGE_DAYS', current: 5 },
  { code: 'SAF_HAI_CLUSTER_7D', current: 4 },
  { code: 'SAF_KEY_EQUIP_DOWN_HOURS', current: 6.5 },
  { code: 'SAF_SYSTEM_AVAILABILITY', current: 99.62 },
  { code: 'FIN_DRG_OVERRUN_RATE', current: 11.2 },
  { code: 'FIN_INSURANCE_REJECT_RATE', current: 1.4 },
  { code: 'FIN_COST_OVER_BUDGET_RATE', current: 7.3 },
];

describe('buildDeepAIAlert 深度预警生成', () => {
  it('目录覆盖四大类共 12 类预警（医疗3/运营3/安全3/财务3）', () => {
    expect(ALERT_CATALOG.length).toBe(12);
    const byCat = ALERT_CATALOG.reduce<Record<string, number>>((acc, a) => {
      acc[a.category] = (acc[a.category] ?? 0) + 1;
      return acc;
    }, {});
    expect(byCat.quality).toBe(3);
    expect(byCat.operations).toBe(3);
    expect(byCat.safety).toBe(3);
    expect(byCat.finance).toBe(3);
  });

  it('仅越线信号生成预警，未越线（不合理处方率/医保拒付率）不产出', () => {
    const sys = buildDeepAIAlert(liveSignals, '2026-10-16T00:00:00Z');
    expect(sys.generatedAt).toBe('2026-10-16T00:00:00Z');
    expect(sys.alerts.length).toBe(10); // 12 信号 - 2 未越线
    expect(sys.alerts.find((a) => a.code === 'MED_PRESCRIPTION_IRRATIONAL_RATE')).toBeUndefined();
    expect(sys.alerts.find((a) => a.code === 'FIN_INSURANCE_REJECT_RATE')).toBeUndefined();
  });

  it('未登记 code 被忽略，不参与预警判定', () => {
    const sys = buildDeepAIAlert(
      [...liveSignals, { code: 'FAKE_METRIC_XYZ', current: 999 }],
      '2026-10-16T00:00:00Z',
    );
    expect(sys.alerts.length).toBe(10);
    expect(sys.alerts.find((a) => a.code === 'FAKE_METRIC_XYZ')).toBeUndefined();
  });

  it('越线预警带证据链：当前值/警戒线/偏离/口径，不空泛', () => {
    const sys = buildDeepAIAlert(liveSignals, '2026-10-16T00:00:00Z');
    const rec = sys.alerts.find((a) => a.code === 'MED_RECORD_DEFECT_RATE');
    expect(rec).toBeDefined();
    expect(rec!.current).toBe(7.8);
    expect(rec!.threshold).toBe(5);
    expect(rec!.deviation).toBe(2.8);
    expect(rec!.evidence.length).toBeGreaterThanOrEqual(3);
    expect(rec!.evidence.join('|')).toContain('警戒线');
    expect(rec!.status).toBe('open');
  });

  it('严重度：偏离≥50% 判红线，安全类越线至少黄线；红线共 4 条', () => {
    const sys = buildDeepAIAlert(liveSignals, '2026-10-16T00:00:00Z');
    expect(sys.criticalCount).toBe(4);
    // 病历缺陷率偏离 56% → critical
    expect(sys.alerts.find((a) => a.code === 'MED_RECORD_DEFECT_RATE')!.severity).toBe('critical');
    // 床位占用率仅偏离 2.5% → warning
    expect(sys.alerts.find((a) => a.code === 'OPS_BED_OCCUPANCY')!.severity).toBe('warning');
    // 院感聚集属安全类，越线即至少 warning
    expect(['critical', 'warning']).toContain(
      sys.alerts.find((a) => a.code === 'SAF_HAI_CLUSTER_7D')!.severity,
    );
  });

  it('summary 各类别计数与预警列表一致', () => {
    const sys = buildDeepAIAlert(liveSignals, '2026-10-16T00:00:00Z');
    expect(sys.summary.quality).toBe(2);
    expect(sys.summary.operations).toBe(3);
    expect(sys.summary.safety).toBe(3);
    expect(sys.summary.finance).toBe(2);
  });
});

describe('prioritizeAIAlert 预警优先级排序', () => {
  it('按综合分降序返回新数组，不修改入参', () => {
    const sys = buildDeepAIAlert(liveSignals, '2026-10-16T00:00:00Z');
    const before = sys.alerts.map((a) => a.score);
    const sorted = prioritizeAIAlert(sys.alerts);
    // 入参顺序保持不变
    expect(sys.alerts.map((a) => a.score)).toEqual(before);
    // 输出非升序
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].score).toBeGreaterThanOrEqual(sorted[i].score);
    }
  });

  it('红线且高偏离者排在最前（关键设备停机 62.5% 偏离位列第一梯队）', () => {
    const sys = buildDeepAIAlert(liveSignals, '2026-10-16T00:00:00Z');
    const sorted = prioritizeAIAlert(sys.alerts);
    expect(sorted[0].score).toBe(100);
    expect(['SAF_KEY_EQUIP_DOWN_HOURS', 'MED_RECORD_DEFECT_RATE']).toContain(sorted[0].code);
  });
});

describe('generateAIAlertAction 可落地处置建议', () => {
  it('每条预警产出措施/责任岗/SLA/量化目标，不是「建议关注」', () => {
    const sys = buildDeepAIAlert(liveSignals, '2026-10-16T00:00:00Z');
    const rec = sys.alerts.find((a) => a.code === 'MED_RECORD_DEFECT_RATE')!;
    const act = generateAIAlertAction(rec);
    expect(act.alertId).toBe(rec.id);
    expect(act.measure.length).toBeGreaterThan(6);
    expect(act.measure).not.toContain('建议关注');
    expect(act.owner.length).toBeGreaterThan(0);
    expect(act.target).toContain('5%');
    expect(act.firstStep.length).toBeGreaterThan(0);
  });

  it('红线 SLA=2h，黄线 SLA=24h', () => {
    const sys = buildDeepAIAlert(liveSignals, '2026-10-16T00:00:00Z');
    const critical = sys.alerts.find((a) => a.severity === 'critical')!;
    const warning = sys.alerts.find((a) => a.severity === 'warning')!;
    expect(generateAIAlertAction(critical).slaHours).toBe(2);
    expect(generateAIAlertAction(warning).slaHours).toBe(24);
  });

  it('安全类预警命中专属处置（院感聚集/系统可用率）', () => {
    const sys = buildDeepAIAlert(liveSignals, '2026-10-16T00:00:00Z');
    const hai = sys.alerts.find((a) => a.code === 'SAF_HAI_CLUSTER_7D')!;
    const act = generateAIAlertAction(hai);
    expect(act.owner).toContain('院感');
    expect(act.measure).toContain('隔离');
  });
});

describe('trackAIAlertResolution 预警闭环跟踪', () => {
  const baseAlert = buildDeepAIAlert(liveSignals, '2026-10-16T08:00:00Z').alerts[0];

  it('红线 2h 内销项判定为 SLA 达标 + closed', () => {
    const rec = trackAIAlertResolution(baseAlert.id, {
      resolvedBy: '院感科',
      resolvedAt: '2026-10-16T09:00:00Z',
      outcome: 'fixed',
      note: '隔离并采样完毕',
      detectedAt: '2026-10-16T08:00:00Z',
      severity: 'critical',
      code: baseAlert.code,
    });
    expect(rec.slaHours).toBe(2);
    expect(rec.actualHours).toBe(1);
    expect(rec.slaMet).toBe(true);
    expect(rec.closedLoopStatus).toBe('closed');
    expect(rec.summary).toContain('达标');
  });

  it('超过 SLA 判定超时；accepted_risk 映射 accepted；误报映射 dismissed', () => {
    const late = trackAIAlertResolution('ALT-X', {
      resolvedBy: '财务科',
      resolvedAt: '2026-10-16T12:00:00Z',
      outcome: 'accepted_risk',
      detectedAt: '2026-10-16T08:00:00Z',
      severity: 'critical',
      code: 'FIN_DRG_OVERRUN_RATE',
    });
    expect(late.actualHours).toBe(4);
    expect(late.slaMet).toBe(false);
    expect(late.closedLoopStatus).toBe('accepted');
    expect(late.summary).toContain('超时');

    const falseAlarm = trackAIAlertResolution('ALT-Y', {
      resolvedBy: '信息科',
      resolvedAt: '2026-10-16T08:30:00Z',
      outcome: 'false_alarm',
      detectedAt: '2026-10-16T08:00:00Z',
      severity: 'warning',
      code: 'SAF_SYSTEM_AVAILABILITY',
    });
    expect(falseAlarm.closedLoopStatus).toBe('dismissed');
    expect(falseAlarm.slaHours).toBe(24);
  });
});

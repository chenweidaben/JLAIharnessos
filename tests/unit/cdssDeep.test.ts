/**
 * 健澜科技 jlmedaios - M165-A CDSS 临床决策支持深化 · 单测（CDSS与运营精细化）
 *
 * 覆盖：规则求值 evaluateCDSSRules、优先级排序 prioritizeCDSSAlerts（含同优先级
 *       去重合并与超量压制）、采纳跟踪 trackCDSSAdoption、引擎装配 buildCDSSEngine。
 * 纯函数、无 I/O、无 DB。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildCDSSEngine,
  CDSS_RULE_CATALOG,
  CDSS_MAX_SURFACE_ALERTS,
  evaluateCDSSRules,
  prioritizeCDSSAlerts,
  trackCDSSAdoption,
  type CDSSAlert,
  type CDSSOrderContext,
  type CDSSPatientContext,
} from '../../src/bff/aggregators/cdssDeepAggregator.js';

/** 演示患者：老年肺炎+高血压，过敏青霉素，在服华法林，红旗胸痛伴大汗 */
const patient: CDSSPatientContext = {
  patientId: 'P-TEST-0001',
  age: 68,
  gender: 'M',
  weightKg: 62,
  diagnoses: ['肺炎', '高血压'],
  allergies: ['青霉素'],
  activeDrugs: ['warfarin'],
  recentLabs: [],
  symptoms: ['chest_pain', 'diaphoresis'],
};

/** 演示医嘱：阿司匹林超量+重复开、青霉素过敏、胸片 */
const orders: CDSSOrderContext = {
  pathwayId: 'PATH-TEST',
  orders: [
    { orderId: 'ORD-1', category: 'drug', name: 'aspirin', dosageMg: 3200, freqPerDay: 2 },
    { orderId: 'ORD-2', category: 'drug', name: 'aspirin', dosageMg: 100, freqPerDay: 1 },
    { orderId: 'ORD-3', category: 'drug', name: '青霉素', dosageMg: 800, freqPerDay: 3 },
    { orderId: 'ORD-4', category: 'lab', name: '胸片' },
  ],
};

function evaluateAll() {
  return evaluateCDSSRules(patient, CDSS_RULE_CATALOG, orders);
}

describe('M165-A 引擎装配 buildCDSSEngine', () => {
  it('缺少 patientId 抛 BAD_REQUEST', () => {
    expect(() => buildCDSSEngine({ ...patient, patientId: '' }, orders)).toThrow();
  });

  it('无药品医嘱且无在用药时，药物审核规则被裁剪不参与求值', () => {
    const engine = buildCDSSEngine(
      { ...patient, activeDrugs: [] },
      { orders: [{ orderId: 'L1', category: 'lab', name: '血常规' }] },
    );
    const drugRules = engine.applicableRules.filter((r) => r.ruleType === 'drug_review');
    expect(drugRules.length).toBe(0);
    expect(engine.facts.drugOrderCount).toBe(0);
  });

  it('有药品医嘱时，药物审核规则进入适用集', () => {
    const engine = buildCDSSEngine(patient, orders);
    expect(engine.applicableRules.length).toBeGreaterThan(0);
    expect(engine.facts.drugOrderCount).toBe(3);
  });
});

describe('M165-A 规则求值 evaluateCDSSRules', () => {
  it('剂量异常：单次超 2000mg 产红色告警', () => {
    const alerts = evaluateAll();
    const dose = alerts.find((a) => a.ruleId === 'DRUG-DOSE-001');
    expect(dose).toBeDefined();
    expect(dose!.priority).toBe('red');
    expect(dose!.message).toContain('aspirin');
  });

  it('剂量异常：按频次折算日总量超 4000mg 产橙色告警', () => {
    const alerts = evaluateAll();
    const daily = alerts.find((a) => a.ruleId === 'DRUG-DOSE-002');
    expect(daily).toBeDefined();
    expect(daily!.priority).toBe('orange');
  });

  it('相互作用：华法林+阿司匹林组合产红色告警', () => {
    const alerts = evaluateAll();
    const interaction = alerts.find((a) => a.ruleId === 'DRUG-INT-001');
    expect(interaction).toBeDefined();
    expect(interaction!.priority).toBe('red');
  });

  it('禁忌症：拟用青霉素命中过敏史产红色告警', () => {
    const alerts = evaluateAll();
    const contra = alerts.find((a) => a.ruleId === 'DRUG-CONTRA-001');
    expect(contra).toBeDefined();
    expect(contra!.priority).toBe('red');
  });

  it('重复用药：同一通用名 aspirin 两条产橙色告警', () => {
    const alerts = evaluateAll();
    const dup = alerts.find((a) => a.ruleId === 'DRUG-DUP-001');
    expect(dup).toBeDefined();
    expect(dup!.priority).toBe('orange');
  });

  it('漏查：肺炎路径上血常规与 CRP 未开，各产一条黄色告警', () => {
    const alerts = evaluateAll();
    const missing = alerts.filter((a) => a.ruleId === 'LAB-MISS-001');
    expect(missing.length).toBe(2);
    expect(missing.every((a) => a.priority === 'yellow')).toBe(true);
  });

  it('红旗：胸痛伴大汗产红色紧急告警', () => {
    const alerts = evaluateAll();
    const red = alerts.find((a) => a.ruleId === 'DX-RED-001');
    expect(red).toBeDefined();
    expect(red!.priority).toBe('red');
  });

  it('指南推荐：高血压未用氨氯地平/氯沙坦产蓝色参考告警', () => {
    const alerts = evaluateAll();
    const guide = alerts.find((a) => a.ruleId === 'TX-GUIDE-001');
    expect(guide).toBeDefined();
    expect(guide!.priority).toBe('blue');
  });

  it('已做检验不重复触发漏查', () => {
    const withLabDone = { ...patient, recentLabs: ['血常规', 'CRP'] };
    const alerts = evaluateCDSSRules(withLabDone, CDSS_RULE_CATALOG, orders);
    expect(alerts.filter((a) => a.ruleId === 'LAB-MISS-001').length).toBe(0);
  });
});

describe('M165-A 优先级排序与合并 prioritizeCDSSAlerts', () => {
  it('红>橙>黄>蓝 排序：红色永远排在最前', () => {
    const raw = evaluateAll();
    const bundle = prioritizeCDSSAlerts(raw);
    const priorities = bundle.alerts.map((a) => a.priority);
    const rank = { red: 0, orange: 1, yellow: 2, blue: 3 } as const;
    for (let i = 1; i < priorities.length; i += 1) {
      expect(rank[priorities[i]!]! >= rank[priorities[i - 1]!]!).toBe(true);
    }
    expect(bundle.alerts[0]!.priority).toBe('red');
  });

  it('同优先级同源告警去重合并：mergedCount 累加到合并后的代表告警', () => {
    const mk = (priority: CDSSAlert['priority'], ruleId: string): CDSSAlert => ({
      alertId: `${ruleId}-${priority}-${Math.random()}`,
      ruleId,
      ruleType: 'drug_review',
      subType: '剂量异常',
      priority,
      priorityLabel: priority,
      title: ruleId,
      message: '',
      suggestedAction: '',
      relatedTo: ['ORD-X'],
      dedupKey: `drug_review:剂量异常:single:aspirin`,
      mergedCount: 1,
    });
    const merged = prioritizeCDSSAlerts([
      mk('red', 'R1'),
      mk('red', 'R2'), // 同优先级同 dedupKey，应与 R1 合并
      mk('yellow', 'R3'),
    ]);
    expect(merged.alerts.length).toBe(2);
    const redRep = merged.alerts.find((a) => a.priority === 'red');
    expect(redRep!.mergedCount).toBe(2);
  });

  it('超量压制：原始告警超过上限时，低优先级告警被压制只计数不弹窗', () => {
    const raw = evaluateAll(); // 本例 9 条原始告警
    const bundle = prioritizeCDSSAlerts(raw);
    expect(raw.length).toBeGreaterThan(CDSS_MAX_SURFACE_ALERTS);
    expect(bundle.alerts.length).toBe(CDSS_MAX_SURFACE_ALERTS);
    expect(bundle.suppressedCount).toBe(raw.length - bundle.alerts.length);
    // 被压制的是排在后面的低优先级；弹窗内全是最高优先的那几条
    expect(bundle.alerts.every((a) => a.priority === 'red' || a.priority === 'orange')).toBe(true);
  });

  it('空输入安全降级', () => {
    const bundle = prioritizeCDSSAlerts([]);
    expect(bundle.alerts.length).toBe(0);
    expect(bundle.suppressedCount).toBe(0);
  });
});

describe('M165-A 采纳跟踪 trackCDSSAdoption', () => {
  it('采纳/驳回/升级为有效闭环（acknowledged=true）', () => {
    const rec = trackCDSSAdoption('al_R1_x', 'accepted');
    expect(rec.alertId).toBe('al_R1_x');
    expect(rec.acknowledged).toBe(true);
    expect(trackCDSSAdoption('al_R1_x', 'overridden').acknowledged).toBe(true);
    expect(trackCDSSAdoption('al_R1_x', 'escalated').acknowledged).toBe(true);
  });

  it('忽略（dismissed）不算有效闭环，用于计算告警忽略率', () => {
    const rec = trackCDSSAdoption('al_R1_x', 'dismissed');
    expect(rec.acknowledged).toBe(false);
  });

  it('非法 action 或空 alertId 抛错', () => {
    expect(() => trackCDSSAdoption('al_R1_x', 'bogus' as never)).toThrow();
    expect(() => trackCDSSAdoption('', 'accepted')).toThrow();
  });
});

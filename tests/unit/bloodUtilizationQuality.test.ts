/**
 * 健澜科技 jlmedaios - 用血质量规则引擎 单元测试（M10-B）
 *
 * 纯函数确定性测试：疗效预期/分级、严格指征、剂量、输血前检测、合理性结论、质控指标。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  expectedEfficacy,
  gradeEfficacy,
  strictIndication,
  dosageReasonable,
  preTestComplete,
  concludeUtilization,
  computeQualityMetrics,
  PRE_TEST_REQUIREMENTS,
} from '../../src/medical-tools/quality/bloodUtilizationQuality.js';

describe('M10-B 疗效预期', () => {
  it('红细胞 2U 预期 Hb +20', () => {
    const e = expectedEfficacy('red_cell', 2);
    expect(e.direction).toBe('up');
    expect(e.expectedDelta).toBe(20);
    expect(e.metricUnit).toBe('g/L');
  });
  it('血小板 1 治疗量预期 PLT +20', () => {
    expect(expectedEfficacy('platelet', 1).expectedDelta).toBe(20);
  });
  it('冷沉淀 2U 预期 Fib +0.6', () => {
    expect(expectedEfficacy('cryo', 2).expectedDelta).toBeCloseTo(0.6);
  });
  it('血浆以 INR 目标 1.5 判定', () => {
    const e = expectedEfficacy('plasma', 4);
    expect(e.direction).toBe('down');
    expect(e.target).toBe(1.5);
  });
  it('全血参照红细胞', () => {
    expect(expectedEfficacy('whole', 1).expectedDelta).toBe(10);
  });
});

describe('M10-B 疗效分级', () => {
  it('红细胞达到预期 80% 显效', () => {
    const r = gradeEfficacy('red_cell', 2, 65, 86); // +21 ≥ 16
    expect(r.grade).toBe('effective');
    expect(r.actualDelta).toBe(21);
  });
  it('红细胞刚好达预期 80% 显效', () => {
    const r = gradeEfficacy('red_cell', 2, 65, 81); // +16 = 20*0.8
    expect(r.grade).toBe('effective');
  });
  it('有改善但未达 80% 部分有效', () => {
    const r = gradeEfficacy('red_cell', 2, 65, 75); // +10
    expect(r.grade).toBe('partial');
  });
  it('无改善判定无效', () => {
    const r = gradeEfficacy('red_cell', 2, 65, 63);
    expect(r.grade).toBe('ineffective');
  });
  it('缺输注前/后指标无法判定', () => {
    expect(gradeEfficacy('red_cell', 2, null, 85).grade).toBe('indeterminate');
    expect(gradeEfficacy('red_cell', 2, 65, null).grade).toBe('indeterminate');
  });
  it('血浆 INR 降到 1.5 以下显效', () => {
    expect(gradeEfficacy('plasma', 4, 2.1, 1.4).grade).toBe('effective');
  });
  it('血浆 INR 有下降但未达目标部分有效', () => {
    expect(gradeEfficacy('plasma', 4, 2.1, 1.7).grade).toBe('partial');
  });
  it('血浆 INR 未下降无效', () => {
    expect(gradeEfficacy('plasma', 4, 2.0, 2.2).grade).toBe('ineffective');
  });
});

describe('M10-B 严格指征', () => {
  it('红细胞 Hb<70 合规', () => {
    const v = strictIndication('red_cell', { hb: 65 });
    expect(v.compliant).toBe(true);
    expect(v.matchedRules[0]).toContain('65');
  });
  it('红细胞 Hb 70-80 伴活动性出血合规', () => {
    expect(strictIndication('red_cell', { hb: 76, activeBleeding: true }).compliant).toBe(true);
  });
  it('红细胞 Hb 正常且无出血不合规', () => {
    expect(strictIndication('red_cell', { hb: 120 }).compliant).toBe(false);
  });
  it('红细胞缺指标不合规', () => {
    expect(strictIndication('red_cell', {}).compliant).toBe(false);
  });
  it('血浆 INR>1.7 合规', () => {
    expect(strictIndication('plasma', { inr: 2.1 }).compliant).toBe(true);
  });
  it('血小板 PLT<50 合规', () => {
    expect(strictIndication('platelet', { plt: 30 }).compliant).toBe(true);
  });
  it('冷沉淀 Fib<1.0 合规', () => {
    expect(strictIndication('cryo', { fibrinogen: 0.8 }).compliant).toBe(true);
  });
  it('全血大量失血合规', () => {
    expect(strictIndication('whole', { bloodLoss: 2000 }).compliant).toBe(true);
    expect(strictIndication('whole', { shock: true }).compliant).toBe(true);
  });
});

describe('M10-B 剂量合理性', () => {
  it('红细胞 2U 常规合理', () => {
    expect(dosageReasonable('red_cell', 2, 'routine').reasonable).toBe(true);
  });
  it('红细胞 6U 超常规且非紧急不合理', () => {
    expect(dosageReasonable('red_cell', 6, 'routine').reasonable).toBe(false);
  });
  it('红细胞 6U 急诊豁免合理', () => {
    expect(dosageReasonable('red_cell', 6, 'emergency').reasonable).toBe(true);
  });
  it('血小板 3 超常规不合理', () => {
    expect(dosageReasonable('platelet', 3, 'routine').reasonable).toBe(false);
  });
  it('非正剂量不合理', () => {
    expect(dosageReasonable('red_cell', 0, 'routine').reasonable).toBe(false);
  });
});

describe('M10-B 输血前检测', () => {
  it('共 7 项必查', () => {
    expect(PRE_TEST_REQUIREMENTS).toHaveLength(7);
  });
  it('全部覆盖判定完整', () => {
    const v = preTestComplete([
      'ABO血型', 'HBsAg', 'HCV抗体', 'HIV抗体', 'TPPA', 'PT/INR', 'HGB',
    ]);
    expect(v.complete).toBe(true);
    expect(v.missing).toHaveLength(0);
  });
  it('缺感染筛查列出缺项', () => {
    const v = preTestComplete(['ABO血型', 'HGB']);
    expect(v.complete).toBe(false);
    expect(v.missing).toContain('乙肝表面抗原');
    expect(v.missing).toContain('HIV抗体');
  });
});

describe('M10-B 合理性结论', () => {
  it('三项全合规判定合理', () => {
    const v = concludeUtilization({
      indicationCompliant: true,
      dosageReasonable: true,
      preTestComplete: true,
      preTestMissing: [],
    });
    expect(v.conclusion).toBe('rational');
    expect(v.issues).toHaveLength(0);
  });
  it('指征不合规一票否决不合理', () => {
    const v = concludeUtilization({
      indicationCompliant: false,
      dosageReasonable: true,
      preTestComplete: true,
      preTestMissing: [],
    });
    expect(v.conclusion).toBe('irrational');
  });
  it('指征合规但缺检测判定基本合理', () => {
    const v = concludeUtilization({
      indicationCompliant: true,
      dosageReasonable: true,
      preTestComplete: false,
      preTestMissing: ['HIV抗体'],
    });
    expect(v.conclusion).toBe('largely');
    expect(v.issues[0]).toContain('HIV');
  });
});

describe('M10-B 质控指标聚合', () => {
  const row = (o: Partial<Record<string, unknown>> = {}) => ({
    patientId: String(o.patientId ?? 'p1'),
    isComponent: (o.isComponent ?? true) as boolean,
    reviewed: (o.reviewed ?? true) as boolean,
    conclusion: (o.conclusion ?? 'rational') as never,
    preTestComplete: (o.preTestComplete ?? true) as boolean,
    hasReaction: (o.hasReaction ?? false) as boolean,
    efficacyAssessed: (o.efficacyAssessed ?? true) as boolean,
    completed: (o.completed ?? true) as boolean,
  });

  it('全成分、全合格、全检测 → 指标 100', () => {
    const m = computeQualityMetrics([row(), row({ patientId: 'p2' })], 100);
    expect(m.componentTransfusionRate).toBe(100);
    expect(m.indicationPassRate).toBe(100);
    expect(m.preTestRate).toBe(100);
    expect(m.reactionRate).toBe(0);
    expect(m.efficacyAssessmentRate).toBe(100);
  });
  it('含全血 → 成分输血率下降', () => {
    const m = computeQualityMetrics([row(), row({ isComponent: false })], 10);
    expect(m.componentTransfusionRate).toBe(50);
  });
  it('含不合理 → 指征合格率下降', () => {
    const m = computeQualityMetrics([row(), row({ conclusion: 'irrational' })], 10);
    expect(m.indicationPassRate).toBe(50);
  });
  it('分母为 0 时安全返回 0', () => {
    const m = computeQualityMetrics([], 0);
    expect(m.componentTransfusionRate).toBe(0);
    expect(m.inpatientTransfusionRate).toBe(0);
  });
  it('返回分子/分母', () => {
    const m = computeQualityMetrics([row(), row({ isComponent: false })], 10);
    expect(m.fractions.componentTransfusionRate).toEqual({ numerator: 1, denominator: 2 });
  });
});

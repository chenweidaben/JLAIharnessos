/**
 * 健澜科技 jlmedaios - M176-D 输血管理深化纯函数单测（临床核心深化）。
 *
 * 不依赖数据库：仅测 buildDeepBloodMgmt / assessTransfusionIndication /
 * trackTransfusionReaction / evaluateTransfusionEffect。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildDeepBloodMgmt,
  assessTransfusionIndication,
  trackTransfusionReaction,
  evaluateTransfusionEffect,
} from '@/bff/aggregators/bloodDeepAggregator';

describe('buildDeepBloodMgmt', () => {
  it('返回四维度：适应症/前评估/过程/后评价，且差错率下降为正', () => {
    const m = buildDeepBloodMgmt();
    expect(m.dimensions.map((d) => d.code)).toEqual([
      'indication', 'pre_check', 'intra', 'post_eval',
    ]);
    expect(m.demo).toBe(true);
    expect(m.overallErrorReductionPctPoints).toBeGreaterThan(0);
    expect(m.guardrails.length).toBeGreaterThan(0);
    for (const d of m.dimensions) {
      expect(d.kpi.baselineErrorRatePct).toBeGreaterThan(d.kpi.targetErrorRatePct);
      expect(d.controls.length).toBeGreaterThan(0);
    }
  });

  it('确定性：同参两次结果一致', () => {
    expect(buildDeepBloodMgmt()).toEqual(buildDeepBloodMgmt());
  });
});

describe('assessTransfusionIndication', () => {
  it('活动性大出血 + 休克指数≥1 → urgent，推荐 MTP 成分血', () => {
    const r = assessTransfusionIndication(
      { patientId: 'P-1', hb: 58, plt: 90, sbp: 88, hr: 118, weightKg: 60 },
      { scenario: 'hemorrhage', estimatedBloodLossMl: 1500, activeBleeding: true },
    );
    expect(r.level).toBe('urgent');
    expect(r.component).toBe('wb');
    expect(r.shockIndex).toBeGreaterThanOrEqual(1.0);
    expect(r.preChecklist.length).toBeGreaterThan(0);
  });

  it('慢性贫血 Hb 58 → elective/urgent 红细胞，给出 U 数与预期升幅', () => {
    const r = assessTransfusionIndication(
      { patientId: 'P-2', hb: 58, plt: 210, sbp: 120, hr: 75, weightKg: 55 },
      { scenario: 'anemia', estimatedBloodLossMl: 0, activeBleeding: false },
    );
    expect(r.component).toBe('rbc');
    expect(r.level).not.toBe('none');
    expect(r.suggestedDose).toContain('U');
  });

  it('Hb 96 无症状 → none，且给出禁忌提示（不无指征输血）', () => {
    const r = assessTransfusionIndication(
      { patientId: 'P-3', hb: 96, plt: 200, sbp: 120, hr: 72, weightKg: 55 },
      { scenario: 'anemia', estimatedBloodLossMl: 0, activeBleeding: false },
    );
    expect(r.level).toBe('none');
    expect(r.component).toBe('none');
    expect(r.contraindications.length).toBeGreaterThan(0);
  });

  it('血小板 18×10^9/L → 推荐单采血小板', () => {
    const r = assessTransfusionIndication(
      { patientId: 'P-4', hb: 100, plt: 18, sbp: 118, hr: 80, weightKg: 55 },
      { scenario: 'thrombocytopenia', estimatedBloodLossMl: 0, activeBleeding: false },
    );
    expect(r.component).toBe('platelet');
    expect(r.level).toBe('urgent');
  });

  it('合并冠心病阈值上调：Hb 75 在正常人无指征，在冠心病人触发', () => {
    const normal = assessTransfusionIndication(
      { patientId: 'P-5a', hb: 75, plt: 200, sbp: 120, hr: 72, weightKg: 55 },
      { scenario: 'anemia', estimatedBloodLossMl: 0, activeBleeding: false },
    );
    const cardiac = assessTransfusionIndication(
      { patientId: 'P-5b', hb: 75, plt: 200, sbp: 120, hr: 72, weightKg: 55 },
      { scenario: 'anemia', estimatedBloodLossMl: 0, activeBleeding: false, cardiacComorbidity: true },
    );
    expect(normal.level).toBe('none');
    expect(cardiac.level).not.toBe('none');
  });
});

describe('trackTransfusionReaction', () => {
  it('腰痛+寒战+血压骤降 → 急性溶血，severe + fatal + 立即停血', () => {
    const r = trackTransfusionReaction('T-1', ['腰痛', '寒战', '血压骤降', '茶色尿']);
    expect(r.type).toBe('acute_hemolytic');
    expect(r.severity).toBe('severe');
    expect(r.fatal).toBe(true);
    expect(r.actions[0]).toContain('停止输血');
    expect(r.report.length).toBeGreaterThan(0);
  });

  it('皮疹+瘙痒 → 发热/过敏 mild，不停血只减慢', () => {
    const r = trackTransfusionReaction('T-2', ['皮疹', '瘙痒', '荨麻疹']);
    expect(r.type).toBe('febrile_allergic');
    expect(r.fatal).toBe(false);
    expect(r.actions.join(';')).not.toContain('立即停止输血');
  });

  it('呼吸困难+粉红色泡沫痰+端坐呼吸 → TACO（循环超负荷）', () => {
    const r = trackTransfusionReaction('T-3', ['呼吸困难', '粉红色泡沫痰', '端坐呼吸']);
    expect(r.type).toBe('taco');
    expect(r.fatal).toBe(true);
  });

  it('无症状 → none，继续常规监测', () => {
    const r = trackTransfusionReaction('T-4', []);
    expect(r.type).toBe('none');
    expect(r.severity).toBe('none');
    expect(r.fatal).toBe(false);
  });

  it('确定性：同参两次结果一致', () => {
    expect(trackTransfusionReaction('T-5', ['寒战', '高热'])).toEqual(
      trackTransfusionReaction('T-5', ['寒战', '高热']),
    );
  });
});

describe('evaluateTransfusionEffect', () => {
  it('2U 红细胞 Hb 58→78（+20）→ 显效/有效，命中预期增量', () => {
    const r = evaluateTransfusionEffect('T-10', {
      preHb: 58, postHb: 78, component: 'rbc', units: 2, weightKg: 55,
    });
    expect(r.hbDelta).toBe(20);
    expect(['excellent', 'effective']).toContain(r.grade);
    expect(r.metExpected).toBe(true);
    expect(r.estimatedCostCny).toBeGreaterThan(0);
  });

  it('2U 红细胞 Hb 58→62（+4）→ 无效，提示继续出血/标本问题', () => {
    const r = evaluateTransfusionEffect('T-11', {
      preHb: 58, postHb: 62, component: 'rbc', units: 2, weightKg: 55,
    });
    expect(r.grade).toBe('ineffective');
    expect(r.metExpected).toBe(false);
    expect(r.conclusions.join(';')).toContain('继续出血');
  });

  it('1 治疗量血小板 PLT 18→45 → 有效，给出 PLT 增量', () => {
    const r = evaluateTransfusionEffect('T-12', {
      preHb: 100, postHb: 100,
      prePlt: 18, postPlt: 45,
      component: 'platelet', units: 1, weightKg: 55,
    });
    expect(r.pltDelta).toBe(27);
    expect(['excellent', 'effective']).toContain(r.grade);
  });

  it('体重越大每 U 升 Hb 越少（55kg vs 80kg）', () => {
    const light = evaluateTransfusionEffect('T-13', {
      preHb: 60, postHb: 70, component: 'rbc', units: 1, weightKg: 55,
    });
    const heavy = evaluateTransfusionEffect('T-14', {
      preHb: 60, postHb: 70, component: 'rbc', units: 1, weightKg: 80,
    });
    expect(light.expectedHbRisePerUnit).toBeGreaterThan(heavy.expectedHbRisePerUnit);
  });
});

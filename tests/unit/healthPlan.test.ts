/**
 * 健澜科技 jlmedaios - 个性化健康计划（M160-D · 患者健康管理深化）纯函数单测
 *
 * 覆盖：
 *  - 计划生成 buildPersonalizedHealthPlan：健康人群基线 vs 高血压+糖尿病+减重
 *    个性化推导（运动量 / 热量 / 用药提醒 / 复查间隔 / 红旗症状因人而异）；
 *  - 进度追踪 trackHealthProgress：运动累计、饮食 / 用药依从率滑动计算、
 *    漏药达阈值即预警；
 *  - 动态调整 adjustHealthPlan：too_hard 降量 20%、too_easy 增量 15%、
 *    不适减量并留痕，每次调整 version +1。
 *
 * 全部运行时内存数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it } from 'bun:test';

import {
  __resetHealthPlanStore,
  adjustHealthPlan,
  buildPersonalizedHealthPlan,
  trackHealthProgress,
} from '../../src/bff/aggregators/healthPlanAggregator';

beforeEach(() => {
  __resetHealthPlanStore();
});

describe('计划生成：个性化，不一刀切', () => {
  it('健康人群基线：150 分钟中等强度、2000 kcal、年度体检、通用红旗', () => {
    const plan = buildPersonalizedHealthPlan('p-base', [], []);
    expect(plan.exercise.weeklyMinutes).toBe(150);
    expect(plan.exercise.intensity).toBe('中等');
    expect(plan.diet.dailyKcal).toBe(2000);
    expect(plan.medication).toEqual([]);
    expect(plan.followup.intervalDays).toBe(365);
    expect(plan.redFlags.length).toBeGreaterThan(0);
    expect(plan.version).toBe(1);
  });

  it('高血压+糖尿病+减重：运动量 / 热量 / 用药提醒 / 复查 / 红旗均被个性化改写', () => {
    const plan = buildPersonalizedHealthPlan('p-sick', ['hypertension', 'diabetes'], ['weight_loss', 'glucose_control']);

    // 慢病改写：温和强度、避免空腹运动、随身带糖
    expect(plan.exercise.intensity).toBe('温和');
    expect(plan.exercise.cautions).toEqual(expect.arrayContaining([expect.stringContaining('空腹运动')]));
    // 减重目标在慢病基础上再 +25% 运动量
    expect(plan.exercise.weeklyMinutes).toBeGreaterThan(150);
    // 糖尿病饮食降到 1800kcal，减重再扣 300
    expect(plan.diet.dailyKcal).toBeLessThanOrEqual(1500);
    expect(plan.diet.restrict).toEqual(expect.arrayContaining([expect.stringContaining('精制糖')]));
    // 两种慢病各自的用药提醒都在
    expect(plan.medication.length).toBeGreaterThanOrEqual(2);
    expect(plan.medication.some((m) => m.name.includes('降压'))).toBe(true);
    expect(plan.medication.some((m) => m.name.includes('降糖'))).toBe(true);
    // 复查间隔缩短到 90 天，且含 HbA1c / 肾功能
    expect(plan.followup.intervalDays).toBe(90);
    expect(plan.followup.items).toEqual(expect.arrayContaining([expect.stringContaining('糖化血红蛋白')]));
    // 红旗症状同时覆盖高血压危象与低血糖
    expect(plan.redFlags.some((f) => f.symptom.includes('血压'))).toBe(true);
    expect(plan.redFlags.some((f) => f.symptom.includes('低血糖'))).toBe(true);
  });

  it('同一患者重复生成返回同一版本，不重复建计划', () => {
    const a = buildPersonalizedHealthPlan('p-re', ['chd'], []);
    const b = buildPersonalizedHealthPlan('p-re', [], []);
    expect(b.planId).toBe(a.planId);
    expect(b.chronicConditions).toEqual(['chd']);
  });

  it('冠心病患者：运动量压低、加入胸痛拨打120红旗', () => {
    const plan = buildPersonalizedHealthPlan('p-chd', ['chd'], []);
    expect(plan.exercise.weeklyMinutes).toBeLessThan(150);
    expect(plan.redFlags.some((f) => f.symptom.includes('胸痛'))).toBe(true);
  });
});

describe('进度追踪 trackHealthProgress', () => {
  it('运动分钟数累计，饮食依从率按滑动平均更新', () => {
    const plan = buildPersonalizedHealthPlan('p-t', ['diabetes'], []);
    const r1 = trackHealthProgress(plan.planId, { type: 'exercise', minutes: 30 });
    expect(r1.progress.weeklyExerciseMinutes).toBe(30);
    const r2 = trackHealthProgress(plan.planId, { type: 'exercise', minutes: 20 });
    expect(r2.progress.weeklyExerciseMinutes).toBe(50);

    trackHealthProgress(plan.planId, { type: 'diet', onPlan: true });
    const r3 = trackHealthProgress(plan.planId, { type: 'diet', onPlan: false });
    expect(r3.progress.dietAdherence).toBeGreaterThan(0);
    expect(r3.progress.dietAdherence).toBeLessThan(1);
  });

  it('漏药达到阈值即触发预警，按时服药不预警', () => {
    const plan = buildPersonalizedHealthPlan('p-miss', ['hypertension'], []); // 阈值 2
    const ok = trackHealthProgress(plan.planId, { type: 'medication', onTime: true });
    expect(ok.alerts).toEqual([]);
    const miss1 = trackHealthProgress(plan.planId, { type: 'medication', onTime: false });
    expect(miss1.alerts).toEqual([]);
    const miss2 = trackHealthProgress(plan.planId, { type: 'medication', onTime: false });
    expect(miss2.alerts.length).toBe(1);
    expect(miss2.alerts[0]).toContain('漏药');
  });

  it('用药依从率随按时服药次数上升', () => {
    const plan = buildPersonalizedHealthPlan('p-adh', ['diabetes'], []);
    trackHealthProgress(plan.planId, { type: 'medication', onTime: true });
    trackHealthProgress(plan.planId, { type: 'medication', onTime: true });
    const r = trackHealthProgress(plan.planId, { type: 'medication', onTime: false });
    expect(r.progress.medicationAdherence).toBeCloseTo(2 / 3, 2);
  });

  it('未知 planId 抛错', () => {
    expect(() => trackHealthProgress('hp-not-exist', { type: 'exercise', minutes: 10 })).toThrow();
  });
});

describe('动态调整 adjustHealthPlan', () => {
  it('too_hard：运动量下调 20%，version +1，留痕', () => {
    const plan = buildPersonalizedHealthPlan('p-adj', ['obesity'], ['weight_loss']);
    const before = plan.exercise.weeklyMinutes;
    const next = adjustHealthPlan(plan.planId, { difficulty: 'too_hard' });
    expect(next.exercise.weeklyMinutes).toBe(Math.round(before * 0.8));
    expect(next.version).toBe(2);
    expect(next.lastAdjustReason).toContain('太难');
  });

  it('too_easy：运动量上调 15%', () => {
    const plan = buildPersonalizedHealthPlan('p-easy', [], ['fitness']);
    const before = plan.exercise.weeklyMinutes;
    const next = adjustHealthPlan(plan.planId, { difficulty: 'too_easy' });
    expect(next.exercise.weeklyMinutes).toBe(Math.round(before * 1.15));
  });

  it('discomfort：运动量降 10% 并追加注意事项', () => {
    const plan = buildPersonalizedHealthPlan('p-dis', ['diabetes'], []);
    const before = plan.exercise.weeklyMinutes;
    const next = adjustHealthPlan(plan.planId, { difficulty: 'ok', discomfort: '膝盖痛' });
    expect(next.exercise.weeklyMinutes).toBe(Math.round(before * 0.9));
    expect(next.exercise.cautions.some((c) => c.includes('膝盖痛'))).toBe(true);
  });

  it('连续调整版本号递增', () => {
    const plan = buildPersonalizedHealthPlan('p-ver', [], []);
    let v = adjustHealthPlan(plan.planId, { difficulty: 'too_hard' });
    v = adjustHealthPlan(v.planId, { difficulty: 'too_easy' });
    expect(v.version).toBe(3);
  });
});

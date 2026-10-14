/**
 * 健澜科技 jlmedaios - AI护理计划推荐（M90-B）纯函数单测
 *
 * 覆盖：真实诊断文本 → recommendPlan 关键词推荐引擎（肺炎/术后命中、双命中升级 high、
 * 空诊断或无关诊断走默认通用监测包 low）。全部使用 mock 诊断文本，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect,it } from 'bun:test';

import { recommendPlan } from '../../src/bff/aggregators/aiNursingPlanAggregator';

describe('M90-B 护理计划推荐引擎（真实诊断文本驱动）', () => {
  it('诊断含「肺炎」：命中呼吸道护理条目，风险 medium', () => {
    const { plan, riskLevel } = recommendPlan('社区获得性肺炎');
    const items = plan.map((p) => p.item);
    expect(items.some((t) => t.includes('翻身拍背'))).toBe(true);
    expect(items.some((t) => t.includes('氧疗'))).toBe(true);
    expect(riskLevel).toBe('medium');
  });

  it('诊断含「术后/手术」：命中术后护理条目，风险 medium', () => {
    const { plan, riskLevel } = recommendPlan('胆囊切除术后状态');
    const items = plan.map((p) => p.item);
    expect(items.some((t) => t.includes('切口'))).toBe(true);
    expect(items.some((t) => t.includes('疼痛'))).toBe(true);
    expect(riskLevel).toBe('medium');
  });

  it('诊断同时含「肺炎」与「术后」：权重累加 → high 风险', () => {
    const { riskLevel } = recommendPlan('肺炎；肺部手术后');
    expect(riskLevel).toBe('high');
  });

  it('诊断文本为空（查不到诊断）：走默认通用监测包，风险 low', () => {
    const { plan, riskLevel } = recommendPlan('');
    expect(plan.length).toBe(3);
    expect(plan.every((p) => p.category === '基础护理')).toBe(true);
    expect(riskLevel).toBe('low');
  });

  it('诊断为无关疾病（如糖尿病）：无关键词命中，仍走默认通用监测包', () => {
    const { plan, riskLevel } = recommendPlan('2型糖尿病');
    expect(plan.some((p) => p.category === '基础护理')).toBe(true);
    expect(riskLevel).toBe('low');
  });

  it('多诊断拼接文本（模拟 诊断表+病案首页 合并）：任一命中即触发对应护理包', () => {
    // 真实场景：getDiagnosesByVisit 多诊断 + medicalHeader primary/secondary 拼接
    const merged = '高血压；肺炎；术后';
    const { plan, riskLevel } = recommendPlan(merged);
    expect(plan.some((p) => p.item.includes('氧疗'))).toBe(true);
    expect(plan.some((p) => p.item.includes('切口'))).toBe(true);
    expect(riskLevel).toBe('high');
  });
});

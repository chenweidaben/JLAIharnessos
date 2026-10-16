/**
 * 健澜科技 jlmedaios - 【科研教学后勤】科研全流程辅助纯函数单测（M171-A）
 *
 * 覆盖：
 *  - buildFullResearchPipeline：七步齐备、topic 回显、每步任务与红线；
 *  - estimateSampleSize：经典两样本公式锚点（α=0.05、power=0.8、d=0.8/0.5）；
 *  - recommendStatisticalMethod：研究设计 × 数据类型 → 主分析/报告规范；
 *  - identifyBiasRisk：RCT→RoB 2、观察性→ROBINS-I、诊断→QUADAS-2。
 *
 * 仅测纯函数，不触碰 IO / 时钟 / WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  biasRiskLabel,
  buildFullResearchPipeline,
  estimateSampleSize,
  identifyBiasRisk,
  recommendStatisticalMethod,
} from '../../src/bff/aggregators/researchPipelineAggregator';

describe('buildFullResearchPipeline 科研全流程七步', () => {
  it('返回恰好七步，且 topic 原样回显', () => {
    const r = buildFullResearchPipeline('阿司匹林一级预防老年卒中');
    expect(r.topic).toBe('阿司匹林一级预防老年卒中');
    expect(r.stages).toHaveLength(7);
  });

  it('七步顺序：选题→文献→设计→实施→分析→写作→投稿', () => {
    const r = buildFullResearchPipeline('高血压靶器官损害');
    expect(r.stages.map((s) => s.id)).toEqual([
      'topic', 'literature', 'design', 'implement', 'analysis', 'writing', 'submission',
    ]);
  });

  it('每步均含方法学任务与质量红线', () => {
    const r = buildFullResearchPipeline('糖尿病肾病');
    for (const s of r.stages) {
      expect(s.tasks.length).toBeGreaterThan(0);
      expect(s.redFlags.length).toBeGreaterThan(0);
      for (const t of s.tasks) {
        expect(t.point.length).toBeGreaterThan(0);
        expect(t.deliverable.length).toBeGreaterThan(0);
      }
    }
  });

  it('全程合规伦理提示非空（伦理/预注册/数据脱敏）', () => {
    const r = buildFullResearchPipeline('慢阻肺急性加重');
    expect(r.governanceNotes.length).toBeGreaterThanOrEqual(3);
    expect(r.governanceNotes.join(' ')).toContain('伦理');
  });

  it('空 topic 抛错', () => {
    expect(() => buildFullResearchPipeline('   ')).toThrow();
  });
});

describe('estimateSampleSize 样本量估算（两独立样本经典公式）', () => {
  it('α=0.05, power=0.8, d=0.8（大效应）：每组 25 例，合计 50', () => {
    const r = estimateSampleSize(0.05, 0.8, 0.8);
    expect(r.perGroup).toBe(25);
    expect(r.total).toBe(50);
    expect(r.alpha).toBe(0.05);
    expect(r.power).toBe(0.8);
  });

  it('α=0.05, power=0.8, d=0.5（中效应）：每组约 63 例', () => {
    const r = estimateSampleSize(0.05, 0.8, 0.5);
    expect(r.perGroup).toBe(63);
    expect(r.total).toBe(126);
  });

  it('效应量越小所需样本量越大（单调性）', () => {
    const small = estimateSampleSize(0.05, 0.8, 0.2).perGroup;
    const medium = estimateSampleSize(0.05, 0.8, 0.5).perGroup;
    const large = estimateSampleSize(0.05, 0.8, 0.8).perGroup;
    expect(small).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(large);
  });

  it('结果含公式与失访冗余提示', () => {
    const r = estimateSampleSize(0.05, 0.9, 0.5);
    expect(r.formula).toContain('z');
    expect(r.assumptions).toContain('失访');
  });

  it('非法入参抛错：α 越界 / power 过低 / d 非正', () => {
    expect(() => estimateSampleSize(0.5, 0.8, 0.5)).toThrow();
    expect(() => estimateSampleSize(0.05, 0.3, 0.5)).toThrow();
    expect(() => estimateSampleSize(0.05, 0.8, 0)).toThrow();
  });
});

describe('recommendStatisticalMethod 统计方法推荐', () => {
  it('RCT + 二分类 → 卡方/Fisher', () => {
    const r = recommendStatisticalMethod('rct', 'binary');
    expect(r.primaryTest).toContain('卡方');
    expect(r.reportingStandard).toBe('CONSORT 2010');
    expect(r.effectMeasure).toContain('OR');
  });

  it('前瞻性队列 + 生存 → Kaplan-Meier/Cox', () => {
    const r = recommendStatisticalMethod('prospective-cohort', 'survival');
    expect(r.primaryTest).toContain('Kaplan-Meier');
    expect(r.effectMeasure).toContain('HR');
  });

  it('回顾性队列 → 必含 PSM/IPTW 混杂校正', () => {
    const r = recommendStatisticalMethod('retrospective-cohort', 'binary');
    expect(r.alternatives.join(' ')).toContain('IPTW');
    expect(r.reportingStandard).toBe('STROBE');
  });

  it('诊断准确性 + 二分类 → ROC/AUC（DeLong）', () => {
    const r = recommendStatisticalMethod('diagnostic', 'binary');
    expect(r.primaryTest).toContain('ROC');
    expect(r.reportingStandard).toBe('STARD 2015');
  });

  it('非法设计/数据类型抛错', () => {
    expect(() => recommendStatisticalMethod('unknown', 'binary')).toThrow();
    expect(() => recommendStatisticalMethod('rct', 'percent')).toThrow();
  });
});

describe('identifyBiasRisk 偏倚风险识别', () => {
  it('RCT → 对齐 Cochrane RoB 2', () => {
    const r = identifyBiasRisk('rct');
    expect(r.tool).toContain('RoB 2');
    expect(r.domains.length).toBe(5);
  });

  it('回顾性队列 → 对齐 ROBINS-I，混杂偏倚至少为严重', () => {
    const r = identifyBiasRisk('retrospective-cohort');
    expect(r.tool).toContain('ROBINS-I');
    const confounding = r.domains.find((d) => d.domain === 'confounding');
    expect(confounding?.risk).toBe('serious');
  });

  it('诊断准确性 → 对齐 QUADAS-2', () => {
    const r = identifyBiasRisk('diagnostic');
    expect(r.tool).toContain('QUADAS-2');
  });

  it('总体风险取各域最高等级', () => {
    const r = identifyBiasRisk('case-control');
    const order = ['low', 'moderate', 'serious', 'critical'];
    let maxLevel: 'low' | 'moderate' | 'serious' | 'critical' = 'low';
    for (const d of r.domains) {
      if (order.indexOf(d.risk) > order.indexOf(maxLevel)) maxLevel = d.risk;
    }
    expect(r.overallRisk).toBe(maxLevel);
  });

  it('偏倚等级中文标签可复用', () => {
    expect(biasRiskLabel('serious')).toBe('严重风险');
    expect(biasRiskLabel('low')).toBe('低风险');
  });
});

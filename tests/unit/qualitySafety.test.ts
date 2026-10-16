/**
 * 健澜科技 jlmedaios - 【质量与体验】医院质量与安全管理深化纯函数单测（M180-A）
 *
 * 覆盖：深度质量安全体系（四大维度）、指标跟踪（国家口径对照达标线/零容忍红线）、
 *       差距分析（现状 vs 标准，红黄分级排序）、改进措施（根因匹配方法论）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildDeepQualitySafety,
  generateQualityImprovement,
  identifyQualityGap,
  trackQualityIndicator,
  QualitySafetyError,
  PATIENT_SAFETY_GOALS,
  type GapItem,
  type QualityIndicatorInput,
  type RootCause,
} from '../../src/bff/aggregators/qualitySafetyAggregator';

/* ---------------------------------------------------------------------------
 * 0. 体系总览
 * ------------------------------------------------------------------------- */
describe('buildDeepQualitySafety - 四大管理维度国家口径', () => {
  it('返回四大维度且挂国家口径依据', () => {
    const sys = buildDeepQualitySafety();
    expect(sys.dimensions.length).toBe(4);
    expect(sys.nationalStandard).toContain('三级医院评审标准');
    expect(sys.guardrails.length).toBeGreaterThan(0);
    const codes = sys.dimensions.map((d) => d.code);
    expect(codes).toContain('medical_quality');
    expect(codes).toContain('patient_safety');
    expect(codes).toContain('quality_improvement');
    expect(codes).toContain('review_readiness');
  });

  it('患者安全维度固定挂十大安全目标（不多不少）', () => {
    expect(PATIENT_SAFETY_GOALS.length).toBe(10);
    const ps = buildDeepQualitySafety().dimensions.find((d) => d.code === 'patient_safety');
    expect(ps).toBeDefined();
    expect(ps!.nationalItems.length).toBeGreaterThanOrEqual(10);
    expect(ps!.nationalItems[0].name).toContain('识别患者身份');
  });

  it('质量改进维度含 PDCA/QCC/DMAIC/Lean 四方法论', () => {
    const qi = buildDeepQualitySafety().dimensions.find((d) => d.code === 'quality_improvement');
    expect(qi).toBeDefined();
    const names = qi!.nationalItems.map((n) => n.name).join();
    expect(names).toContain('PDCA');
    expect(names).toContain('品管圈');
    expect(names).toContain('六西格玛');
    expect(names).toContain('精益');
  });
});

/* ---------------------------------------------------------------------------
 * 1. 指标跟踪 trackQualityIndicator
 * ------------------------------------------------------------------------- */
describe('trackQualityIndicator - 国家口径指标跟踪', () => {
  it('higher_better 达标：手卫生 95/95 → 绿', () => {
    const ind: QualityIndicatorInput = {
      code: 'PSG-04', name: '手卫生依从率', unit: '%',
      direction: 'higher_better', target: 95, actual: 95, sampleSize: 300,
    };
    const r = trackQualityIndicator(ind, '内科', '2026-10');
    expect(r.severity).toBe('green');
    expect(r.deviationPct).toBe(0);
    expect(r.summary).toContain('达标');
  });

  it('higher_better 不足：手卫生 89/95 → 黄（偏差 6.3% <20%）', () => {
    const ind: QualityIndicatorInput = {
      code: 'PSG-04', name: '手卫生依从率', unit: '%',
      direction: 'higher_better', target: 95, actual: 89, sampleSize: 500,
    };
    const r = trackQualityIndicator(ind, '内科', '2026-10');
    expect(r.severity).toBe('yellow');
    expect(r.deviationPct).toBeCloseTo(6.32, 1);
  });

  it('lower_better 严重超标：并发症 22.4/18 ‰ → 红（偏差 ≥20%）', () => {
    const ind: QualityIndicatorInput = {
      code: 'KPI-MQ-02', name: '手术患者并发症发生率', unit: '‰',
      direction: 'lower_better', target: 18, actual: 22.4, sampleSize: 420,
    };
    const r = trackQualityIndicator(ind, '外科', '2026-10');
    expect(r.severity).toBe('red');
    expect(r.deviation).toBe(4.4);
  });

  it('患者安全零容忍：实际 >0 即红线（即便偏差百分比小）', () => {
    const ind: QualityIndicatorInput = {
      code: 'PSG-05', name: '住院跌倒发生率', unit: '‰',
      direction: 'lower_better', target: 0, actual: 0.6, sampleSize: 1200, zeroTolerance: true,
    };
    const r = trackQualityIndicator(ind, '全院', '2026-10');
    expect(r.severity).toBe('red');
    expect(r.summary).toContain('红线');
  });

  it('样本量 n<30 标记 underpowered', () => {
    const ind: QualityIndicatorInput = {
      code: 'X', name: '小样本指标', unit: '%',
      direction: 'lower_better', target: 5, actual: 6, sampleSize: 12,
    };
    const r = trackQualityIndicator(ind, '测试科', '2026-10');
    expect(r.underpowered).toBe(true);
  });

  it('非法方向抛 400', () => {
    expect(() =>
      trackQualityIndicator(
        // @ts-expect-error 故意传非法方向
        { code: 'X', name: '坏方向', unit: '%', direction: 'sideways', target: 1, actual: 1 },
        '科', '2026-10',
      ),
    ).toThrow(QualitySafetyError);
  });
});

/* ---------------------------------------------------------------------------
 * 2. 差距分析 identifyQualityGap
 * ------------------------------------------------------------------------- */
describe('identifyQualityGap - 现状 vs 国家/评审标准', () => {
  const items: GapItem[] = [
    { code: 'KPI-MQ-01', name: '四级手术比例', unit: '%', direction: 'higher_better', standard: 25, current: 23 },
    { code: 'EMR-L5', name: '电子病历五级 CDSS 闭环率', unit: '%', direction: 'higher_better', standard: 90, current: 72 },
    { code: 'KPI-MQ-03', name: 'I 类切口感染率', unit: '%', direction: 'lower_better', standard: 1.5, current: 1.1 },
  ];

  it('算差距并红黄绿分级、red 排最前', () => {
    const rep = identifyQualityGap('外科', items);
    expect(rep.total).toBe(3);
    expect(rep.redCount).toBe(1); // EMR 72 vs 90 → 20% 差 → 红
    expect(rep.yellowCount).toBe(1); // KPI 18.5 vs 25 → 26%? -> 6.5/25=26% 红?
    expect(rep.greenCount).toBe(1); // lower_better 1.1<=1.5 达标
    expect(rep.gaps[0].severity).toBe('red');
    expect(rep.gaps[0].priority).toBe('high');
  });

  it('达标项 gap 为 0、severity green', () => {
    const rep = identifyQualityGap('外科', items);
    const ok = rep.gaps.find((g) => g.code === 'KPI-MQ-03');
    expect(ok?.gap).toBe(0);
    expect(ok?.severity).toBe('green');
  });

  it('非数组 target 抛 400', () => {
    expect(() => identifyQualityGap('科', null as unknown as GapItem[])).toThrow(QualitySafetyError);
  });
});

/* ---------------------------------------------------------------------------
 * 3. 改进措施 generateQualityImprovement
 * ------------------------------------------------------------------------- */
describe('generateQualityImprovement - 根因匹配改进方法论', () => {
  it('方法类根因 → 品管圈 QCC，输出措施清单与闭环要求', () => {
    const plan = generateQualityImprovement('交接流程不清导致差错', '方法' as RootCause);
    expect(plan.method).toBe('QCC');
    expect(plan.measures.length).toBeGreaterThan(0);
    expect(plan.closedLoop).toContain('before/after');
    for (const m of plan.measures) {
      expect(m.action.length).toBeGreaterThan(0);
      expect(m.owner.length).toBeGreaterThan(0);
      expect(m.timeline.length).toBeGreaterThan(0);
    }
  });

  it('人员类根因 → PDCA 培训-考核闭环', () => {
    const plan = generateQualityImprovement('护士手卫生依从率偏低', '人员' as RootCause);
    expect(plan.method).toBe('PDCA');
  });

  it('设备类根因 → 六西格玛 DMAIC 含 Improve/Control', () => {
    const plan = generateQualityImprovement('监护仪报警疲劳', '机器' as RootCause);
    expect(plan.method).toBe('DMAIC');
    const acts = plan.measures.map((m) => m.action).join();
    expect(acts).toContain('Control');
  });

  it('空问题描述抛 400', () => {
    expect(() => generateQualityImprovement('   ', '人员' as RootCause)).toThrow(QualitySafetyError);
  });
});

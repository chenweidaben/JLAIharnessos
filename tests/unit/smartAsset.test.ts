/**
 * 健澜科技 jlmedaios - M161-B 全院智慧资产看板聚合器纯函数单测
 *
 * 覆盖：
 *  - 资产统计：四维计数汇总、子项饱和折算、加权总分、demo 标记；
 *  - 增长计算：calculateAssetGrowth 的 delta / growthRate / 上下行 / 空快照；
 *  - 缺口识别：identifyAssetGap 的 shortfall 排序、严重度分级、饱和后无缺口；
 *  - 段位对标：benchmarkAssetLevel 四档阈值与距下一档差距。
 *
 * 仅测纯函数，不触碰 IO / 时钟（时间戳统一注入 'NOW'）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildSmartAssetDashboard,
  calculateAssetGrowth,
  identifyAssetGap,
  benchmarkAssetLevel,
  SUB_TARGETS,
  DIMENSION_WEIGHT,
  WEAK_SCORE_THRESHOLD,
  type SmartAssetInput,
  type SmartAssetSnapshot,
} from '../../src/bff/aggregators/smartAssetAggregator';

/** 一份「中段」基准快照：每个子项恰好 = 目标的 60%，便于精确断言 */
function baseInput(overrides: Partial<SmartAssetInput> = {}): SmartAssetInput {
  return {
    doctorExperience: 1800, // /3000 = 60
    nurseExperience: 1200, // /2000 = 60
    pharmacistExperience: 480, // /800 = 60
    diseaseKnowledge: 300, // /500 = 60
    drugKnowledge: 1200, // /2000 = 60
    guidelineKnowledge: 180, // /300 = 60
    diagnosisModels: 30, // /50 = 60
    predictionModels: 18, // /30 = 60
    recommendationModels: 24, // /40 = 60
    structuredAssets: 4800, // /8000 = 60
    unstructuredAssets: 2400, // /4000 = 60
    ...overrides,
  };
}

describe('buildSmartAssetDashboard 资产统计', () => {
  it('四维权重之和 = 100%，且恒为 4 个维度', () => {
    const d = buildSmartAssetDashboard('h1', baseInput(), 'NOW');
    expect(d.dimensions).toHaveLength(4);
    expect(d.dimensions.reduce((a, x) => a + x.weight, 0)).toBe(100);
  });

  it('四维计数正确汇总：经验 3480 / 知识 1680 / 模型 72 / 数据 7200', () => {
    const d = buildSmartAssetDashboard('h1', baseInput(), 'NOW');
    const by = (k: string) => d.dimensions.find((x) => x.key === k)?.total;
    expect(by('experience')).toBe(3480);
    expect(by('knowledge')).toBe(1680);
    expect(by('model')).toBe(72);
    expect(by('data')).toBe(7200);
    expect(d.totalAssets).toBe(3480 + 1680 + 72 + 7200);
  });

  it('基准快照每维得分 = 60，加权总分 = 60', () => {
    const d = buildSmartAssetDashboard('h1', baseInput(), 'NOW');
    for (const dim of d.dimensions) {
      expect(dim.score).toBeCloseTo(60, 0);
    }
    // 30*0.6 + 25*0.6 + 25*0.6 + 20*0.6 = 60
    expect(d.smartScore).toBeCloseTo(60, 0);
    expect(d.level).toBe('growing');
    expect(d.hospitalId).toBe('h1');
    expect(d.asOf).toBe('NOW');
  });

  it('计数饱和截顶：超过目标记 100 分', () => {
    const d = buildSmartAssetDashboard(
      'h1',
      baseInput({
        doctorExperience: 99999,
        diseaseKnowledge: 9999,
        diagnosisModels: 999,
        structuredAssets: 99999,
      }),
      'NOW',
    );
    const exp = d.dimensions.find((x) => x.key === 'experience');
    expect(exp?.subs.find((s) => s.key === 'doctorExperience')?.score).toBe(100);
    expect(exp?.score).toBeCloseTo((100 + 60 + 60) / 3, 0);
  });

  it('冷启动（全零）总分 = 0、段位起步、demo 标记置位', () => {
    const d = buildSmartAssetDashboard('h1', {}, 'NOW');
    expect(d.smartScore).toBe(0);
    expect(d.level).toBe('starter');
    expect(d.demo).toBe(true);
    expect(d.totalAssets).toBe(0);
  });

  it('任一资产计数 > 0 即退出 demo', () => {
    const d = buildSmartAssetDashboard('h1', baseInput(), 'NOW');
    expect(d.demo).toBe(false);
  });

  it('弱项识别：维度得分 < 60 标记 isWeak', () => {
    const d = buildSmartAssetDashboard(
      'h1',
      baseInput({ doctorExperience: 600, nurseExperience: 400, pharmacistExperience: 160 }),
      'NOW',
    );
    // 经验三维均 = 20% → 维度得分 20 < 60
    const exp = d.dimensions.find((x) => x.key === 'experience');
    expect(exp?.score).toBeCloseTo(20, 0);
    expect(exp?.isWeak).toBe(true);
    expect(WEAK_SCORE_THRESHOLD).toBe(60);
  });

  it('子项明细含当前/目标/得分/缺口', () => {
    const d = buildSmartAssetDashboard('h1', baseInput(), 'NOW');
    const doc = d.dimensions
      .find((x) => x.key === 'experience')
      ?.subs.find((s) => s.key === 'doctorExperience');
    expect(doc?.count).toBe(1800);
    expect(doc?.target).toBe(SUB_TARGETS.doctorExperience);
    expect(doc?.score).toBeCloseTo(60, 0);
    expect(doc?.gap).toBe(1200);
  });
});

describe('identifyAssetGap 缺口识别', () => {
  it('基准快照：全部 11 子项均有缺口，按 shortfall 降序', () => {
    const gaps = identifyAssetGap(baseInput());
    expect(gaps.length).toBe(11);
    // 最大缺口 = 结构化数据 8000-4800 = 3200
    expect(gaps[0].subKey).toBe('structuredAssets');
    expect(gaps[0].shortfall).toBe(3200);
    // 排序单调不增
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i - 1].shortfall).toBeGreaterThanOrEqual(gaps[i].shortfall);
    }
  });

  it('严重度分级：得分 <40 high / <60 medium / 其余 low', () => {
    const gaps = identifyAssetGap(baseInput({ doctorExperience: 600 })); // 600/3000=20 → high
    const doc = gaps.find((g) => g.subKey === 'doctorExperience');
    expect(doc?.severity).toBe('high');
    expect(doc?.suggestion).toContain('高优先');
    // 其余子项 = 60 分 → low
    expect(gaps.find((g) => g.subKey === 'diseaseKnowledge')?.severity).toBe('low');
  });

  it('全部达饱和目标时返回空缺口数组', () => {
    const full: SmartAssetInput = {
      doctorExperience: 99999,
      nurseExperience: 99999,
      pharmacistExperience: 99999,
      diseaseKnowledge: 9999,
      drugKnowledge: 99999,
      guidelineKnowledge: 9999,
      diagnosisModels: 999,
      predictionModels: 999,
      recommendationModels: 999,
      structuredAssets: 999999,
      unstructuredAssets: 999999,
    };
    expect(identifyAssetGap(full)).toEqual([]);
  });

  it('空输入不抛错，返回 11 个缺口', () => {
    const gaps = identifyAssetGap({});
    expect(gaps.length).toBe(11);
    // 全零时每个子项 score=0 → severity=high
    expect(gaps.every((g) => g.severity === 'high')).toBe(true);
  });
});

describe('benchmarkAssetLevel 段位对标', () => {
  it('>=85 卓越 / >=70 成熟 / >=50 成长 / <50 起步', () => {
    expect(benchmarkAssetLevel(90).level).toBe('outstanding');
    expect(benchmarkAssetLevel(75).level).toBe('mature');
    expect(benchmarkAssetLevel(55).level).toBe('growing');
    expect(benchmarkAssetLevel(30).level).toBe('starter');
  });

  it('给出距下一档差距与下一档名', () => {
    const b = benchmarkAssetLevel(60);
    expect(b.nextLevel).toBe('mature');
    expect(b.gapToNext).toBeCloseTo(10, 0); // 70-60
    expect(b.comment).toContain('成长');

    const top = benchmarkAssetLevel(95);
    expect(top.nextLevel).toBeNull();
    expect(top.gapToNext).toBe(0);
    expect(top.comment).toContain('第一梯队');
  });

  it('越界分数安全收敛', () => {
    expect(benchmarkAssetLevel(-10).score).toBe(0);
    expect(benchmarkAssetLevel(999).score).toBe(100);
    expect(benchmarkAssetLevel(NaN).level).toBe('starter');
  });
});

describe('calculateAssetGrowth 增长计算', () => {
  it('空快照返回合法空结构，不抛错', () => {
    const r = calculateAssetGrowth('h1', 'month', [], 'NOW');
    expect(r.series).toEqual([]);
    expect(r.delta).toEqual({ experience: 0, knowledge: 0, model: 0, data: 0, smartScore: 0 });
    expect(r.rising).toBe(false);
    expect(r.conclusion).toContain('暂无历史快照');
  });

  it('上行序列：delta / rising / 结论话术', () => {
    const snapshots: SmartAssetSnapshot[] = [
      { period: '2026-05', experience: 2600, knowledge: 1200, model: 52, data: 5200, smartScore: 48.5 },
      { period: '2026-06', experience: 3480, knowledge: 1680, model: 72, data: 7200, smartScore: 60.0 },
    ];
    const r = calculateAssetGrowth('h1', 'month', snapshots, 'NOW');
    expect(r.rising).toBe(true);
    expect(r.delta.experience).toBe(880);
    expect(r.delta.knowledge).toBe(480);
    expect(r.delta.model).toBe(20);
    expect(r.delta.data).toBe(2000);
    expect(r.delta.smartScore).toBeCloseTo(11.5, 0);
    expect(r.conclusion).toContain('持续累积');
  });

  it('增长率：首点 > 0 时按比例折算百分数', () => {
    const snapshots: SmartAssetSnapshot[] = [
      { period: '2026-01', experience: 2000, knowledge: 1000, model: 50, data: 5000, smartScore: 50 },
      { period: '2026-02', experience: 2400, knowledge: 1300, model: 60, data: 6000, smartScore: 60 },
    ];
    const r = calculateAssetGrowth('h1', 'month', snapshots, 'NOW');
    expect(r.growthRate.experience).toBe(20); // 400/2000
    expect(r.growthRate.knowledge).toBe(30); // 300/1000
    expect(r.growthRate.model).toBe(20); // 10/50
    expect(r.growthRate.data).toBe(20); // 1000/5000
    expect(r.growthRate.smartScore).toBe(20); // 10/50
  });

  it('首点为 0 时增长率安全回落 0，不除零', () => {
    const snapshots: SmartAssetSnapshot[] = [
      { period: '2026-01', experience: 0, knowledge: 0, model: 0, data: 0, smartScore: 0 },
      { period: '2026-02', experience: 100, knowledge: 50, model: 5, data: 200, smartScore: 40 },
    ];
    const r = calculateAssetGrowth('h1', 'month', snapshots, 'NOW');
    expect(r.growthRate.experience).toBe(0);
    expect(r.growthRate.knowledge).toBe(0);
    expect(r.growthRate.smartScore).toBe(0);
    expect(r.rising).toBe(true);
  });

  it('下行序列：rising=false 且结论给改进建议', () => {
    const snapshots: SmartAssetSnapshot[] = [
      { period: '2026-05', experience: 3480, knowledge: 1680, model: 72, data: 7200, smartScore: 60 },
      { period: '2026-06', experience: 3300, knowledge: 1600, model: 70, data: 7000, smartScore: 55 },
    ];
    const r = calculateAssetGrowth('h1', 'month', snapshots, 'NOW');
    expect(r.rising).toBe(false);
    expect(r.delta.smartScore).toBeCloseTo(-5, 0);
    expect(r.conclusion).toContain('建议');
  });

  it('series 按 period 字典序升序（YYYY-MM 即时间序）', () => {
    const snapshots: SmartAssetSnapshot[] = [
      { period: '2026-07', experience: 3500, knowledge: 1700, model: 73, data: 7300, smartScore: 61 },
      { period: '2026-05', experience: 2600, knowledge: 1200, model: 52, data: 5200, smartScore: 48 },
      { period: '2026-06', experience: 3000, knowledge: 1450, model: 62, data: 6200, smartScore: 54 },
    ];
    const r = calculateAssetGrowth('h1', 'month', snapshots, 'NOW');
    expect(r.series.map((p) => p.period)).toEqual(['2026-05', '2026-06', '2026-07']);
  });
});

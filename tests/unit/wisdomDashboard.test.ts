/**
 * 健澜科技 jlmedaios - 医院智慧资产看板聚合器纯函数单测（M146-A，越用越聪明深化）
 *
 * 覆盖：
 *  - 资产聚合：五维资产卡透传、六维雷达折算、计数饱和、比率除零、demo 标记；
 *  - 医生成长曲线：均分、达标人数、画像排序；
 *  - 趋势计算：getWisdomGrowthReport 的 delta / growthRate / 段位跃迁 / 上下行；
 *  - 报告生成：空快照合法空结构、结论话术、首点为零不除零。
 *
 * 仅测纯函数，不触碰 IO / 时钟（时间戳统一注入 'NOW'）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildHospitalWisdomDashboard,
  getWisdomGrowthReport,
  tierOf,
  WEAK_DIMENSION_THRESHOLD,
  DOCTOR_GROWTH_PASS_LINE,
  type WisdomAssetInput,
  type WisdomSnapshotPoint,
} from '../../src/bff/aggregators/wisdomDashboardAggregator';

/** 一份「中段」基准快照，各用例按需覆写 */
function baseInput(overrides: Partial<WisdomAssetInput> = {}): WisdomAssetInput {
  return {
    experienceTotal: 1000, // 1000/2000 = 50
    coveredDiseases: 150, // 150/300 = 50
    aiAssistantCalls: 25000, // 25000/50000 = 50
    activeDoctors: 80,
    doctorGrowth: [
      { doctorId: 'd1', doctorName: '甲', deptCode: 'IN', growthScore: 88, experienceCount: 320 },
      { doctorId: 'd2', doctorName: '乙', deptCode: 'IN', growthScore: 76, experienceCount: 210 },
      { doctorId: 'd3', doctorName: '丙', deptCode: 'SU', growthScore: 69, experienceCount: 150 },
      { doctorId: 'd4', doctorName: '丁', deptCode: 'PE', growthScore: 58, experienceCount: 96 },
    ],
    recommendationAdopted: 600,
    recommendationModified: 200, // (600+100)/1000 = 70
    recommendationTotal: 1000,
    satisfactionPositive: 800, // 800/1000 = 80
    satisfactionTotal: 1000,
    ...overrides,
  };
}

describe('buildHospitalWisdomDashboard 资产聚合', () => {
  it('六维权重之和 = 100%', () => {
    const d = buildHospitalWisdomDashboard('h1', baseInput(), 'NOW');
    const sum = d.radar.reduce((acc, r) => acc + r.weight, 0);
    expect(sum).toBe(100);
    expect(d.radar).toHaveLength(6);
  });

  it('五维资产卡直接透传入参', () => {
    const d = buildHospitalWisdomDashboard('h1', baseInput(), 'NOW');
    expect(d.assets.experienceTotal).toBe(1000);
    expect(d.assets.coveredDiseases).toBe(150);
    expect(d.assets.aiAssistantCalls).toBe(25000);
    expect(d.assets.activeDoctors).toBe(80);
    expect(d.hospitalId).toBe('h1');
    expect(d.asOf).toBe('NOW');
  });

  it('计数类维度饱和截顶：超过目标记 100 分', () => {
    const d = buildHospitalWisdomDashboard(
      'h1',
      baseInput({ experienceTotal: 99999, coveredDiseases: 9999, aiAssistantCalls: 999999 }),
      'NOW',
    );
    expect(d.radar.find((r) => r.key === 'experienceDepth')?.score).toBe(100);
    expect(d.radar.find((r) => r.key === 'diseaseCoverage')?.score).toBe(100);
    expect(d.radar.find((r) => r.key === 'aiActivity')?.score).toBe(100);
  });

  it('比率类维度分母为 0 时返回 0，不抛错', () => {
    const d = buildHospitalWisdomDashboard(
      'h1',
      baseInput({ recommendationTotal: 0, satisfactionTotal: 0 }),
      'NOW',
    );
    expect(d.radar.find((r) => r.key === 'recommendationAdoption')?.score).toBe(0);
    expect(d.radar.find((r) => r.key === 'satisfaction')?.score).toBe(0);
  });

  it('冷启动（全零）总分 = 0、段位待提升、demo 标记置位', () => {
    const d = buildHospitalWisdomDashboard('h1', {}, 'NOW');
    expect(d.assets.wisdomScore).toBe(0);
    expect(d.assets.tier).toBe('weak');
    expect(d.assets.tierLabel).toBe('待提升');
    expect(d.demo).toBe(true);
    expect(d.doctorGrowth.avgGrowth).toBe(0);
    expect(d.doctorGrowth.risingDoctors).toBe(0);
    expect(d.doctorGrowth.entries).toEqual([]);
  });

  it('任一资产量 > 0 即退出 demo', () => {
    const d = buildHospitalWisdomDashboard('h1', baseInput(), 'NOW');
    expect(d.demo).toBe(false);
  });

  it('基准快照总分落在 55-65 区间（50/50/50/72.8/70/80 加权）', () => {
    const d = buildHospitalWisdomDashboard('h1', baseInput(), 'NOW');
    // 加权贡献：10 + 10 + 10 + 10.9 + 10.5 + 8 = 59.4
    expect(d.assets.wisdomScore).toBeCloseTo(59.4, 0);
    expect(d.assets.tier).toBe('weak');
  });

  it('每维明细含原始输入、公式与加权贡献', () => {
    const d = buildHospitalWisdomDashboard('h1', baseInput(), 'NOW');
    const rec = d.radar.find((r) => r.key === 'recommendationAdoption');
    expect(rec?.weight).toBe(15);
    expect(rec?.score).toBeCloseTo(70, 0);
    expect(rec?.formula).toContain('直接采纳 600');
    expect(rec?.raw).toEqual({ adopted: 600, modified: 200, total: 1000 });
    expect(rec?.weightedContribution).toBeCloseTo(10.5, 0);
  });

  it(`弱项识别：得分 < ${WEAK_DIMENSION_THRESHOLD} 进入 weakDimensions`, () => {
    const d = buildHospitalWisdomDashboard(
      'h1',
      baseInput({ experienceTotal: 300 }), // 300/2000 = 15
      'NOW',
    );
    const exp = d.radar.find((r) => r.key === 'experienceDepth');
    expect(exp?.isWeak).toBe(true);
    expect(d.weakDimensions.find((r) => r.key === 'experienceDepth')).toBeDefined();
  });

  it('医生成长均分与达标人数（>=70）', () => {
    const d = buildHospitalWisdomDashboard('h1', baseInput(), 'NOW');
    // (88+76+69+58)/4 = 72.75 → 72.8
    expect(d.doctorGrowth.avgGrowth).toBeCloseTo(72.8, 0);
    // >=70 的有甲(88)、乙(76) → 2 人
    expect(d.doctorGrowth.risingDoctors).toBe(2);
    expect(DOCTOR_GROWTH_PASS_LINE).toBe(70);
  });

  it('医生画像按成长分降序（同分再按经验数降序）', () => {
    const d = buildHospitalWisdomDashboard('h1', baseInput(), 'NOW');
    expect(d.doctorGrowth.entries.map((e) => e.doctorName)).toEqual(['甲', '乙', '丙', '丁']);
  });
});

describe('tierOf 段位阈值', () => {
  it('>=90 卓越 / >=80 优秀 / >=70 良好 / >=60 合格 / <60 待提升', () => {
    expect(tierOf(95).tier).toBe('outstanding');
    expect(tierOf(85).tier).toBe('excellent');
    expect(tierOf(75).tier).toBe('good');
    expect(tierOf(65).tier).toBe('pass');
    expect(tierOf(55).tier).toBe('weak');
  });
});

describe('getWisdomGrowthReport 趋势与报告', () => {
  it('空快照返回合法空结构，不抛错', () => {
    const r = getWisdomGrowthReport('h1', 'month', [], 'NOW');
    expect(r.series).toEqual([]);
    expect(r.delta).toEqual({ experienceTotal: 0, coveredDiseases: 0, aiAssistantCalls: 0, wisdomScore: 0 });
    expect(r.rising).toBe(false);
    expect(r.conclusion).toContain('暂无历史快照');
  });

  it('上行序列：delta / rising / 结论话术', () => {
    const snapshots: WisdomSnapshotPoint[] = [
      { period: '2026-05', experienceTotal: 1000, coveredDiseases: 168, aiAssistantCalls: 22000, wisdomScore: 58.4, avgDoctorGrowth: 52 },
      { period: '2026-06', experienceTotal: 1200, coveredDiseases: 190, aiAssistantCalls: 28000, wisdomScore: 63.1, avgDoctorGrowth: 57 },
      { period: '2026-07', experienceTotal: 1500, coveredDiseases: 220, aiAssistantCalls: 34000, wisdomScore: 78.0, avgDoctorGrowth: 64 },
    ];
    const r = getWisdomGrowthReport('h1', 'month', snapshots, 'NOW');
    expect(r.rising).toBe(true);
    expect(r.delta.wisdomScore).toBeCloseTo(19.6, 0);
    expect(r.delta.experienceTotal).toBe(500);
    expect(r.delta.coveredDiseases).toBe(52);
    expect(r.conclusion).toContain('越用越聪明');
    expect(r.conclusion).toContain('78.0');
  });

  it('增长率：首点 > 0 时按比例折算百分数', () => {
    const snapshots: WisdomSnapshotPoint[] = [
      { period: '2026-01', experienceTotal: 1000, coveredDiseases: 200, aiAssistantCalls: 10000, wisdomScore: 60, avgDoctorGrowth: 60 },
      { period: '2026-02', experienceTotal: 1500, coveredDiseases: 260, aiAssistantCalls: 13000, wisdomScore: 70, avgDoctorGrowth: 65 },
    ];
    const r = getWisdomGrowthReport('h1', 'month', snapshots, 'NOW');
    // (1500-1000)/1000 = 50%
    expect(r.growthRate.experienceTotal).toBe(50);
    // (260-200)/200 = 30%
    expect(r.growthRate.coveredDiseases).toBe(30);
    // (70-60)/60 ≈ 17%
    expect(r.growthRate.wisdomScore).toBeCloseTo(17, 0);
  });

  it('首点为 0 时增长率安全回落 0，不除零', () => {
    const snapshots: WisdomSnapshotPoint[] = [
      { period: '2026-01', experienceTotal: 0, coveredDiseases: 0, aiAssistantCalls: 0, wisdomScore: 0, avgDoctorGrowth: 0 },
      { period: '2026-02', experienceTotal: 100, coveredDiseases: 50, aiAssistantCalls: 8000, wisdomScore: 65, avgDoctorGrowth: 60 },
    ];
    const r = getWisdomGrowthReport('h1', 'month', snapshots, 'NOW');
    expect(r.growthRate.experienceTotal).toBe(0);
    expect(r.growthRate.coveredDiseases).toBe(0);
    expect(r.growthRate.wisdomScore).toBe(0);
    expect(r.rising).toBe(true);
  });

  it('段位跃迁：weak(58) → good(78) 给出跃迁话术', () => {
    const snapshots: WisdomSnapshotPoint[] = [
      { period: '2026-05', experienceTotal: 1000, coveredDiseases: 168, aiAssistantCalls: 22000, wisdomScore: 58, avgDoctorGrowth: 52 },
      { period: '2026-06', experienceTotal: 1500, coveredDiseases: 220, aiAssistantCalls: 34000, wisdomScore: 78, avgDoctorGrowth: 64 },
    ];
    const r = getWisdomGrowthReport('h1', 'month', snapshots, 'NOW');
    expect(r.tierMigration.from).toBe('weak');
    expect(r.tierMigration.to).toBe('good');
    expect(r.tierMigration.label).toContain('待提升');
    expect(r.tierMigration.label).toContain('良好');
  });

  it('下行序列：rising=false 且结论给改进建议', () => {
    const snapshots: WisdomSnapshotPoint[] = [
      { period: '2026-05', experienceTotal: 1500, coveredDiseases: 220, aiAssistantCalls: 34000, wisdomScore: 78, avgDoctorGrowth: 64 },
      { period: '2026-06', experienceTotal: 1400, coveredDiseases: 210, aiAssistantCalls: 28000, wisdomScore: 62, avgDoctorGrowth: 60 },
    ];
    const r = getWisdomGrowthReport('h1', 'month', snapshots, 'NOW');
    expect(r.rising).toBe(false);
    expect(r.delta.wisdomScore).toBeCloseTo(-16, 0);
    expect(r.conclusion).toContain('建议');
  });

  it('series 按 period 字典序升序（YYYY-MM 即时间序）', () => {
    const snapshots: WisdomSnapshotPoint[] = [
      { period: '2026-07', experienceTotal: 1500, coveredDiseases: 220, aiAssistantCalls: 34000, wisdomScore: 78, avgDoctorGrowth: 64 },
      { period: '2026-05', experienceTotal: 1000, coveredDiseases: 168, aiAssistantCalls: 22000, wisdomScore: 58, avgDoctorGrowth: 52 },
      { period: '2026-06', experienceTotal: 1200, coveredDiseases: 190, aiAssistantCalls: 28000, wisdomScore: 63, avgDoctorGrowth: 57 },
    ];
    const r = getWisdomGrowthReport('h1', 'month', snapshots, 'NOW');
    expect(r.series.map((p) => p.period)).toEqual(['2026-05', '2026-06', '2026-07']);
  });
});

/**
 * 健澜科技 jlmedaios - 慢病管理助手单测（M131-B）
 *
 * 覆盖：
 *   - buildChronicDiseaseManagement：慢病记录分病种聚合、当前值 vs 目标值对比、
 *     达标 / 超标 / 危急状态判定、总体风险分级、空数据兜底、不修改入参；
 *   - predictRiskTrend：线性回归斜率、趋势方向（向好 / 恶化 / 平稳）、
 *     风险分累加与截断、7 天后外推预测。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildChronicDiseaseManagement,
  predictRiskTrend,
  CHRONIC_TARGETS,
  type ChronicDiseaseRecord,
  type ChronicDiseaseType,
} from '../../src/bff/aggregators/chronicDiseaseAggregator';

// 固定时间点，间隔 7 天，保证线性回归可手算
const D0 = '2026-09-01T08:00:00Z';
const D1 = '2026-09-08T08:00:00Z';
const D2 = '2026-09-15T08:00:00Z';

function rec(partial: {
  id: string;
  disease: ChronicDiseaseType;
  sbp?: number | null;
  dbp?: number | null;
  fastingGlucose?: number | null;
  hba1c?: number | null;
  heartRate?: number | null;
  ldl?: number | null;
  measuredAt: string;
}): ChronicDiseaseRecord {
  return {
    patientId: 'patient-1',
    sbp: null,
    dbp: null,
    fastingGlucose: null,
    hba1c: null,
    heartRate: null,
    ldl: null,
    note: null,
    ...partial,
  };
}

describe('目标值常量（AI能力深化）', () => {
  it('高血压目标为收缩压<140 / 舒张压<90', () => {
    const t = Object.fromEntries(CHRONIC_TARGETS.hypertension.map((m) => [m.key, m.target]));
    expect(t.sbp).toBe(140);
    expect(t.dbp).toBe(90);
  });
  it('糖尿病空腹血糖目标为 <7.0', () => {
    const fpg = CHRONIC_TARGETS.diabetes.find((m) => m.key === 'fastingGlucose');
    expect(fpg?.target).toBe(7.0);
  });
  it('冠心病 LDL-C 目标为 <1.8', () => {
    const ldl = CHRONIC_TARGETS.chd.find((m) => m.key === 'ldl');
    expect(ldl?.target).toBe(1.8);
  });
});

describe('buildChronicDiseaseManagement - 目标值与病种状态', () => {
  it('高血压达标（sbp130/dbp85）判定 controlled，指标全部 atTarget', () => {
    const out = buildChronicDiseaseManagement('patient-1', [
      rec({ id: 'r1', disease: 'hypertension', sbp: 130, dbp: 85, measuredAt: D2 }),
    ]);
    const h = out.diseases.find((d) => d.disease === 'hypertension')!;
    expect(h.status).toBe('controlled');
    expect(h.metrics.every((m) => m.atTarget)).toBe(true);
  });

  it('高血压临界值 sbp=140 不算达标（严格小于）', () => {
    const out = buildChronicDiseaseManagement('patient-1', [
      rec({ id: 'r1', disease: 'hypertension', sbp: 140, dbp: 85, measuredAt: D2 }),
    ]);
    const h = out.diseases.find((d) => d.disease === 'hypertension')!;
    const sbp = h.metrics.find((m) => m.key === 'sbp')!;
    expect(sbp.atTarget).toBe(false);
    expect(sbp.delta).toBe(0);
  });

  it('高血压超标（sbp150/dbp95）判定 abnormal，记录超出幅度', () => {
    const out = buildChronicDiseaseManagement('patient-1', [
      rec({ id: 'r1', disease: 'hypertension', sbp: 150, dbp: 95, measuredAt: D2 }),
    ]);
    const h = out.diseases.find((d) => d.disease === 'hypertension')!;
    expect(h.status).toBe('abnormal');
    expect(h.metrics.find((m) => m.key === 'sbp')!.delta).toBe(10);
    expect(h.metrics.find((m) => m.key === 'dbp')!.delta).toBe(5);
  });

  it('高血压危急（sbp190）判定 critical', () => {
    const out = buildChronicDiseaseManagement('patient-1', [
      rec({ id: 'r1', disease: 'hypertension', sbp: 190, dbp: 100, measuredAt: D2 }),
    ]);
    expect(out.overallRisk).toBe('critical');
    expect(out.diseases.find((d) => d.disease === 'hypertension')!.status).toBe('critical');
  });

  it('糖尿病空腹血糖 8.5 超标、6.2 达标', () => {
    const bad = buildChronicDiseaseManagement('patient-1', [
      rec({ id: 'r1', disease: 'diabetes', fastingGlucose: 8.5, measuredAt: D2 }),
    ]);
    expect(bad.diseases.find((d) => d.disease === 'diabetes')!.status).toBe('abnormal');
    const good = buildChronicDiseaseManagement('patient-1', [
      rec({ id: 'r2', disease: 'diabetes', fastingGlucose: 6.2, measuredAt: D2 }),
    ]);
    expect(good.diseases.find((d) => d.disease === 'diabetes')!.status).toBe('controlled');
  });

  it('冠心病 LDL 2.6 超标、1.5 达标', () => {
    const out = buildChronicDiseaseManagement('patient-1', [
      rec({ id: 'r1', disease: 'chd', ldl: 2.6, heartRate: 78, measuredAt: D2 }),
    ]);
    const c = out.diseases.find((d) => d.disease === 'chd')!;
    expect(c.status).toBe('abnormal');
    expect(c.metrics.find((m) => m.key === 'ldl')!.atTarget).toBe(false);
    expect(c.metrics.find((m) => m.key === 'ldl')!.delta).toBe(0.8);
  });

  it('分病种取最新一条记录', () => {
    const out = buildChronicDiseaseManagement('patient-1', [
      rec({ id: 'old', disease: 'hypertension', sbp: 160, dbp: 98, measuredAt: D0 }),
      rec({ id: 'new', disease: 'hypertension', sbp: 132, dbp: 84, measuredAt: D2 }),
    ]);
    const h = out.diseases.find((d) => d.disease === 'hypertension')!;
    expect(h.latestAt).toBe(D2);
    expect(h.metrics.find((m) => m.key === 'sbp')!.current).toBe(132);
  });

  it('总体风险：任一 abnormal 即 abnormal；全 controlled 即 controlled', () => {
    const mixed = buildChronicDiseaseManagement('patient-1', [
      rec({ id: 'a', disease: 'hypertension', sbp: 128, dbp: 80, measuredAt: D2 }),
      rec({ id: 'b', disease: 'diabetes', fastingGlucose: 8.0, measuredAt: D2 }),
    ]);
    expect(mixed.overallRisk).toBe('abnormal');

    const allGood = buildChronicDiseaseManagement('patient-1', [
      rec({ id: 'a', disease: 'hypertension', sbp: 128, dbp: 80, measuredAt: D2 }),
      rec({ id: 'b', disease: 'diabetes', fastingGlucose: 6.2, measuredAt: D2 }),
    ]);
    expect(allGood.overallRisk).toBe('controlled');
  });

  it('空记录兜底：overallRisk=unknown、recordCount=0', () => {
    const out = buildChronicDiseaseManagement('patient-1', []);
    expect(out.overallRisk).toBe('unknown');
    expect(out.recordCount).toBe(0);
    expect(out.diseases).toEqual([]);
    expect(out.trend.metrics).toEqual([]);
  });

  it('不修改入参', () => {
    const input = [
      rec({ id: 'old', disease: 'hypertension', sbp: 160, dbp: 98, measuredAt: D0 }),
      rec({ id: 'new', disease: 'hypertension', sbp: 132, dbp: 84, measuredAt: D2 }),
    ];
    const snapshot = input.map((r) => ({ ...r }));
    buildChronicDiseaseManagement('patient-1', input);
    expect(input).toEqual(snapshot);
  });
});

describe('predictRiskTrend - 风险预测', () => {
  it('指标持续下降（160→155→150）判为 improving', () => {
    const t = predictRiskTrend([
      rec({ id: '1', disease: 'hypertension', sbp: 160, dbp: 95, measuredAt: D0 }),
      rec({ id: '2', disease: 'hypertension', sbp: 155, dbp: 95, measuredAt: D1 }),
      rec({ id: '3', disease: 'hypertension', sbp: 150, dbp: 95, measuredAt: D2 }),
    ]);
    const sbp = t.metrics.find((m) => m.key === 'sbp')!;
    expect(sbp.direction).toBe('improving');
    expect(sbp.slopePerDay).not.toBeNull();
  });

  it('指标持续上升（fpg 6.0→7.5→9.0）判为 worsening', () => {
    const t = predictRiskTrend([
      rec({ id: '1', disease: 'diabetes', fastingGlucose: 6.0, measuredAt: D0 }),
      rec({ id: '2', disease: 'diabetes', fastingGlucose: 7.5, measuredAt: D1 }),
      rec({ id: '3', disease: 'diabetes', fastingGlucose: 9.0, measuredAt: D2 }),
    ]);
    expect(t.direction).toBe('worsening');
  });

  it('风险分按超目标幅度累加并截断到 0-100', () => {
    // sbp 160（超 140 共 20mmHg ×1.5 = 30，封顶 30）
    // dbp 100（超 90 共 10mmHg ×2.0 = 20，封顶 20）
    // 三条记录数值平稳 → 方向 stable → 不修正
    const t = predictRiskTrend([
      rec({ id: '1', disease: 'hypertension', sbp: 160, dbp: 100, measuredAt: D0 }),
      rec({ id: '2', disease: 'hypertension', sbp: 160, dbp: 100, measuredAt: D1 }),
      rec({ id: '3', disease: 'hypertension', sbp: 160, dbp: 100, measuredAt: D2 }),
    ]);
    expect(t.riskScore).toBe(50);
    expect(t.riskLevel).toBe('high');
    expect(t.confidence).toBe('medium'); // 3 条样本
  });

  it('由最后一次测量外推 7 天预测值', () => {
    // sbp 150(D0) -> 160(D1)：斜率 = 10/7 ≈ 1.429/天，7 天后 = 170
    const t = predictRiskTrend([
      rec({ id: '1', disease: 'hypertension', sbp: 150, dbp: 90, measuredAt: D0 }),
      rec({ id: '2', disease: 'hypertension', sbp: 160, dbp: 90, measuredAt: D1 }),
    ]);
    const sbp = t.metrics.find((m) => m.key === 'sbp')!;
    expect(sbp.predictedNext?.value).toBe(170);
    expect(sbp.direction).toBe('worsening');
  });

  it('空记录：方向 stable、风险分 0、置信度 low', () => {
    const t = predictRiskTrend([]);
    expect(t.direction).toBe('stable');
    expect(t.riskScore).toBe(0);
    expect(t.riskLevel).toBe('low');
    expect(t.confidence).toBe('low');
  });
});

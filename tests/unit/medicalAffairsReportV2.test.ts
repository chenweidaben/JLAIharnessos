/**
 * 健澜科技 jlmedaios - 医务 V2 纯函数单测（M212-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessCoreSystemCompliance,
  buildMedicalAffairsReportV2,
  trackMedicalDispute,
  type CoreSystemRecord,
  type MedicalDispute,
} from '../../src/bff/aggregators/medicalAffairsReportV2Aggregator';

describe('assessCoreSystemCompliance', () => {
  it('全达标 → 100% 优秀', () => {
    const records: CoreSystemRecord[] = [
      { threeLevelRound: true, difficultCaseDiscussion: true, deathCaseDiscussion: true },
    ];
    const r = assessCoreSystemCompliance(records);
    expect(r.complianceRate).toBe(1);
    expect(r.level).toBe('优秀');
  });

  it('缺一项 → 67% 不达标', () => {
    const records: CoreSystemRecord[] = [
      { threeLevelRound: true, difficultCaseDiscussion: true, deathCaseDiscussion: false },
    ];
    const r = assessCoreSystemCompliance(records);
    expect(r.level).toBe('不达标');
  });
});

describe('trackMedicalDispute', () => {
  it('2 起纠纷 赔偿 50 万 → count 2 total 50', () => {
    const disputes: MedicalDispute[] = [
      { type: '手术', amount: 30 },
      { type: '用药', amount: 20 },
    ];
    const r = trackMedicalDispute(disputes);
    expect(r.count).toBe(2);
    expect(r.totalCompensation).toBe(50);
  });
});

describe('buildMedicalAffairsReportV2', () => {
  it('生成质量数据', () => {
    const r = buildMedicalAffairsReportV2('30d');
    expect(r.quality.coreSystems).toBeGreaterThan(0);
  });

  it('生成安全数据', () => {
    const r = buildMedicalAffairsReportV2('30d');
    expect(r.safety.disputes).toBeGreaterThanOrEqual(0);
  });

  it('生成医师数据', () => {
    const r = buildMedicalAffairsReportV2('30d');
    expect(r.physician.certified).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildMedicalAffairsReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

/**
 * 健澜科技 jlmedaios - 安宁疗护纯函数单测（M220-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessPain,
  buildHospiceCarePlan,
  buildHospiceReport,
} from '../../src/bff/aggregators/hospiceReportAggregator';

describe('assessPain', () => {
  it('评分8 → 重度疼痛', () => {
    expect(assessPain(8, 'NRS').level).toBe('重度');
  });

  it('评分5 → 中度疼痛', () => {
    expect(assessPain(5, 'NRS').level).toBe('中度');
  });

  it('评分2 → 轻度 已控制', () => {
    const r = assessPain(2, 'NRS');
    expect(r.level).toBe('轻度');
    expect(r.controlled).toBe(true);
  });
});

describe('buildHospiceCarePlan', () => {
  it('1患者 1家属 → 5团队4服务', () => {
    const r = buildHospiceCarePlan(1, 1);
    expect(r.team.length).toBe(5);
    expect(r.services.length).toBe(4);
  });
});

describe('buildHospiceReport', () => {
  it('生成症状数据', () => {
    const r = buildHospiceReport('30d');
    expect(r.symptom.pain).toBeGreaterThan(0);
  });

  it('生成伦理数据', () => {
    const r = buildHospiceReport('30d');
    expect(r.ethics.dnr).toBeGreaterThan(0);
  });

  it('生成床位数据', () => {
    const r = buildHospiceReport('30d');
    expect(r.ward.beds).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildHospiceReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

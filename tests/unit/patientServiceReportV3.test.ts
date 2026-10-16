/**
 * 健澜科技 jlmedaios - 患者服务 V3 纯函数单测（M206-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPatientServiceReportV3,
  calculateNPS,
  classifyComplaintType,
  type ComplaintData,
} from '../../src/bff/aggregators/patientServiceReportV3Aggregator';

describe('calculateNPS', () => {
  it('推荐 600 贬损 100 总 1000 → NPS 50', () => {
    expect(calculateNPS(600, 100, 1000)).toBe(50);
  });

  it('总数为 0 → 0', () => {
    expect(calculateNPS(0, 0, 0)).toBe(0);
  });
});

describe('classifyComplaintType', () => {
  it('医疗安全类 → 高优先级', () => {
    const c: ComplaintData = { channel: '热线', category: '医疗质量' };
    const r = classifyComplaintType(c);
    expect(r.priority).toBe('高');
  });

  it('服务态度类 → 中优先级', () => {
    const c: ComplaintData = { channel: '热线', category: '服务态度' };
    const r = classifyComplaintType(c);
    expect(r.priority).toBe('中');
  });
});

describe('buildPatientServiceReportV3', () => {
  it('生成预约数据', () => {
    const r = buildPatientServiceReportV3('30d');
    expect(r.appointment.outpatient).toBeGreaterThan(0);
  });

  it('生成投诉数据', () => {
    const r = buildPatientServiceReportV3('30d');
    expect(r.complaint.total).toBeGreaterThanOrEqual(0);
  });

  it('生成随访数据', () => {
    const r = buildPatientServiceReportV3('30d');
    expect(r.followup.completed).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildPatientServiceReportV3('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

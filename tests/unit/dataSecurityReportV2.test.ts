/**
 * 健澜科技 jlmedaios - 数据安全 V2 纯函数单测（M217-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDataSecurityReportV2,
  classifyDataSensitivity,
  maskData,
} from '../../src/bff/aggregators/dataSecurityReportV2Aggregator';

describe('classifyDataSensitivity', () => {
  it('病历 → 核心', () => {
    expect(classifyDataSensitivity('患者病历')).toBe('核心');
  });

  it('身份证 → 敏感', () => {
    expect(classifyDataSensitivity('身份证号')).toBe('敏感');
  });

  it('公开 → 公开', () => {
    expect(classifyDataSensitivity('公开信息')).toBe('公开');
  });
});

describe('maskData', () => {
  it('手机号脱敏', () => {
    expect(maskData('13812345678', '手机号')).toBe('138****5678');
  });

  it('身份证脱敏', () => {
    expect(maskData('330106199001011234', '身份证')).toBe('330106********1234');
  });
});

describe('buildDataSecurityReportV2', () => {
  it('生成分类分级数据', () => {
    const r = buildDataSecurityReportV2('30d');
    expect(r.classification.core).toBeGreaterThan(0);
  });

  it('生成加密数据', () => {
    const r = buildDataSecurityReportV2('30d');
    expect(r.encryption.tls).toBe(true);
  });

  it('生成审计数据', () => {
    const r = buildDataSecurityReportV2('30d');
    expect(r.audit.logs).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildDataSecurityReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

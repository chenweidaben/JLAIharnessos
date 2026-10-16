/**
 * 健澜科技 jlmedaios - 数据安全纯函数单测（M198-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDataSecurityReport,
  classifyDataLevel,
  maskSensitiveData,
} from '../../src/bff/aggregators/dataSecurityAggregator';

describe('classifyDataLevel', () => {
  it('身份证 → core', () => {
    expect(classifyDataLevel('身份证号').level).toBe('core');
  });

  it('手机号 → sensitive', () => {
    expect(classifyDataLevel('手机号').level).toBe('sensitive');
  });

  it('公开信息 → public', () => {
    expect(classifyDataLevel('医院公告').level).toBe('public');
  });
});

describe('maskSensitiveData', () => {
  it('手机号脱敏', () => {
    expect(maskSensitiveData('13812345678', 'phone')).toBe('138****5678');
  });

  it('姓名脱敏', () => {
    expect(maskSensitiveData('张三丰', 'name')).toBe('张**丰');
  });
});

describe('buildDataSecurityReport', () => {
  it('生成分类分级数据', () => {
    const r = buildDataSecurityReport('30d');
    expect(r.classification.core).toBeGreaterThan(0);
  });

  it('生成加密数据', () => {
    const r = buildDataSecurityReport('30d');
    expect(r.encryption.tls).toBe(true);
  });

  it('生成脱敏数据', () => {
    const r = buildDataSecurityReport('30d');
    expect(r.masking.coverage).toBeGreaterThan(0.9);
  });

  it('生成建议', () => {
    const r = buildDataSecurityReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

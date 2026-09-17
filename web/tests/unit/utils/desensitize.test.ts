/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * desensitize 医疗数据脱敏测试
 */
import { describe, it, expect } from 'vitest';
import { maskName, maskIdCard, maskPhone, maskMedicalNo } from '@/utils/desensitize';

describe('maskName 姓名脱敏', () => {
  it('单字姓名原样返回', () => {
    expect(maskName('王')).toBe('王');
  });

  it('双字姓名保留首字', () => {
    expect(maskName('张三')).toBe('张*');
  });

  it('三字及以上姓名保留首尾', () => {
    expect(maskName('欧阳娜娜')).toBe('欧**娜');
    expect(maskName('张建国')).toBe('张*国');
  });

  it('空字符串返回空', () => {
    expect(maskName('')).toBe('');
  });
});

describe('maskIdCard 身份证脱敏', () => {
  it('18 位身份证保留首尾', () => {
    expect(maskIdCard('330102199003077754')).toBe('3****************4');
  });

  it('长度 <=2 时仅保留首字', () => {
    expect(maskIdCard('33')).toBe('3*');
    expect(maskIdCard('3')).toBe('3*');
  });

  it('空字符串返回空', () => {
    expect(maskIdCard('')).toBe('');
  });
});

describe('maskPhone 手机号脱敏', () => {
  it('11 位手机号中间四位打码', () => {
    expect(maskPhone('13812345678')).toBe('138****5678');
  });

  it('非 11 位原样返回', () => {
    expect(maskPhone('12345')).toBe('12345');
    expect(maskPhone('')).toBe('');
  });
});

describe('maskMedicalNo 病案号脱敏', () => {
  it('长度 >4 时保留后四位', () => {
    expect(maskMedicalNo('ZY20260916001')).toBe('*********6001');
  });

  it('长度 <=4 时全部打码', () => {
    expect(maskMedicalNo('1234')).toBe('****');
    expect(maskMedicalNo('AB')).toBe('**');
  });

  it('空字符串返回空', () => {
    expect(maskMedicalNo('')).toBe('');
  });
});

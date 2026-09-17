/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * validate 表单验证测试
 */
import { describe, it, expect } from 'vitest';
import { isPhone, isIdCard, isMedicalNo, required } from '@/utils/validate';

describe('isPhone', () => {
  it('合法手机号返回 true', () => {
    expect(isPhone('13812345678')).toBe(true);
    expect(isPhone('15998765432')).toBe(true);
    expect(isPhone('19900001111')).toBe(true);
  });

  it('非法手机号返回 false', () => {
    expect(isPhone('12812345678')).toBe(false); // 号段不合法
    expect(isPhone('1381234567')).toBe(false); // 长度不足
    expect(isPhone('138123456789')).toBe(false); // 长度超长
    expect(isPhone('23812345678')).toBe(false); // 非 1 开头
    expect(isPhone('')).toBe(false);
  });
});

describe('isIdCard', () => {
  it('合法身份证返回 true', () => {
    expect(isIdCard('330102199003077754')).toBe(true);
    expect(isIdCard('33010219900307775X')).toBe(true);
    expect(isIdCard('33010219900307775x')).toBe(true);
  });

  it('非法身份证返回 false', () => {
    expect(isIdCard('3301021990030777')).toBe(false); // 长度不足
    expect(isIdCard('3301021990030777541')).toBe(false); // 长度超长
    expect(isIdCard('3301021990030777XY')).toBe(false); // 含字母
    expect(isIdCard('')).toBe(false);
  });
});

describe('isMedicalNo', () => {
  it('合法病案号返回 true', () => {
    expect(isMedicalNo('ABC123456')).toBe(true);
    expect(isMedicalNo('123456')).toBe(true);
    expect(isMedicalNo('ZY20260916001')).toBe(true);
  });

  it('非法病案号返回 false', () => {
    expect(isMedicalNo('AB1')).toBe(false); // 长度不足
    expect(isMedicalNo('AB!@#$%^&*()')).toBe(false); // 含特殊字符
    expect(isMedicalNo('')).toBe(false);
  });
});

describe('required', () => {
  it('非空字符串返回 true', () => {
    expect(required('张三')).toBe(true);
  });

  it('空白字符串返回 false', () => {
    expect(required('   ')).toBe(false);
    expect(required('')).toBe(false);
  });

  it('null / undefined 返回 false', () => {
    expect(required(null)).toBe(false);
    expect(required(undefined)).toBe(false);
  });

  it('非空数组返回 true', () => {
    expect(required([1, 2, 3])).toBe(true);
  });

  it('空数组返回 false', () => {
    expect(required([])).toBe(false);
  });

  it('数字返回 true（0 也算有值）', () => {
    expect(required(0)).toBe(true);
    expect(required(42)).toBe(true);
  });
});

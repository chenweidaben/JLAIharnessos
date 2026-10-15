/**
 * 健澜科技 jlmedaios - BFF 脱敏函数单测
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { maskBody, maskIdCard, maskName, maskPhone } from '../../src/bff/utils/mask';

describe('maskName', () => {
  it('复姓/双字名仅保留首字', () => {
    expect(maskName('张三')).toBe('张*');
    expect(maskName('张三丰')).toBe('张*');
    expect(maskName('欧阳')).toBe('欧*');
  });
  it('单字/空值兜底', () => {
    expect(maskName('李')).toBe('李');
    expect(maskName('')).toBe('');
    expect(maskName(null)).toBe('');
    expect(maskName(undefined)).toBe('');
  });
});

describe('maskIdCard', () => {
  it('保留前3后4，中间8位*', () => {
    expect(maskIdCard('330106199001011234')).toBe('330********1234');
  });
  it('空值兜底', () => {
    expect(maskIdCard('')).toBe('');
    expect(maskIdCard(null)).toBe('');
  });
});

describe('maskPhone', () => {
  it('保留前3后4，中间4位*', () => {
    expect(maskPhone('13812345678')).toBe('138****5678');
  });
  it('空值兜底', () => {
    expect(maskPhone('')).toBe('');
    expect(maskPhone(null)).toBe('');
  });
});

describe('maskBody', () => {
  it('递归脱敏姓名/证件号/手机号字段', () => {
    const out = maskBody({
      realName: '张三',
      idCard: '330106199001011234',
      phone: '13812345678',
      dept: 'cardiology',
      nested: { patientName: '李四', note: 'ok' },
    });
    expect(out).toEqual({
      realName: '张*',
      idCard: '330********1234',
      phone: '138****5678',
      dept: 'cardiology',
      nested: { patientName: '李*', note: 'ok' },
    });
  });
  it('不修改原对象', () => {
    const input = { realName: '王五' };
    maskBody(input);
    expect(input.realName).toBe('王五');
  });
});

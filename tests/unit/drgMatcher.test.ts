/**
 * 健澜科技 jlmedaios - DRG 本地分组纯函数单测（M3-D）
 *
 * 不依赖数据库：验证主诊断前缀匹配、内/外科属性、最长前缀优先与兜底入组。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import { matchRule, type DrgRule } from '../../src/bff/aggregators/drgAggregator';

const rules: DrgRule[] = [
  {
    id: '1', groupCode: 'ES29', groupName: '内科-肺炎', mdc: 'J',
    dxPrefixes: ['J18', 'J15'], requiresOrp: false,
    weight: '0.8', avgPayment: '8000', enabled: true, sort: 10,
  },
  {
    id: '2', groupCode: 'FB29', groupName: '内科-心衰', mdc: 'F',
    dxPrefixes: ['I50'], requiresOrp: false,
    weight: '0.9', avgPayment: '9000', enabled: true, sort: 20,
  },
  {
    id: '3', groupCode: 'FC25', groupName: '内科-冠脉', mdc: 'F',
    dxPrefixes: ['I21', 'I21.4'], requiresOrp: false,
    weight: '1.2', avgPayment: '12000', enabled: true, sort: 30,
  },
  {
    id: '4', groupCode: 'GB25', groupName: '外科-胆囊', mdc: 'G',
    dxPrefixes: ['K80'], requiresOrp: true,
    weight: '1.5', avgPayment: '15000', enabled: true, sort: 40,
  },
  {
    id: '9', groupCode: 'UZ00', groupName: '未入组', mdc: 'Z',
    dxPrefixes: [], requiresOrp: false,
    weight: '1.0', avgPayment: '7000', enabled: true, sort: 999,
  },
];

describe('DRG 本地分组 matchRule', () => {
  it('内科主诊断命中内科组', () => {
    const r = matchRule(rules, 'I50.9', false);
    expect(r.rule.groupCode).toBe('FB29');
    expect(r.fallback).toBe(false);
    expect(r.matchedPrefix).toBe('I50');
  });

  it('外科病例即使诊断命中内科组也不匹配（内外科属性一致）', () => {
    const r = matchRule(rules, 'I50.9', true);
    expect(r.rule.groupCode).toBe('UZ00');
    expect(r.fallback).toBe(true);
  });

  it('胆囊外科诊断命中外科组', () => {
    const r = matchRule(rules, 'K80.2', true);
    expect(r.rule.groupCode).toBe('GB25');
    expect(r.matchedPrefix).toBe('K80');
  });

  it('最长前缀优先', () => {
    const r = matchRule(rules, 'I21.4', false);
    expect(r.rule.groupCode).toBe('FC25');
    expect(r.matchedPrefix).toBe('I21.4');
  });

  it('大小写不敏感', () => {
    const r = matchRule(rules, 'j18.0', false);
    expect(r.rule.groupCode).toBe('ES29');
  });

  it('无主诊断编码兜底入组', () => {
    const r = matchRule(rules, null, false);
    expect(r.rule.groupCode).toBe('UZ00');
  });

  it('未命中已知前缀兜底入组', () => {
    const r = matchRule(rules, 'E11.9', false);
    expect(r.rule.groupCode).toBe('UZ00');
  });
});

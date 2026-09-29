/**
 * 健澜科技 jlmedaios - 收费价表匹配纯函数单元测试（M3-B）
 *
 * 不依赖数据库：用合成价表验证 normalizeText / matchChargeItem / orderTypeToCategory。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  matchChargeItem,
  normalizeText,
  orderTypeToCategory,
} from '../../src/bff/aggregators/billingAggregator.js';
import type { ChargeItem } from '../../src/db/repositories/billingRepo.js';

function makeItem(
  code: string,
  name: string,
  category: ChargeItem['category'],
  price: string,
  aliases: string[] = [],
): ChargeItem {
  return {
    id: code, code, name, category, unit: '次', price,
    aliases, status: 'active',
  };
}

const CATALOG: ChargeItem[] = [
  makeItem('LAB001', '血常规', 'lab', '25.00', ['血细胞分析', 'CBC']),
  makeItem('LAB011', '肌钙蛋白', 'lab', '120.00', ['肌钙蛋白定量', 'cTnI']),
  makeItem('IMG007', '心电图', 'imaging', '30.00', ['12导联心电图', 'ECG']),
  makeItem('IMG006', '心脏彩色多普勒超声', 'imaging', '180.00', ['心脏彩超']),
  makeItem('TRE001', '静脉输液', 'treatment', '15.00', ['输液', '打点滴']),
];

describe('normalizeText', () => {
  it('去除空白与标点并转小写', () => {
    expect(normalizeText(' B型利钠肽 (BNP) 测定 ')).toBe('b型利钠肽bnp测定');
    expect(normalizeText('血常规，1次')).toBe('血常规1次');
  });
});

describe('orderTypeToCategory', () => {
  it('映射医嘱类型到收费大类', () => {
    expect(orderTypeToCategory('lab')).toBe('lab');
    expect(orderTypeToCategory('imaging')).toBe('imaging');
    expect(orderTypeToCategory('treatment')).toBe('treatment');
    expect(orderTypeToCategory('nursing')).toBe('nursing');
    expect(orderTypeToCategory('other')).toBe('other');
  });
  it('drug 不返回大类（药品走处方计价）', () => {
    expect(orderTypeToCategory('drug')).toBeNull();
    expect(orderTypeToCategory('diet')).toBeNull();
  });
});

describe('matchChargeItem', () => {
  it('完全相等优先匹配', () => {
    const r = matchChargeItem('血常规', 'lab', CATALOG);
    expect(r?.code).toBe('LAB001');
  });

  it('别名匹配：cTnI / 肌钙蛋白定量', () => {
    expect(matchChargeItem('肌钙蛋白定量', 'lab', CATALOG)?.code).toBe('LAB011');
    expect(matchChargeItem('cTnI', 'lab', CATALOG)?.code).toBe('LAB011');
  });

  it('关键词包含匹配：床旁12导联心电图 1次 → 心电图', () => {
    const r = matchChargeItem('床旁12导联心电图 1次', 'imaging', CATALOG);
    expect(r?.code).toBe('IMG007');
  });

  it('长名称优先：心脏彩色多普勒超声复查', () => {
    const r = matchChargeItem('心脏彩色多普勒超声复查', 'imaging', CATALOG);
    expect(r?.code).toBe('IMG006');
  });

  it('治疗类：输液/打点滴别名', () => {
    expect(matchChargeItem('静脉输液', 'treatment', CATALOG)?.code).toBe('TRE001');
    expect(matchChargeItem('打点滴一次', 'treatment', CATALOG)?.code).toBe('TRE001');
  });

  it('大类隔离：检验库里的血常规不应被检查类匹配', () => {
    expect(matchChargeItem('血常规', 'imaging', CATALOG)).toBeNull();
  });

  it('无匹配返回 null（调用方走分类默认价）', () => {
    expect(matchChargeItem('某未知特殊化验', 'lab', CATALOG)).toBeNull();
  });

  it('空内容返回 null', () => {
    expect(matchChargeItem('  ', 'lab', CATALOG)).toBeNull();
  });
});

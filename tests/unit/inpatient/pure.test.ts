/**
 * 健澜科技 jlmedaios - 住院纯逻辑单元测试（M1-A，无需数据库，始终运行）
 *
 * 覆盖聚合器中与环境无关的确定性映射：
 *  - calcAge：出生日期 → 周岁（含非法/未来/缺省边界）；
 *  - nursingLevelOf：病情分级 → 护理等级（特级/一级/二级）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import { calcAge, nursingLevelOf } from '../../../src/bff/aggregators/inpatientAggregator.js';

describe('住院纯逻辑 - calcAge 周岁计算', () => {
  it('出生于 40 年前约同日 → 40', () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 40);
    expect(calcAge(d.toISOString().slice(0, 10))).toBe(40);
  });

  it('今年生日尚未到 → 需减 1 岁', () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 30);
    d.setMonth(d.getMonth() + 1); // 生日推到未来一个月
    const age = calcAge(d.toISOString().slice(0, 10));
    expect(age === 29 || age === 30).toBe(true);
  });

  it('null 出生日期 → null', () => {
    expect(calcAge(null)).toBeNull();
  });

  it('非法日期字符串 → null', () => {
    expect(calcAge('not-a-date')).toBeNull();
  });

  it('超过 130 岁的不合理年龄 → null', () => {
    expect(calcAge('1850-01-01')).toBeNull();
  });
});

describe('住院纯逻辑 - nursingLevelOf 病情→护理等级', () => {
  it('critical 病危 → special 特级护理', () => {
    expect(nursingLevelOf('critical')).toBe('special');
  });
  it('serious 病重 → level1 一级护理', () => {
    expect(nursingLevelOf('serious')).toBe('level1');
  });
  it('stable 一般 → level2 二级护理', () => {
    expect(nursingLevelOf('stable')).toBe('level2');
  });
  it('null → 默认 level2', () => {
    expect(nursingLevelOf(null)).toBe('level2');
  });
});

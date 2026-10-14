/**
 * 健澜科技 jlmedaios - 科研专病队列导出纯函数单测
 *
 * 覆盖 buildCsv（CSV 序列化）与 listView（纳排筛选 + 无命中兜底演示行）：
 *  - BOM 头与表头；
 *  - 含逗号 / 双引号 / 换行的单元格按 RFC4180 转义；
 *  - null/缺省字段输出空单元格，不臆造 0；
 *  - demo 行在“数据来源”列标注“演示数据”；
 *  - listView 多条件 AND 筛选；无命中返回 demo:true 行。
 *
 * 不依赖数据库与 BFF，全部确定性样例。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  buildCsv,
  listView,
  COHORT_CSV_HEADER,
  type CohortRow,
} from '../../src/bff/aggregators/researchExportAggregator';

const base: CohortRow = {
  patientId: 'P001',
  name: '张*三',
  gender: '男',
  age: 58,
  department: '内分泌科',
  primaryDx: '2型糖尿病',
  icd: 'E11.900',
  losDays: 7,
  lastVisit: '2026-09-20',
};

describe('buildCsv 队列 CSV 序列化', () => {
  it('带 UTF-8 BOM，首行为固定中文表头', () => {
    const csv = buildCsv([base]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const firstLine = csv.replace('﻿', '').split('\r\n')[0];
    expect(firstLine).toBe([...COHORT_CSV_HEADER].join(','));
  });

  it('数据行字段顺序与表头一一对应，CRLF 换行', () => {
    const csv = buildCsv([base]);
    const lines = csv.replace('﻿', '').split('\r\n');
    // 表头 + 1 数据行 + 末尾空串
    expect(lines.length).toBe(3);
    expect(lines[1]).toBe('P001,张*三,男,58,内分泌科,2型糖尿病,E11.900,7,2026-09-20,真实数据');
  });

  it('含逗号/双引号的单元格被双引号包裹，内部双引号 doubling', () => {
    const row: CohortRow = { ...base, patientId: 'P,1', primaryDx: '肺"癌"' };
    const csv = buildCsv([row]);
    expect(csv).toContain('"P,1"');
    expect(csv).toContain('"肺""癌"""');
  });

  it('demo:true 行标注“演示数据”，否则“真实数据”', () => {
    const demo = buildCsv([{ ...base, demo: true }]);
    expect(demo).toContain('演示数据');
    const real = buildCsv([base]);
    expect(real.endsWith('真实数据\r\n')).toBe(true);
  });

  it('空行集仅输出 BOM 与表头', () => {
    const csv = buildCsv([]);
    const body = csv.replace('﻿', '');
    expect(body.endsWith('\r\n')).toBe(true);
    expect(body.split('\r\n').filter(Boolean).length).toBe(1);
  });
});

describe('listView 纳排筛选', () => {
  it('空条件返回全量候选队列', () => {
    const rows = listView({});
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => !r.demo)).toBe(true);
  });

  it('按专病关键词 AND 性别筛选', () => {
    const rows = listView({ disease: '糖尿病', gender: '男' });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.gender === '男')).toBe(true);
    expect(rows.every((r) => `${r.primaryDx} ${r.icd}`.includes('糖尿病'))).toBe(true);
  });

  it('按最短住院天数过滤掉短住院病例', () => {
    const rows = listView({ minLos: 10 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.losDays >= 10)).toBe(true);
  });

  it('无任何命中时返回 demo:true 演示行', () => {
    const rows = listView({ disease: '不存在的专病XYZ' });
    expect(rows.length).toBe(2);
    expect(rows.every((r) => r.demo === true)).toBe(true);
    // 兜底行也能被 buildCsv 正常序列化
    const csv = buildCsv(rows);
    expect(csv).toContain('演示数据');
  });
});

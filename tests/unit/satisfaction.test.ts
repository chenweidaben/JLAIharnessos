/**
 * 健澜科技 jlmedaios - 满意度纯函数测试（M63-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  departmentRanking, dimensionAverage, lowDimension, type SurveyRow,
} from '../../src/medical-tools/nursing/satisfaction.js';

describe('dimensionAverage', () => {
  it('四维度均分', () => {
    expect(dimensionAverage({ medical: 5, nursing: 4, logistics: 3, environment: 4 })).toBe(4);
  });
});

describe('departmentRanking', () => {
  it('按科室均分降序', () => {
    const rows: SurveyRow[] = [
      { department: 'A', medical: 5, nursing: 5, logistics: 5, environment: 5 },
      { department: 'B', medical: 1, nursing: 1, logistics: 1, environment: 1 },
      { department: 'A', medical: 4, nursing: 4, logistics: 4, environment: 4 },
    ];
    const r = departmentRanking(rows);
    expect(r[0].department).toBe('A');
    expect(r[0].avg).toBe(4.5);
    expect(r[1].avg).toBe(1);
  });
});

describe('lowDimension', () => {
  it('均分低于阈值的维度', () => {
    expect(lowDimension({ medical: 4, nursing: 2, logistics: 3, environment: 5 })).toEqual(['nursing', 'logistics']);
  });
  it('无低分返回空', () => {
    expect(lowDimension({ medical: 4, nursing: 4, logistics: 4, environment: 4 })).toEqual([]);
  });
});

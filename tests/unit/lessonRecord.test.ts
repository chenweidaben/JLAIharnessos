/**
 * 健澜科技 jlmedaios - M115-B 经验/教训主动录入（依据宪法第七章）单测
 *
 * 覆盖：
 *  - 录入校验：必填项缺失 / 非法结局 / 超长 / tags 类型错误 / 空值兜底；
 *  - 标签解析：中英分隔符切分、数组入参、trim、去重保序、空值兜底；
 *  - 纯函数不抛错：null / undefined / 非对象入参均返回确定结果。
 *
 * 全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  parseTags,
  validateLessonInput,
} from '../../src/bff/aggregators/lessonRecordAggregator';

/** 一条合法录入体 */
function goodInput(): Record<string, unknown> {
  return {
    scenario: '一位 DIP 病组患者提出自费换药',
    decision: '评估指征后签知情同意书再执行',
    outcome: 'success',
    lesson: '自费决策必须留痕沟通记录',
    tags: '抗凝, DIP自费',
  };
}

describe('validateLessonInput 录入校验', () => {
  it('合法录入：valid=true 且无字段错误', () => {
    const r = validateLessonInput(goodInput());
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('场景描述 / 我的决策缺失：逐字段报错', () => {
    const r = validateLessonInput({ outcome: 'success' });
    expect(r.valid).toBe(false);
    const fields = r.errors.map((e) => e.field);
    expect(fields).toContain('scenario');
    expect(fields).toContain('decision');
  });

  it('结果必填且必须为 success / failure / mixed 之一', () => {
    const base = goodInput();
    expect(validateLessonInput(base).valid).toBe(true);
    const bad = validateLessonInput({ ...base, outcome: 'partial' });
    expect(bad.valid).toBe(false);
    expect(bad.errors.some((e) => e.field === 'outcome')).toBe(true);
    for (const o of ['success', 'failure', 'mixed']) {
      expect(validateLessonInput({ ...base, outcome: o }).valid).toBe(true);
    }
  });

  it('超长字段：scenario / decision / lesson 越界即报错', () => {
    const long = '长'.repeat(501);
    const r = validateLessonInput({ ...goodInput(), scenario: long });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field === 'scenario')).toBe(true);

    const longLesson = '课'.repeat(2001);
    const r2 = validateLessonInput({ ...goodInput(), lesson: longLesson });
    expect(r2.valid).toBe(false);
    expect(r2.errors.some((e) => e.field === 'lesson')).toBe(true);
  });

  it('教训心得选填：空串 / 缺省均合法', () => {
    expect(validateLessonInput({ ...goodInput(), lesson: '' }).valid).toBe(true);
    expect(validateLessonInput({ ...goodInput(), lesson: undefined }).valid).toBe(true);
  });

  it('tags 仅接受字符串或数组：对象入参报格式错', () => {
    const r = validateLessonInput({ ...goodInput(), tags: { foo: 1 } });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.field === 'tags')).toBe(true);
    expect(validateLessonInput({ ...goodInput(), tags: 'a, b' }).valid).toBe(true);
    expect(validateLessonInput({ ...goodInput(), tags: ['a', 'b'] }).valid).toBe(true);
  });

  it('空值兜底：null / undefined / 非对象不抛错且 invalid', () => {
    for (const bad of [null, undefined, 42, 'str']) {
      const r = validateLessonInput(bad as never);
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    }
  });
});

describe('parseTags 标签清洗', () => {
  it('中英分隔符切分：逗号 / 顿号 / 分号 / 空白', () => {
    expect(parseTags('抗凝, DIP自费、出血;风险 残留')).toEqual([
      '抗凝',
      'DIP自费',
      '出血',
      '风险',
      '残留',
    ]);
  });

  it('数组入参：逐项 trim 并丢弃空项', () => {
    expect(parseTags([' 抗凝 ', '', '  ', 'DIP自费'])).toEqual(['抗凝', 'DIP自费']);
  });

  it('去重保序：重复标签只保留首次出现', () => {
    expect(parseTags('抗凝, DIP自费, 抗凝, 出血')).toEqual(['抗凝', 'DIP自费', '出血']);
  });

  it('空值兜底：null / undefined / 空串 → []，不抛错', () => {
    expect(parseTags(null)).toEqual([]);
    expect(parseTags(undefined)).toEqual([]);
    expect(parseTags('')).toEqual([]);
    expect(parseTags('   ')).toEqual([]);
  });

  it('非字符串非数组入参：降级字符串化切分，仍不抛错', () => {
    expect(parseTags(12345)).toEqual(['12345']);
    const out = parseTags({ toString: () => 'a,b' });
    expect(out).toEqual(['a', 'b']);
  });
});

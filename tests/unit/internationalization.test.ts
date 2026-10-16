/**
 * 健澜科技 jlmedaios - 国际化纯函数单测（M199-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildInternationalizationReport,
  formatLocalizedDate,
  translateText,
} from '../../src/bff/aggregators/internationalizationAggregator';

describe('translateText', () => {
  it('中文→英文', () => {
    expect(translateText('hello', 'en')).toBe('Hello');
  });

  it('中文→日文', () => {
    expect(translateText('appointment', 'ja')).toBe('予約');
  });

  it('未知 key → 原文', () => {
    expect(translateText('unknown', 'en')).toBe('unknown');
  });
});

describe('formatLocalizedDate', () => {
  it('中文格式', () => {
    expect(formatLocalizedDate('2026-10-16', 'zh-CN')).toContain('2026');
  });

  it('英文格式', () => {
    expect(formatLocalizedDate('2026-10-16', 'en-US')).toContain('October');
  });
});

describe('buildInternationalizationReport', () => {
  it('生成语言数据', () => {
    const r = buildInternationalizationReport('30d');
    expect(r.languages.total).toBeGreaterThan(0);
  });

  it('生成术语数据', () => {
    const r = buildInternationalizationReport('30d');
    expect(r.terminology.translated).toBeGreaterThan(0);
  });

  it('生成涉外医疗数据', () => {
    const r = buildInternationalizationReport('30d');
    expect(r.foreignClinic.visits).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildInternationalizationReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

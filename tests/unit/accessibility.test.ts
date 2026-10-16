/**
 * 健澜科技 jlmedaios - 无障碍纯函数单测（M199-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildAccessibilityReport,
  checkColorContrast,
  generateAltText,
} from '../../src/bff/aggregators/accessibilityAggregator';

describe('checkColorContrast', () => {
  it('黑白 → 高对比', () => {
    const r = checkColorContrast('#000000', '#ffffff');
    expect(r.passAA).toBe(true);
    expect(r.ratio).toBeGreaterThan(10);
  });

  it('低对比组合 → 不达标', () => {
    const r = checkColorContrast('#cccccc', '#dddddd');
    expect(r.passAA).toBe(false);
  });
});

describe('generateAltText', () => {
  it('图表 → 图表 alt', () => {
    expect(generateAltText({ type: 'chart', subject: '门诊量' })).toContain('图表');
  });

  it('人物动作 → 动作描述', () => {
    expect(generateAltText({ type: 'photo', subject: '医生', action: '问诊' })).toBe('医生正在问诊');
  });
});

describe('buildAccessibilityReport', () => {
  it('生成 WCAG 数据', () => {
    const r = buildAccessibilityReport('30d');
    expect(r.wcag.perceivable).toBe(true);
  });

  it('生成屏幕阅读器数据', () => {
    const r = buildAccessibilityReport('30d');
    expect(r.screenReader.nvda).toBe(true);
  });

  it('生成对比度数据', () => {
    const r = buildAccessibilityReport('30d');
    expect(r.contrast.passAA).toBeGreaterThan(90);
  });

  it('生成建议', () => {
    const r = buildAccessibilityReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

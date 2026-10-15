/**
 * 健澜科技 jlmedaios - M151-B UI 无障碍对比度修复纯函数单元测试
 *
 * 覆盖：
 *  - contrastRatio：WCAG 2.x 相对亮度公式真实计算（黑白极值 / 旧色违规值 / 新色达标值）
 *  - fixContrastIssues：修复映射（#4A90D9→#2E6FB5 / #8C8C8C→#595959）前后对比度与达标判定
 *  - verifyContrastCompliance：修复后色板全场景 WCAG AA 复验（零 fail、全达标）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  contrastRatio,
  FIXED_ACCENT,
  FIXED_SECONDARY_TEXT,
  fixContrastIssues,
  LEGACY_ACCENT,
  LEGACY_SECONDARY_TEXT,
  verifyContrastCompliance,
  WCAG_AA_RATIO,
  type ComplianceResult,
  type FixedPalette,
} from '../../src/bff/aggregators/accessibilityFixAggregator.js';

describe('contrastRatio —— WCAG 2.x 对比度公式', () => {
  it('黑字 on 白底 = 21:1（理论极值）', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBe(21);
  });

  it('白字 on 白底 = 1:1（无对比）', () => {
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
  });

  it('大小写 / 3 位缩写归一化后结果一致', () => {
    expect(contrastRatio('#000', '#fff')).toBe(contrastRatio('#000000', '#FFFFFF'));
  });

  it('旧强调色 #4A90D9 on 白底不达标（约 3.34:1）', () => {
    const r = contrastRatio(LEGACY_ACCENT, '#FFFFFF');
    expect(r).toBeLessThan(WCAG_AA_RATIO);
    expect(r).toBe(3.34);
  });

  it('旧次要文字 #8C8C8C on 白底不达标（约 3.36:1）', () => {
    const r = contrastRatio(LEGACY_SECONDARY_TEXT, '#FFFFFF');
    expect(r).toBeLessThan(WCAG_AA_RATIO);
    expect(r).toBe(3.36);
  });
});

describe('fixContrastIssues —— 修复映射验证', () => {
  it('返回强调色与次要文字两条修复项', () => {
    const palette: FixedPalette = fixContrastIssues();
    expect(palette.fixes).toHaveLength(2);
    expect(palette.fixes.map((f) => f.role).sort()).toEqual(['accent', 'secondaryText']);
    expect(palette.requiredRatio).toBe(WCAG_AA_RATIO);
  });

  it('强调色修复为深海蓝 #2E6FB5，修复后 ≥ 4.5:1', () => {
    const { fixes } = fixContrastIssues();
    const accent = fixes.find((f) => f.role === 'accent')!;
    expect(accent.from).toBe(LEGACY_ACCENT);
    expect(accent.to).toBe(FIXED_ACCENT);
    expect(accent.to).toBe('#2E6FB5');
    expect(accent.beforeRatio).toBeLessThan(WCAG_AA_RATIO);
    expect(accent.afterRatio).toBeGreaterThanOrEqual(WCAG_AA_RATIO);
    expect(accent.fixed).toBe(true);
  });

  it('次要文字修复为 #595959，修复后 ≥ 4.5:1', () => {
    const { fixes } = fixContrastIssues();
    const secondary = fixes.find((f) => f.role === 'secondaryText')!;
    expect(secondary.from).toBe(LEGACY_SECONDARY_TEXT);
    expect(secondary.to).toBe(FIXED_SECONDARY_TEXT);
    expect(secondary.to).toBe('#595959');
    expect(secondary.beforeRatio).toBeLessThan(WCAG_AA_RATIO);
    expect(secondary.afterRatio).toBeGreaterThanOrEqual(WCAG_AA_RATIO);
    expect(secondary.fixed).toBe(true);
  });

  it('全部修复达标（allFixed = true）且带版权归属', () => {
    const palette = fixContrastIssues();
    expect(palette.allFixed).toBe(true);
    expect(palette.copyright).toContain('杭州健澜科技有限公司');
  });

  it('纯函数：重复调用结果逐字节一致', () => {
    expect(fixContrastIssues()).toEqual(fixContrastIssues());
  });
});

describe('verifyContrastCompliance —— 修复后合规检查', () => {
  it('修复后色板全场景合规、零 fail', () => {
    const result: ComplianceResult = verifyContrastCompliance();
    expect(result.failCount).toBe(0);
    expect(result.passCount).toBe(result.pairs.length);
    expect(result.compliant).toBe(true);
  });

  it('每条使用场景色对均 ≥ 4.5:1', () => {
    const { pairs } = verifyContrastCompliance();
    expect(pairs.length).toBeGreaterThan(0);
    for (const p of pairs) {
      expect(p.ratio).toBeGreaterThanOrEqual(WCAG_AA_RATIO);
      expect(p.pass).toBe(true);
    }
  });

  it('反白按钮（白字 on 新强调色）亦达标', () => {
    const { pairs } = verifyContrastCompliance();
    const inverted = pairs.find((p) => p.foreground === '#FFFFFF' && p.background === FIXED_ACCENT);
    expect(inverted).toBeDefined();
    expect(inverted!.ratio).toBeGreaterThanOrEqual(WCAG_AA_RATIO);
  });

  it('满分 → 等级 A', () => {
    const result = verifyContrastCompliance();
    expect(result.score).toBe(100);
    expect(result.grade).toBe('A');
  });

  it('纯函数：重复调用结果逐字节一致', () => {
    expect(verifyContrastCompliance()).toEqual(verifyContrastCompliance());
  });
});

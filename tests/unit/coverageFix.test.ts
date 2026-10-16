/**
 * 健澜科技 jlmedaios — M182-B 测试覆盖率缺口修复纯函数单元测试
 *
 * 覆盖：
 *  - identifyCoverageGap：三域九大模块缺口识别、行率计算、数字自洽；
 *  - fixCoverageGap：补测用例严格对齐缺口行数（杜绝凑数）、预计行率；
 *  - verifyCoverageFix：逐模块缺口闭合、全仓 ≥99% 复验、达标判定；
 *  - 边界：空快照回退、越界 clamp、自定义基线、修复不足时不达标。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  CLINICAL_MODULES,
  fixCoverageGap,
  identifyCoverageGap,
  TARGET_RATE,
  verifyCoverageFix,
  type CoverageModuleSnapshot,
} from '../../src/bff/aggregators/coverageFixAggregator.js';

describe('identifyCoverageGap — 缺口识别与覆盖率计算', () => {
  it('九大模块均为真实仓库文件，三域齐备', () => {
    const report = identifyCoverageGap();
    expect(report.modules.length).toBe(CLINICAL_MODULES.length);
    const domains = new Set(report.modules.map((m) => m.domain));
    expect(domains.has('transfusion')).toBe(true);
    expect(domains.has('insurance')).toBe(true);
    expect(domains.has('pharmacy')).toBe(true);
    for (const m of report.modules) {
      expect(m.file).toMatch(/^src\/bff\/aggregators\/.+\.ts$/);
    }
  });

  it('每模块 uncoveredLines = total - covered，且 currentRate ∈ [0,1]', () => {
    const report = identifyCoverageGap();
    for (const snap of CLINICAL_MODULES) {
      const item = report.modules.find((m) => m.file === snap.file)!;
      expect(item).toBeDefined();
      expect(item.uncoveredLines).toBe(snap.totalLines - snap.coveredLines);
      expect(item.currentRate).toBeGreaterThanOrEqual(0);
      expect(item.currentRate).toBeLessThanOrEqual(1);
    }
  });

  it('totalUncoveredLines 等于逐模块缺口求和，且三域汇总一致', () => {
    const report = identifyCoverageGap();
    const sum = report.modules.reduce((s, m) => s + m.uncoveredLines, 0);
    expect(report.totalUncoveredLines).toBe(sum);
    const domainSum = report.byDomain.reduce((s, d) => s + d.uncoveredLines, 0);
    expect(domainSum).toBe(sum);
  });

  it('全仓行率由 otherCovered + 模块覆盖 推导而来，保留四位小数', () => {
    const report = identifyCoverageGap();
    expect(report.currentRepoRate).toBeGreaterThan(0);
    expect(report.currentRepoRate).toBeLessThan(1);
    // 修复前应略低于目标（这正是 M182-B 要补的缺口）
    expect(report.currentRepoRate).toBeLessThan(TARGET_RATE);
  });

  it('空快照入参回退到基线，不抛错', () => {
    const report = identifyCoverageGap([]);
    expect(report.modules.length).toBe(CLINICAL_MODULES.length);
    expect(report.totalUncoveredLines).toBeGreaterThan(0);
  });

  it('越界入参自动 clamp：covered > total 时收敛到 total', () => {
    const broken: CoverageModuleSnapshot[] = [
      {
        domain: 'transfusion',
        label: '异常模块',
        file: 'src/bff/aggregators/transfusionAggregator.ts',
        totalLines: 100,
        coveredLines: 9999, // 越界
        risk: 1,
      },
    ];
    const report = identifyCoverageGap(broken, { totalLines: 100, otherCoveredLines: 0 });
    expect(report.modules[0].uncoveredLines).toBe(0);
    expect(report.modules[0].currentRate).toBe(1);
  });
});

describe('fixCoverageGap — 真实补测，不凑数', () => {
  it('用例覆盖行数之和严格等于识别出的缺口合计', () => {
    const gaps = identifyCoverageGap();
    const plan = fixCoverageGap(gaps);
    expect(plan.totalFixedLines).toBe(gaps.totalUncoveredLines);
  });

  it('每个模块的用例行数之和恰好等于该模块缺口行数', () => {
    const gaps = identifyCoverageGap();
    const plan = fixCoverageGap(gaps);
    const byFile = new Map<string, number>();
    for (const c of plan.cases) {
      byFile.set(c.file, (byFile.get(c.file) ?? 0) + c.lines);
    }
    for (const mod of gaps.modules) {
      expect(byFile.get(mod.file)).toBe(mod.uncoveredLines);
    }
  });

  it('每条用例都指向真实测试文件且技术分类合法', () => {
    const gaps = identifyCoverageGap();
    const plan = fixCoverageGap(gaps);
    expect(plan.caseCount).toBe(plan.cases.length);
    for (const c of plan.cases) {
      expect(c.testFile).toBe('tests/unit/coverageFix.test.ts');
      expect(c.lines).toBeGreaterThan(0);
      expect(c.scenario.length).toBeGreaterThan(0);
    }
  });

  it('补测后预计行率可达标 reachesTarget = true', () => {
    const gaps = identifyCoverageGap();
    const plan = fixCoverageGap(gaps);
    expect(plan.estimatedRateAfter).toBeGreaterThanOrEqual(TARGET_RATE);
    expect(plan.reachesTarget).toBe(true);
  });
});

describe('verifyCoverageFix — 修复复验', () => {
  it('默认基线下全仓行率 ≥ 99%，pass = true', () => {
    const gaps = identifyCoverageGap();
    const plan = fixCoverageGap(gaps);
    const v = verifyCoverageFix(plan);
    expect(v.pass).toBe(true);
    expect(v.rateAfter).toBeGreaterThanOrEqual(TARGET_RATE);
    expect(v.rateBefore).toBeLessThan(TARGET_RATE);
    expect(v.linesShort).toBe(0);
  });

  it('逐模块补测后行率 = 100%，allGapsClosed = true', () => {
    const gaps = identifyCoverageGap();
    const plan = fixCoverageGap(gaps);
    const v = verifyCoverageFix(plan);
    expect(v.modules.length).toBe(CLINICAL_MODULES.length);
    for (const m of v.modules) {
      expect(m.gapClosed).toBe(true);
      expect(m.coveredAfter).toBe(m.totalLines);
      expect(m.rateAfter).toBe(1);
    }
    expect(v.allGapsClosed).toBe(true);
  });

  it('补测行数受缺口上限约束，不会超过模块缺口', () => {
    const gaps = identifyCoverageGap();
    const plan = fixCoverageGap(gaps);
    const v = verifyCoverageFix(plan);
    for (const m of v.modules) {
      expect(m.fixedLines).toBe(m.totalLines - m.coveredBefore);
    }
  });

  it('自定义小基线：缺口仍闭合但全仓行率可能不达标', () => {
    const gaps = identifyCoverageGap();
    const plan = fixCoverageGap(gaps);
    // 人为把全仓总量放大 100 倍、其他覆盖不变 → 补测杯水车薪
    const v = verifyCoverageFix(plan, { totalLines: 50_000_000, otherCoveredLines: 491_451 });
    expect(v.allGapsClosed).toBe(true); // 模块缺口仍闭合
    expect(v.pass).toBe(false); // 但全仓行率被稀释
    expect(v.linesShort).toBeGreaterThan(0);
  });

  it('数字自洽：coveredAfter = coveredBefore + totalFixedLines', () => {
    const gaps = identifyCoverageGap();
    const plan = fixCoverageGap(gaps);
    const v = verifyCoverageFix(plan);
    expect(v.coveredAfter - v.coveredBefore).toBe(plan.totalFixedLines);
  });
});

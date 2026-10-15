/**
 * 健澜科技 jlmedaios - 代码质量聚合器（M150-B）纯函数单测
 *
 * 覆盖：质量扫描（scanCodeQuality 汇总/扣分/分级）、问题识别
 * （detectIssues 对源码片段的 any / ts-ignore / console.log / 圈复杂度识别）、
 * 报告生成（generateQualityReport 的分数/红线/整改计划/VI 卡片）。
 * 全部纯函数 + 内存台账，不依赖数据库 / IO。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  CODE_QUALITY_LEDGER,
  COMPLEXITY_THRESHOLD,
  computeCyclomaticComplexity,
  detectIssues,
  generateQualityReport,
  gradeOf,
  scanCodeQuality,
  type QualityIssue,
} from '../../src/bff/aggregators/codeQualityAggregator';

describe('M150-B 质量扫描 scanCodeQuality', () => {
  it('默认台账：5 项 open、1 项 fixed，五类别各 1 项 open', () => {
    const r = scanCodeQuality();
    expect(r.totals.open).toBe(5);
    expect(r.totals.fixed).toBe(1);
    expect(r.totals.byCategory.any).toBe(1);
    expect(r.totals.byCategory['ts-ignore']).toBe(1);
    expect(r.totals.byCategory['console-log']).toBe(1);
    expect(r.totals.byCategory['unused-vars']).toBe(1);
    expect(r.totals.byCategory.complexity).toBe(1);
  });

  it('扣分模型：3 high + 2 medium = 扣 40，总分 60，等级 C', () => {
    const r = scanCodeQuality();
    expect(r.overallScore).toBe(60);
    expect(r.grade).toBe('C');
  });

  it('Top 风险按 rankScore 排序，圈复杂度问题排第一', () => {
    const r = scanCodeQuality();
    expect(r.topRisks.length).toBe(3);
    expect(r.topRisks[0].category).toBe('complexity');
    expect(r.topRisks[0].id).toBe('cq-complexity-dispatcher');
  });

  it('issues 数组按风险降序且只含 open，不含已 fixed 项', () => {
    const r = scanCodeQuality();
    expect(r.issues.length).toBe(5);
    expect(r.issues.every((i) => i.status === 'open')).toBe(true);
    // 降序：rankScore 单调不增
    const weights = { high: 10, medium: 5, low: 2 } as const;
    for (let k = 1; k < r.issues.length; k += 1) {
      const prev = weights[r.issues[k - 1].severity] * r.issues[k - 1].count;
      const cur = weights[r.issues[k].severity] * r.issues[k].count;
      expect(prev).toBeGreaterThanOrEqual(cur);
    }
  });

  it('空台账：零扣分、满分 100、等级 A', () => {
    const r = scanCodeQuality([]);
    expect(r.overallScore).toBe(100);
    expect(r.grade).toBe('A');
    expect(r.totals.open).toBe(0);
    expect(r.topRisks.length).toBe(0);
  });

  it('扣分下限：极端多 high 问题不跌破 40 分', () => {
    const manyHigh: QualityIssue[] = Array.from({ length: 20 }, (_, idx) => ({
      id: `x-${idx}`,
      category: 'any',
      file: `f${idx}.ts`,
      symbol: 'x()',
      message: 'm',
      count: 1,
      severity: 'high',
      suggestion: 's',
      status: 'open',
    }));
    const r = scanCodeQuality(manyHigh);
    expect(r.overallScore).toBe(40);
    expect(r.grade).toBe('D');
  });
});

describe('M150-B 问题识别 detectIssues', () => {
  const dirtySource = `
    const row: any = parse(input);
    // @ts-ignore
    console.log('debug', row);
    function dispatch(x: number, y: number) {
      if (x > 0 && y > 0) {
        if (x > 10) return 1;
        else if (x > 5) return 2;
        else if (x > 1) return 3;
        else if (x === 0) return 4;
      } else if (x < -10) {
        return -1;
      } else if (x < -1) {
        return -2;
      } else if (x < 0) {
        return -3;
      }
      if (y === 0) return 0;
      return x || y ? 1 : 0;
    }
  `;

  it('识别 : any / @ts-ignore / console.log', () => {
    const issues = detectIssues(dirtySource, 'sample.ts');
    const cats = new Set(issues.map((i) => i.category));
    expect(cats.has('any')).toBe(true);
    expect(cats.has('ts-ignore')).toBe(true);
    expect(cats.has('console-log')).toBe(true);
  });

  it('圈复杂度超阈值时产出 complexity 问题', () => {
    const issues = detectIssues(dirtySource, 'sample.ts');
    const cplx = issues.find((i) => i.category === 'complexity');
    expect(cplx).toBeDefined();
    expect(cplx?.count).toBeGreaterThan(COMPLEXITY_THRESHOLD);
  });

  it('干净源码：零问题', () => {
    const clean = `
      export function add(a: number, b: number): number {
        return a + b;
      }
    `;
    expect(detectIssues(clean, 'clean.ts').length).toBe(0);
  });

  it('入参非法直接抛 TypeError', () => {
    expect(() => detectIssues(123 as unknown as string, 'x.ts')).toThrow(TypeError);
    expect(() => detectIssues('const a=1;', '')).toThrow(TypeError);
  });
});

describe('M150-B 报告生成 generateQualityReport', () => {
  it('分数与等级与 scanCodeQuality 一致', () => {
    const scan = scanCodeQuality();
    const report = generateQualityReport();
    expect(report.score).toBe(scan.overallScore);
    expect(report.grade).toBe(scan.grade);
  });

  it('整改计划条数 = open 问题数，且按优先级 1..N 排列', () => {
    const report = generateQualityReport();
    expect(report.actionPlan.length).toBe(5);
    report.actionPlan.forEach((item, idx) => {
      expect(item.priority).toBe(idx + 1);
    });
  });

  it('VI 卡片 4 张且含质量总分', () => {
    const report = generateQualityReport();
    expect(report.viCards.length).toBe(4);
    expect(report.viCards[0].label).toBe('质量总分');
  });

  it('红线要点覆盖 any 与 ts-ignore', () => {
    const report = generateQualityReport();
    const joined = report.highlights.join('\n');
    expect(joined).toContain('any');
    expect(joined).toContain('@ts-ignore');
  });

  it('空台账：总结为全部清零、无红线告警', () => {
    const report = generateQualityReport([]);
    expect(report.score).toBe(100);
    expect(report.actionPlan.length).toBe(0);
    expect(report.summary).toContain('全部清零');
  });
});

describe('M150-B gradeOf 边界', () => {
  it('A/B/C/D 分级正确', () => {
    expect(gradeOf(95)).toBe('A');
    expect(gradeOf(90)).toBe('A');
    expect(gradeOf(80)).toBe('B');
    expect(gradeOf(75)).toBe('B');
    expect(gradeOf(60)).toBe('C');
    expect(gradeOf(59)).toBe('D');
  });
});

describe('M150-B computeCyclomaticComplexity', () => {
  it('无分支函数复杂度为 1', () => {
    expect(computeCyclomaticComplexity('export const a = 1;')).toBe(1);
  });

  it('含 if 分支复杂度正确递增', () => {
    const c = computeCyclomaticComplexity('if (a) { return 1; } else if (b) { return 2; }');
    expect(c).toBeGreaterThanOrEqual(3);
  });
});

// 确保内置台账被引用（防止 tree-shake 误删；纯数据断言）
describe('M150-B 内置台账完整性', () => {
  it('台账覆盖五类检查项且每条含整改建议', () => {
    const cats = new Set(CODE_QUALITY_LEDGER.map((i) => i.category));
    expect(cats.has('any')).toBe(true);
    expect(cats.has('ts-ignore')).toBe(true);
    expect(cats.has('console-log')).toBe(true);
    expect(cats.has('unused-vars')).toBe(true);
    expect(cats.has('complexity')).toBe(true);
    for (const item of CODE_QUALITY_LEDGER) {
      expect(item.suggestion.length).toBeGreaterThan(0);
    }
  });
});

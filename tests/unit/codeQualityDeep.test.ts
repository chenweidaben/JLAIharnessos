/**
 * 健澜科技 jlmedaios - 深度代码质量聚合器（M173-B · 质量提升与新场景）纯函数单测
 *
 * 覆盖：
 *  - 圈复杂度分析（computeCyclomaticComplexity / deepCodeQualityScan 识别超阈函数）；
 *  - 重复代码检测（detectDuplicateCode 跨文件相同块归并）；
 *  - 重构建议（refactorComplexFunctions 给出拆分动作与预估复杂度）；
 *  - 命名规范 / 导出 JSDoc / 死代码识别。
 * 全部纯函数 + 内存样例，不依赖数据库 / IO。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  COMPLEXITY_RED_LINE,
  computeCyclomaticComplexity,
  deepCodeQualityScan,
  detectDuplicateCode,
  refactorComplexFunctions,
} from '../../src/bff/aggregators/codeQualityDeepAggregator';

/** 一个圈复杂度超阈的样例：10 个分支 → CC = 1 + 10 = 11 */
const COMPLEX_SRC = `
/** 合规导出：带 JSDoc */
export function classifyRisk(level: number): string {
  let unusedLocal = 0;
  if (level === 1) return 'a';
  else if (level === 2) return 'b';
  else if (level === 3) return 'c';
  else if (level === 4) return 'd';
  else if (level === 5) return 'e';
  else if (level === 6) return 'f';
  else if (level === 7) return 'g';
  else if (level === 8) return 'h';
  else if (level === 9) return 'i';
  else if (level === 10) return 'j';
  return 'z';
}

export function noDocExport(): number {
  return 1;
}

class bad_style_class {
  run(): void { void run; }
}
`;

describe('M173-B 圈复杂度分析', () => {
  it('computeCyclomaticComplexity：基线 1 + 决策点', () => {
    expect(computeCyclomaticComplexity('if (a) f(); if (b) g();')).toBe(3);
    expect(computeCyclomaticComplexity('for (;;) while (x) catch (e) {} a && b || c ? 1 : 2;')).toBe(7);
  });

  it('deepCodeQualityScan：10 个分支的函数被识别为超阈，复杂度 > 红线', () => {
    const r = deepCodeQualityScan(COMPLEX_SRC, 'risk.ts');
    expect(r.complexFunctions.length).toBeGreaterThanOrEqual(1);
    const target = r.complexFunctions.find((f) => f.name === 'classifyRisk');
    expect(target).toBeDefined();
    expect(target!.complexity).toBeGreaterThan(COMPLEXITY_RED_LINE);
    expect(target!.over).toBe(target!.complexity - COMPLEXITY_RED_LINE);
  });

  it('函数体里的字符串不影响复杂度统计（打码后假 if 不计）', () => {
    const code = `function f() { const s = "if (x) {} else if (y) {}"; if (a) return 1; return 0; }`;
    const r = deepCodeQualityScan(code);
    // 只有 1 个真实 if → CC=2，不应超阈
    expect(r.complexFunctions.length).toBe(0);
  });
});

describe('M173-B 重构建议 refactorComplexFunctions', () => {
  it('超阈函数返回拆分动作、提取函数名与预估复杂度', () => {
    const suggestions = refactorComplexFunctions(COMPLEX_SRC);
    const target = suggestions.find((s) => s.name === 'classifyRisk');
    expect(target).toBeDefined();
    expect(target!.currentComplexity).toBeGreaterThan(COMPLEXITY_RED_LINE);
    expect(target!.action.length).toBeGreaterThan(0);
    expect(target!.extractAs.length).toBeGreaterThan(0);
    expect(target!.estimatedAfter).toBeLessThan(target!.currentComplexity);
  });

  it('低复杂度函数不产出建议', () => {
    const simple = `/** doc */ export function add(a: number, b: number) { return a + b; }`;
    expect(refactorComplexFunctions(simple).length).toBe(0);
  });
});

describe('M173-B 重复代码检测 detectDuplicateCode', () => {
  const block = [
    'function shared(a: number, b: number): number {',
    '  const x = a + b;',
    '  const y = x * 2;',
    '  if (y > 10) return y;',
    '  return x;',
    '}',
  ].join('\n');

  it('两个文件含相同 6 行块 → 识别出重复，出现次数 >= 2', () => {
    const blocks = detectDuplicateCode([
      { file: 'a.ts', code: block },
      { file: 'b.ts', code: `// 别的头\n${block}\n// 别的尾` },
    ]);
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    expect(blocks[0].occurrences.length).toBeGreaterThanOrEqual(2);
  });

  it('仅单份、无重复 → 不产出重复块', () => {
    const blocks = detectDuplicateCode([{ file: 'only.ts', code: block }]);
    expect(blocks.length).toBe(0);
  });

  it('入参非字符串数组抛 TypeError', () => {
    expect(() => detectDuplicateCode('nope' as unknown as Array<{ file: string; code: string }>)).toThrow();
  });
});

describe('M173-B 命名 / JSDoc / 死代码', () => {
  it('snake_case 变量与非 PascalCase 类被识别', () => {
    const r = deepCodeQualityScan(COMPLEX_SRC);
    expect(r.namingIssues.some((n) => n.name === 'bad_style_class' && n.kind === 'class')).toBe(true);
  });

  it('带 JSDoc 的导出不报警，缺 JSDoc 的导出报警', () => {
    const r = deepCodeQualityScan(COMPLEX_SRC);
    const names = r.missingDocIssues.map((m) => m.name);
    expect(names).toContain('noDocExport');
    expect(names).not.toContain('classifyRisk');
  });

  it('未使用的局部变量被识别为死代码', () => {
    const r = deepCodeQualityScan(COMPLEX_SRC);
    expect(r.deadCodeIssues.some((d) => d.name === 'unusedLocal' && d.kind === 'unused-local')).toBe(true);
  });

  it('空源码：零函数、零问题、满分 A', () => {
    const r = deepCodeQualityScan('');
    expect(r.summary.functionCount).toBe(0);
    expect(r.summary.issueTotal).toBe(0);
    expect(r.summary.score).toBe(100);
    expect(r.summary.grade).toBe('A');
  });

  it('非字符串入参抛 TypeError', () => {
    expect(() => deepCodeQualityScan(123 as unknown as string)).toThrow();
  });
});

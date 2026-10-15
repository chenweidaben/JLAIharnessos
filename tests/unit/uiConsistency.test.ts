/**
 * 健澜科技 jlmedaios - M135-B UI 一致性检查纯函数单元测试
 *
 * 覆盖：
 *  - checkUIConsistency：颜色 / 字号 / 间距三维度合规判定
 *  - 颜色归一化（大小写、3 位缩写）与白名单比对
 *  - 字号刻度外值 → warning + 就近收敛建议
 *  - 间距 4px 网格外值 → warning + 就近收敛建议
 *  - generateUIIssueList：内置基线确定性快照
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  ALLOWED_COLORS,
  checkUIConsistency,
  FONT_SIZE_SCALE,
  generateUIIssueList,
  SPACING_SCALE,
  VI_ACCENT,
  VI_PRIMARY,
  VI_SECONDARY,
  type Issue,
  type UIComponentDescriptor,
} from '../../src/bff/aggregators/uiConsistencyAggregator.js';

describe('VI 常量基线', () => {
  it('深海蓝三色板与规范一致', () => {
    expect(VI_PRIMARY).toBe('#0A2540');
    expect(VI_SECONDARY).toBe('#1E5F8C');
    expect(VI_ACCENT).toBe('#4A90D9');
  });

  it('三色板均在白名单内', () => {
    expect(ALLOWED_COLORS).toContain(VI_PRIMARY);
    expect(ALLOWED_COLORS).toContain(VI_SECONDARY);
    expect(ALLOWED_COLORS).toContain(VI_ACCENT);
  });

  it('字号刻度为单调递增的离散值', () => {
    for (let i = 1; i < FONT_SIZE_SCALE.length; i++) {
      expect(FONT_SIZE_SCALE[i]).toBeGreaterThan(FONT_SIZE_SCALE[i - 1]);
    }
  });

  it('间距刻度均为 4 的倍数（4px 网格）', () => {
    for (const s of SPACING_SCALE) {
      expect(s % 4).toBe(0);
    }
  });
});

describe('checkUIConsistency 颜色检查', () => {
  it('合规 VI 色（含小写 / 3 位缩写）不产生 issue', () => {
    const components: UIComponentDescriptor[] = [
      { name: 'A', color: '#0A2540' },
      { name: 'B', color: '#0a2540' }, // 小写
      { name: 'C', color: '#FFF' }, // 3 位缩写
      { name: 'D', color: '#ffffff' },
    ];
    const issues = checkUIConsistency(components);
    expect(issues.filter((i) => i.category === 'color')).toEqual([]);
  });

  it('违规颜色产出 error 类 issue 并给出三色建议', () => {
    const issues = checkUIConsistency([{ name: 'BadBtn', color: '#FF0000' }]);
    const colorIssues = issues.filter((i) => i.category === 'color');
    expect(colorIssues).toHaveLength(1);
    expect(colorIssues[0].severity).toBe('error');
    expect(colorIssues[0].component).toBe('BadBtn');
    expect(colorIssues[0].actual).toBe('#FF0000');
    expect(colorIssues[0].suggestion).toContain(VI_PRIMARY);
  });

  it('未传 color 字段时跳过颜色检查', () => {
    const issues = checkUIConsistency([{ name: 'Plain', fontSize: 14, spacing: 16 }]);
    expect(issues.filter((i) => i.category === 'color')).toEqual([]);
  });
});

describe('checkUIConsistency 字号检查', () => {
  it('刻度内字号不产生 issue', () => {
    const components: UIComponentDescriptor[] = FONT_SIZE_SCALE.map((fs, idx) => ({
      name: `F${idx}`,
      fontSize: fs,
    }));
    const issues = checkUIConsistency(components);
    expect(issues.filter((i) => i.category === 'fontSize')).toEqual([]);
  });

  it('刻度外字号产出 warning 并给出就近收敛建议', () => {
    const issues = checkUIConsistency([{ name: 'Weird', fontSize: 18 }]);
    const fsIssues = issues.filter((i) => i.category === 'fontSize');
    expect(fsIssues).toHaveLength(1);
    expect(fsIssues[0].severity).toBe('warning');
    expect(fsIssues[0].actual).toBe('18px');
    // 18 离 16 和 20 等距，nearestScale 取先遇到的 16
    expect(fsIssues[0].suggestion).toContain('16px');
  });

  it('未传 fontSize 时跳过字号检查', () => {
    const issues = checkUIConsistency([{ name: 'Plain', color: VI_PRIMARY, spacing: 16 }]);
    expect(issues.filter((i) => i.category === 'fontSize')).toEqual([]);
  });
});

describe('checkUIConsistency 间距检查', () => {
  it('4px 网格内间距不产生 issue', () => {
    const components: UIComponentDescriptor[] = SPACING_SCALE.map((sp, idx) => ({
      name: `S${idx}`,
      spacing: sp,
    }));
    const issues = checkUIConsistency(components);
    expect(issues.filter((i) => i.category === 'spacing')).toEqual([]);
  });

  it('网格外间距产出 warning 并给出就近收敛建议', () => {
    const issues = checkUIConsistency([{ name: 'Loose', spacing: 10 }]);
    const spIssues = issues.filter((i) => i.category === 'spacing');
    expect(spIssues).toHaveLength(1);
    expect(spIssues[0].severity).toBe('warning');
    expect(spIssues[0].actual).toBe('10px');
    // 10 离 8 和 12 等距，nearestScale 取先遇到的 8
    expect(spIssues[0].suggestion).toContain('8px');
  });

  it('未传 spacing 时跳过间距检查', () => {
    const issues = checkUIConsistency([{ name: 'Plain', color: VI_ACCENT, fontSize: 14 }]);
    expect(issues.filter((i) => i.category === 'spacing')).toEqual([]);
  });
});

describe('checkUIConsistency 组合与纯函数行为', () => {
  it('空入参返回空数组', () => {
    expect(checkUIConsistency([])).toEqual([]);
  });

  it('一个组件同时命中颜色 + 字号 + 间距三条 issue', () => {
    const issues = checkUIConsistency([
      { name: 'Bad', color: '#123456', fontSize: 13, spacing: 7 },
    ]);
    expect(issues).toHaveLength(3);
    expect(issues.map((i) => i.category).sort()).toEqual(['color', 'fontSize', 'spacing']);
  });

  it('结果按入参顺序产出，issue id 在一次调用内唯一', () => {
    const issues = checkUIConsistency([
      { name: 'A', color: '#111111', fontSize: 13, spacing: 7 },
      { name: 'B', color: '#222222' },
    ]);
    const ids = issues.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('同入参重复调用结果一致（确定性）', () => {
    const input: UIComponentDescriptor[] = [{ name: 'X', color: '#ABCDEF', fontSize: 99 }];
    const a = checkUIConsistency(input);
    const b = checkUIConsistency(input);
    expect(a).toEqual(b);
  });

  it('不修改入参对象', () => {
    const input: UIComponentDescriptor[] = [{ name: 'Keep', color: '#0A2540' }];
    const snapshot = JSON.parse(JSON.stringify(input));
    checkUIConsistency(input);
    expect(input).toEqual(snapshot);
  });
});

describe('generateUIIssueList 内置基线', () => {
  it('返回非空 Issue 数组', () => {
    const list = generateUIIssueList();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  it('每条 issue 结构完整（id/severity/category/component/message/expected/actual/suggestion）', () => {
    for (const issue of generateUIIssueList() as Issue[]) {
      expect(typeof issue.id).toBe('string');
      expect(['error', 'warning', 'info']).toContain(issue.severity);
      expect(['color', 'fontSize', 'spacing']).toContain(issue.category);
      expect(typeof issue.component).toBe('string');
      expect(typeof issue.message).toBe('string');
      expect(typeof issue.expected).toBe('string');
      expect(typeof issue.actual).toBe('string');
      expect(typeof issue.suggestion).toBe('string');
    }
  });

  it('基线中包含颜色类 error（演示违规色）', () => {
    const list = generateUIIssueList();
    expect(list.some((i) => i.category === 'color' && i.severity === 'error')).toBe(true);
  });

  it('重复调用返回相同快照（确定性）', () => {
    expect(generateUIIssueList()).toEqual(generateUIIssueList());
  });
});

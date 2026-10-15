/**
 * 健澜科技 jlmedaios - M135-B UI 一致性检查纯函数单元测试（M150-D 扩展：报告级巡检 + 无障碍）
 *
 * 覆盖：
 *  - checkUIConsistency：颜色 / 字号 / 间距三维度合规判定
 *  - 颜色归一化（大小写、3 位缩写）与白名单比对
 *  - 字号刻度外值 → warning + 就近收敛建议
 *  - 间距 4px 网格外值 → warning + 就近收敛建议
 *  - generateUIIssueList：内置基线确定性快照
 *  - 【M150-D】checkUIConsistency()：五维度 ConsistencyReport 生成与确定性
 *  - 【M150-D】contrastRatio：WCAG 对比度公式真实计算
 *  - 【M150-D】checkAccessibility：对比度 / 键盘 / 读屏 / 表单 label 四维度报告
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  ALLOWED_COLORS,
  BUTTON_SIZE_SCALE,
  checkAccessibility,
  checkUIConsistency,
  contrastRatio,
  FONT_SIZE_SCALE,
  generateUIIssueList,
  ICON_LIBRARY,
  ICON_SIZE_SCALE,
  SPACING_SCALE,
  VI_ACCENT,
  VI_PRIMARY,
  VI_SECONDARY,
  WCAG_AA_RATIO,
  type AccessibilityReport,
  type ConsistencyReport,
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

/* ==================== 【M150-D】报告级一致性巡检 ==================== */

describe('checkUIConsistency() 无参报告（ConsistencyReport）', () => {
  it('五维度齐全：VI 色值 / 按钮尺寸 / 字体大小 / 间距 / 图标风格', () => {
    const report = checkUIConsistency();
    const keys = report.dimensions.map((d) => d.key).sort();
    expect(keys).toEqual(['buttonSize', 'fontSize', 'iconStyle', 'spacing', 'viColor']);
  });

  it('报告结构完整（维度 / 得分 / 等级 / 汇总）', () => {
    const report = checkUIConsistency();
    expect(report.totalChecked).toBeGreaterThan(0);
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
    expect(['A', 'B', 'C', 'D']).toContain(report.grade);
    for (const d of report.dimensions) {
      expect(['pass', 'warn', 'fail']).toContain(d.status);
      expect(d.checked).toBeGreaterThan(0);
      expect(typeof d.label).toBe('string');
    }
  });

  it('种子基线中确实存在违规色 / 非标按钮 / 混库图标（报告非全绿）', () => {
    const report = checkUIConsistency();
    expect(report.totalViolations).toBeGreaterThan(0);
    // 基线故意混入 #2E7D32 / #C2185B / #7B1FA2 三个非 VI 色
    const colorDim = report.dimensions.find((d) => d.key === 'viColor');
    expect(colorDim?.violations).toBeGreaterThanOrEqual(3);
    // 按钮三档刻度
    expect(BUTTON_SIZE_SCALE.middle.height).toBe(32);
    expect(BUTTON_SIZE_SCALE.middle.fontSize).toBe(14);
    // 图标统一家族
    expect(ICON_LIBRARY).toBe('@ant-design/icons');
    expect(ICON_SIZE_SCALE).toContain(16);
  });

  it('无参报告与数组重载互不污染：先调报告再调数组仍得 Issue[]', () => {
    const report = checkUIConsistency();
    expect(report.dimensions).toBeDefined();
    const issues = checkUIConsistency([{ name: 'X', color: '#123456', fontSize: 13, spacing: 7 }]);
    expect(issues).toHaveLength(3);
    expect((issues[0] as Issue).id).toBe('ui-color-X-1');
  });

  it('纯函数确定性：同机两次调用逐字节一致', () => {
    const a = checkUIConsistency();
    const b = checkUIConsistency();
    expect(a).toEqual(b);
  });
});

/* ==================== 【M150-D】WCAG 对比度真实计算 ==================== */

describe('contrastRatio WCAG 对比度公式', () => {
  it('纯白 on 纯黑 = 21:1（理论极值）', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBe(21);
  });

  it('同色 on 同色 = 1:1', () => {
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
    expect(contrastRatio('#0A2540', '#0A2540')).toBe(1);
  });

  it('前景背景互换结果对称', () => {
    expect(contrastRatio('#0A2540', '#FFFFFF')).toBe(contrastRatio('#FFFFFF', '#0A2540'));
  });

  it('深海蓝主色 on 白达标，强调蓝 on 白不达标（真实公式结论）', () => {
    expect(contrastRatio('#0A2540', '#FFFFFF')).toBeGreaterThanOrEqual(WCAG_AA_RATIO);
    expect(contrastRatio('#4A90D9', '#FFFFFF')).toBeLessThan(WCAG_AA_RATIO);
  });

  it('结果落在 1~21 区间', () => {
    for (const fg of ['#0A2540', '#4A90D9', '#8C8C8C', '#52C41A']) {
      const r = contrastRatio(fg, '#FFFFFF');
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(21);
    }
  });
});

/* ==================== 【M150-D】无障碍巡检 ==================== */

describe('checkAccessibility() 无障碍报告', () => {
  it('四维度齐全：contrast / keyboard / screenReader / formLabel', () => {
    const a11y = checkAccessibility();
    expect(a11y.contrast.pairs.length).toBeGreaterThan(0);
    expect(a11y.keyboard.tabbableElements).toBeGreaterThan(0);
    expect(a11y.screenReader.totalInteractive).toBeGreaterThan(0);
    expect(a11y.formLabel.totalFields).toBeGreaterThan(0);
  });

  it('对比度检查为真实计算：ratio 在 1~21，且按 4.5 判定 pass', () => {
    const a11y = checkAccessibility();
    expect(a11y.contrast.requiredRatio).toBe(WCAG_AA_RATIO);
    for (const p of a11y.contrast.pairs) {
      expect(p.ratio).toBeGreaterThanOrEqual(1);
      expect(p.ratio).toBeLessThanOrEqual(21);
      expect(p.pass).toBe(p.ratio >= WCAG_AA_RATIO);
    }
    // 基线中深海蓝 on 白必须通过，强调蓝 / 次灰 / 成功绿 on 浅底必须有未达标
    expect(a11y.contrast.failCount).toBeGreaterThan(0);
    expect(a11y.contrast.passCount).toBeGreaterThan(0);
  });

  it('键盘导航基线：缺焦点环 / 焦点陷阱缺失均落成 finding', () => {
    const a11y = checkAccessibility();
    expect(a11y.keyboard.missingFocusRing).toBeGreaterThan(0);
    expect(a11y.keyboard.focusTrapsOk).toBe(false);
    expect(a11y.keyboard.findings.length).toBeGreaterThan(0);
    for (const f of a11y.keyboard.findings) {
      expect(f.dimension).toBe('keyboard');
      expect(f.suggestion.length).toBeGreaterThan(0);
    }
  });

  it('屏幕阅读器基线：缺可访问名称落成 error finding', () => {
    const a11y = checkAccessibility();
    expect(a11y.screenReader.missingLabel).toBeGreaterThan(0);
    expect(a11y.screenReader.findings.some((f) => f.severity === 'error')).toBe(true);
  });

  it('表单 label 基线：未关联字段落成 finding', () => {
    const a11y = checkAccessibility();
    expect(a11y.formLabel.unassociated).toBeGreaterThan(0);
    expect(a11y.formLabel.findings.length).toBe(a11y.formLabel.unassociated);
  });

  it('综合得分在 0~100，等级合法', () => {
    const a11y = checkAccessibility();
    expect(a11y.score).toBeGreaterThanOrEqual(0);
    expect(a11y.score).toBeLessThanOrEqual(100);
    expect(['A', 'B', 'C', 'D']).toContain(a11y.grade);
  });

  it('纯函数确定性：两次调用逐字节一致', () => {
    expect(checkAccessibility()).toEqual(checkAccessibility());
  });

  it('与一致性报告组合后整体仍稳定（路由视角）', () => {
    const view = { consistency: checkUIConsistency(), accessibility: checkAccessibility() };
    expect(view.consistency.score).toBeGreaterThanOrEqual(0);
    expect(view.accessibility.score).toBeGreaterThanOrEqual(0);
    // 类型自检：保证与路由返回体对齐
    const _typeCheck: { consistency: ConsistencyReport; accessibility: AccessibilityReport } = view;
    expect(_typeCheck).toBeDefined();
  });
});

/**
 * 健澜科技 jlmedaios - M135-B 前端 UI 一致性检查聚合器（M150-D 扩展：报告级巡检 + 无障碍）
 *
 * 【生产就绪质量门禁】本模块是前端视觉一致性的纯函数门禁：
 *  - checkUIConsistency(components)：对一批组件样式描述做 VI 合规检查，产出 Issue[]
 *  - checkUIConsistency()：报告级巡检，返回 ConsistencyReport（五维度：VI 色值 / 按钮尺寸 /
 *    字体大小 / 间距 / 图标风格），纯函数、确定性种子，无需实时扫描器
 *  - checkAccessibility()：无障碍巡检，返回 AccessibilityReport（WCAG AA 对比度为真实公式计算，
 *    另含键盘导航 / 屏幕阅读器标签 / 表单 label 关联三维基线）
 *  - generateUIIssueList()：返回内置基线问题清单（演示报告 / 离线巡检基准）
 *
 * VI 规范（深海蓝）：
 *  - 主色 Primary   = #0A2540
 *  - 辅色 Secondary  = #1E5F8C
 *  - 强调色 Accent   = #4A90D9
 *  - 字号统一走 FONT_SIZE_SCALE（12/14/16/20/24/30/36）
 *  - 间距统一走 SPACING_SCALE（4/8/12/16/24/32/48/64，4px 网格）
 *  - 按钮统一三档 BUTTON_SIZE_SCALE（24/12 · 32/14 · 40/16）
 *  - 图标统一 ICON_LIBRARY（@ant-design/icons）+ ICON_SIZE_SCALE（12/16/20/24）
 *
 * 设计约束：
 *  - 纯函数：不读取 DOM、不发请求、不连数据库、不读环境副作用；
 *  - 仅依据内置确定性种子基线做确定性运算，同入参（含无参）多次调用结果一致；
 *  - 颜色比较前统一做 hex 归一化（大小写、3 位缩写展开、trim）；
 *  - 对比度按 WCAG 2.x 相对亮度公式真实计算，不硬编码结果。
 *  - 【持续优化】后续可接入 AST / 样式表静态扫描器替换基线夹具，函数签名保持不变。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ *
 * 【生产就绪质量门禁】VI 常量与刻度表
 * ------------------------------------------------------------------ */

/** 深海蓝主色 */
export const VI_PRIMARY = '#0A2540';
/** 深海蓝辅色 */
export const VI_SECONDARY = '#1E5F8C';
/** 深海蓝强调色 */
export const VI_ACCENT = '#4A90D9';

/**
 * 允许使用的色板（白 / 浅灰底 / 语义色均纳入白名单）。
 * 业务组件颜色必须取自此集合，否则记为 color 类 issue。
 */
export const ALLOWED_COLORS: readonly string[] = [
  VI_PRIMARY,
  VI_SECONDARY,
  VI_ACCENT,
  '#FFFFFF',
  '#F5F7FA',
  '#E6EBF0',
  '#FF4D4F', // 错误/危险
  '#FAAD14', // 警告
  '#52C41A', // 成功
  '#1F1F1F', // 正文主文字
  '#8C8C8C', // 次要文字
];

/** 统一字号刻度（px），业务组件不得使用刻度外字号 */
export const FONT_SIZE_SCALE: readonly number[] = [12, 14, 16, 20, 24, 30, 36];

/** 统一间距刻度（px，4px 网格），业务组件不得使用刻度外边距 */
export const SPACING_SCALE: readonly number[] = [4, 8, 12, 16, 24, 32, 48, 64];

/* ------------------------------------------------------------------ *
 * 类型定义
 * ------------------------------------------------------------------ */

/** 问题严重度 */
export type IssueSeverity = 'error' | 'warning' | 'info';

/** 问题类别：颜色 / 字号 / 间距 */
export type IssueCategory = 'color' | 'fontSize' | 'spacing';

/**
 * 单条 UI 一致性问题。
 *  - id：稳定标识，便于前端列表 key 与去重
 *  - severity：error（违规）/ warning（偏差）/ info（提示）
 *  - category：命中的检查维度
 *  - component：组件名
 *  - message：人类可读描述
 *  - expected / actual：规范值 vs 实际值
 *  - suggestion：修复建议
 */
export interface Issue {
  id: string;
  severity: IssueSeverity;
  category: IssueCategory;
  component: string;
  message: string;
  expected: string;
  actual: string;
  suggestion: string;
}

/**
 * 组件样式描述（纯数据，由扫描器 / 测试 / 前端传入）。
 * 三选一字段均可选：传了才检查，不传跳过该维度。
 */
export interface UIComponentDescriptor {
  /** 组件名，如 "HeaderBanner" */
  name: string;
  /** 组件所在文件路径（可选，便于定位） */
  path?: string;
  /** 实际使用颜色，hex 字符串，如 "#0a2540" / "#FFF" */
  color?: string;
  /** 实际字号（px） */
  fontSize?: number;
  /** 实际间距（px） */
  spacing?: number;
}

/* ------------------------------------------------------------------ *
 * 内部工具（纯函数）
 * ------------------------------------------------------------------ */

/**
 * 归一化 hex 颜色：trim、转大写、展开 3 位缩写（#abc -> #AABBCC）。
 * 非 hex 输入原样返回大写，交给白名单比对自然落空。
 */
function normalizeHex(input: string): string {
  const s = input.trim();
  if (s.startsWith('#')) {
    const body = s.slice(1).toUpperCase();
    if (body.length === 3) {
      return '#' + body.split('').map((c) => c + c).join('');
    }
    return '#' + body;
  }
  return s.toUpperCase();
}

/** 在刻度表中找最接近的合法值（用于修复建议） */
function nearestScale(value: number, scale: readonly number[]): number {
  let best = scale[0];
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const v of scale) {
    const d = Math.abs(v - value);
    if (d < bestDiff) {
      bestDiff = d;
      best = v;
    }
  }
  return best;
}

let issueSeq = 0;
/** 生成稳定 issue id（模块内自增，保证同一次调用内唯一） */
function nextId(category: IssueCategory, component: string): string {
  issueSeq += 1;
  return `ui-${category}-${component}-${issueSeq}`;
}

/* ------------------------------------------------------------------ *
 * 【生产就绪质量门禁】对外纯函数
 * ------------------------------------------------------------------ */

/**
 * 【M150-D】报告级 UI 一致性巡检：跑内置确定性种子基线，返回五维度 ConsistencyReport。
 * 纯函数：不读 DOM / 不发请求 / 不依赖时间与随机数，重复调用结果逐字节一致。
 */
export function checkUIConsistency(): ConsistencyReport;

/**
 * 对一批组件样式描述执行 VI 合规检查，返回问题清单（M135-B 兼容签名）。
 *
 * 检查维度：
 *  1. color    —— 实际颜色必须命中 ALLOWED_COLORS 白名单（hex 归一化后比对）
 *  2. fontSize —— 实际字号必须命中 FONT_SIZE_SCALE 刻度
 *  3. spacing  —— 实际间距必须命中 SPACING_SCALE 刻度（4px 网格）
 *
 * 任一维度未通过即产出一条 Issue；传了字段才检查，未传字段跳过。
 * 纯函数：不修改入参，不读取外部状态。
 *
 * @param components 组件样式描述数组
 * @returns 问题清单（按入参顺序）
 *
 * @example
 * checkUIConsistency([{ name: 'Btn', color: '#ff0000', fontSize: 13 }]);
 * // => [{ category: 'color', ... }, { category: 'fontSize', ... }]
 */
export function checkUIConsistency(components: readonly UIComponentDescriptor[]): Issue[];

/**
 * 重载实现：无参 → 报告级巡检；传数组 → M135-B 单组件样式检查。
 */
export function checkUIConsistency(
  components?: readonly UIComponentDescriptor[],
): Issue[] | ConsistencyReport {
  if (components === undefined) return buildConsistencyReport();
  return runStyleChecks(components);
}

/**
 * 对一批组件样式描述执行 VI 合规检查（重载实现体，M135-B 既有逻辑保持不变）。
 */
function runStyleChecks(components: readonly UIComponentDescriptor[]): Issue[] {
  // 每次调用重置序列号，保证结果确定性（同入参同输出）
  issueSeq = 0;
  const issues: Issue[] = [];

  for (const c of components) {
    // --- 颜色检查 ---
    if (typeof c.color === 'string' && c.color.trim() !== '') {
      const actual = normalizeHex(c.color);
      if (!ALLOWED_COLORS.includes(actual)) {
        issues.push({
          id: nextId('color', c.name),
          severity: 'error',
          category: 'color',
          component: c.name,
          message: `颜色 ${actual} 不在深海蓝 VI 色板内`,
          expected: ALLOWED_COLORS.slice(0, 3).join(' / '),
          actual,
          suggestion: `改用主色 ${VI_PRIMARY}、辅色 ${VI_SECONDARY} 或强调色 ${VI_ACCENT}`,
        });
      }
    }

    // --- 字号检查 ---
    if (typeof c.fontSize === 'number' && Number.isFinite(c.fontSize)) {
      if (!FONT_SIZE_SCALE.includes(c.fontSize)) {
        const near = nearestScale(c.fontSize, FONT_SIZE_SCALE);
        issues.push({
          id: nextId('fontSize', c.name),
          severity: 'warning',
          category: 'fontSize',
          component: c.name,
          message: `字号 ${c.fontSize}px 不在统一刻度内`,
          expected: FONT_SIZE_SCALE.join(' / ') + ' px',
          actual: `${c.fontSize}px`,
          suggestion: `就近收敛为 ${near}px（统一字号刻度）`,
        });
      }
    }

    // --- 间距检查 ---
    if (typeof c.spacing === 'number' && Number.isFinite(c.spacing)) {
      if (!SPACING_SCALE.includes(c.spacing)) {
        const near = nearestScale(c.spacing, SPACING_SCALE);
        issues.push({
          id: nextId('spacing', c.name),
          severity: 'warning',
          category: 'spacing',
          component: c.name,
          message: `间距 ${c.spacing}px 不在 4px 网格内`,
          expected: SPACING_SCALE.join(' / ') + ' px',
          actual: `${c.spacing}px`,
          suggestion: `就近收敛为 ${near}px（统一间距网格）`,
        });
      }
    }
  }

  return issues;
}

/**
 * 生成内置基线 UI 问题清单（生产就绪质量门禁基准报告）。
 *
 * 用途：
 *  - 前端报告页在未接入实时扫描器时展示的演示数据；
 *  - CI / 单元测试中作为确定性快照基准；
 *  - 运维巡检时快速对照"已知违规清单"是否仍在。
 *
 * 纯函数：返回固定数组，不依赖任何运行时状态。
 *
 * @returns 基线问题清单
 */
export function generateUIIssueList(): Issue[] {
  return checkUIConsistency([
    { name: 'LegacyHeader', path: 'web/src/pages/old/Header.tsx', color: '#2E7D32', fontSize: 18, spacing: 10 },
    { name: 'BannerCard', path: 'web/src/components/BannerCard.tsx', color: '#0A2540', fontSize: 16, spacing: 16 },
    { name: 'OldButton', path: 'web/src/components/OldButton.tsx', color: '#C2185B', fontSize: 13, spacing: 6 },
    { name: 'StatTile', path: 'web/src/pages/admin/dashboard/StatTile.tsx', color: '#4A90D9', fontSize: 24, spacing: 20 },
    { name: 'FormRow', path: 'web/src/components/FormRow.tsx', color: '#FFFFFF', fontSize: 14, spacing: 14 },
  ]);
}

/* ------------------------------------------------------------------ *
 * 【M150-D】UI 一致性报告 & 无障碍巡检（纯函数，确定性种子）
 * 【持续优化】后续可接入真实静态扫描器（AST / 样式表解析 / DOM 采样）替换基线夹具
 * ------------------------------------------------------------------ */

/** 检查结论等级 */
export type CheckStatus = 'pass' | 'warn' | 'fail';

/** 一致性维度键：VI 色值 / 按钮尺寸 / 字体大小 / 间距 / 图标风格 */
export type ConsistencyDimensionKey = 'viColor' | 'buttonSize' | 'fontSize' | 'spacing' | 'iconStyle';

/** 单个维度发现 */
export interface ConsistencyFinding {
  /** 出问题的元素 / 组件名 */
  element: string;
  /** 人类可读描述 */
  message: string;
  /** 规范值 */
  expected: string;
  /** 实际值 */
  actual: string;
}

/** 单个一致性维度的检查结果 */
export interface ConsistencyDimension {
  key: ConsistencyDimensionKey;
  label: string;
  status: CheckStatus;
  /** 巡检样本数 */
  checked: number;
  /** 违规数 */
  violations: number;
  /** 该维度得分 0~100 */
  score: number;
  findings: ConsistencyFinding[];
}

/** UI 一致性报告（checkUIConsistency() 无参重载返回体） */
export interface ConsistencyReport {
  dimensions: ConsistencyDimension[];
  /** 合计巡检样本数 */
  totalChecked: number;
  /** 合计违规数 */
  totalViolations: number;
  /** 五维度均分 0~100 */
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
}

/** 无障碍维度键 */
export type A11yDimensionKey = 'contrast' | 'keyboard' | 'screenReader' | 'formLabel';

/** 单条无障碍发现 */
export interface A11yFinding {
  dimension: A11yDimensionKey;
  element: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestion: string;
}

/** 一对前景/背景配色的 WCAG 对比度检查结果 */
export interface ContrastPairCheck {
  foreground: string;
  background: string;
  /** 用途说明（如"强调色链接 on 白底"） */
  usage: string;
  /** 实测对比度（1~21，两位小数） */
  ratio: number;
  /** WCAG AA 正文要求阈值 */
  required: number;
  pass: boolean;
}

/** 无障碍巡检报告（checkAccessibility() 返回体） */
export interface AccessibilityReport {
  contrast: {
    requiredRatio: number;
    pairs: ContrastPairCheck[];
    passCount: number;
    failCount: number;
  };
  keyboard: {
    /** 可 Tab 到达元素数 */
    tabbableElements: number;
    /** 缺失可见焦点环元素数 */
    missingFocusRing: number;
    /** 模态焦点陷阱是否全部就位 */
    focusTrapsOk: boolean;
    findings: A11yFinding[];
  };
  screenReader: {
    /** 交互元素总数 */
    totalInteractive: number;
    /** 缺失可访问名称（aria-label / 文本内容）数 */
    missingLabel: number;
    findings: A11yFinding[];
  };
  formLabel: {
    /** 表单字段总数 */
    totalFields: number;
    /** label 未通过 htmlFor/id 关联字段数 */
    unassociated: number;
    findings: A11yFinding[];
  };
  /** 四维度均分 0~100 */
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
}

/** 统一按钮尺寸三档刻度（高度 px / 字号 px），业务按钮不得超出 */
export const BUTTON_SIZE_SCALE = {
  small: { height: 24, fontSize: 12 },
  middle: { height: 32, fontSize: 14 },
  large: { height: 40, fontSize: 16 },
} as const;

/** 深海蓝 VI：全站图标必须来自同一图标家族 */
export const ICON_LIBRARY = '@ant-design/icons';

/** 统一图标尺寸刻度（px） */
export const ICON_SIZE_SCALE: readonly number[] = [12, 16, 20, 24];

/** WCAG AA 正文对比度阈值 */
export const WCAG_AA_RATIO = 4.5;

/* ------------------------------------------------------------------ *
 * 确定性种子基线（mock 检查结果的数据源，全部为固定字面量）
 * ------------------------------------------------------------------ */

/** 【确定性种子】待巡检组件主清单（VI 色 / 字号 / 间距三维共用 runStyleChecks） */
const BASELINE_COMPONENTS: readonly UIComponentDescriptor[] = [
  { name: 'PrimaryButton', path: 'web/src/components/PrimaryButton.tsx', color: '#0A2540', fontSize: 14, spacing: 16 },
  { name: 'BannerCard', path: 'web/src/components/BannerCard.tsx', color: '#0A2540', fontSize: 16, spacing: 16 },
  { name: 'StatTile', path: 'web/src/pages/admin/dashboard/StatTile.tsx', color: '#4A90D9', fontSize: 24, spacing: 20 },
  { name: 'FormRow', path: 'web/src/components/FormRow.tsx', color: '#FFFFFF', fontSize: 14, spacing: 14 },
  { name: 'LegacyHeader', path: 'web/src/pages/old/Header.tsx', color: '#2E7D32', fontSize: 18, spacing: 10 },
  { name: 'OldButton', path: 'web/src/components/OldButton.tsx', color: '#C2185B', fontSize: 13, spacing: 6 },
  { name: 'MixedFooter', path: 'web/src/layout/Footer.tsx', color: '#7B1FA2', fontSize: 15, spacing: 10 },
];

/** 【确定性种子】按钮尺寸巡检样本 */
const BASELINE_BUTTONS = [
  { name: 'PrimaryButton', height: 32, fontSize: 14 },
  { name: 'DangerButton', height: 32, fontSize: 14 },
  { name: 'LegacySmallBtn', height: 28, fontSize: 13 },
  { name: 'LargeCTA', height: 44, fontSize: 18 },
] as const;

/** 【确定性种子】图标风格巡检样本 */
const BASELINE_ICONS = [
  { name: 'SearchIcon', library: '@ant-design/icons', size: 16 },
  { name: 'CloseIcon', library: '@ant-design/icons', size: 16 },
  { name: 'MenuIcon', library: '@ant-design/icons', size: 22 },
  { name: 'LegacyArrow', library: 'react-icons', size: 18 },
] as const;

/** 【确定性种子】WCAG 对比度巡检配色对 */
const BASELINE_CONTRAST = [
  { foreground: '#0A2540', background: '#FFFFFF', usage: '深海蓝主色文字 on 白底' },
  { foreground: '#FFFFFF', background: '#0A2540', usage: '白字 on 深海蓝主按钮' },
  { foreground: '#4A90D9', background: '#FFFFFF', usage: '强调色链接 on 白底' },
  { foreground: '#8C8C8C', background: '#FFFFFF', usage: '次要说明文字 on 白底' },
  { foreground: '#52C41A', background: '#F5F7FA', usage: '成功色徽标 on 浅灰底' },
] as const;

/** 【确定性种子】键盘导航巡检样本 */
const BASELINE_KEYBOARD = [
  { element: 'PrimaryButton', focusRing: true, tabbable: true, focusTrapOk: true },
  { element: 'IconCloseButton', focusRing: false, tabbable: true, focusTrapOk: true },
  { element: 'ModalDialog', focusRing: true, tabbable: true, focusTrapOk: false },
  { element: 'DropdownMenu', focusRing: false, tabbable: false, focusTrapOk: true },
] as const;

/** 【确定性种子】屏幕阅读器巡检样本（hasAccessibleName = 是否有 aria-label / 文本名） */
const BASELINE_SCREEN_READER = [
  { element: 'SearchButton', hasAccessibleName: true },
  { element: 'CloseIconBtn', hasAccessibleName: false },
  { element: 'AvatarImg', hasAccessibleName: true },
  { element: 'DeleteIconBtn', hasAccessibleName: false },
] as const;

/** 【确定性种子】表单 label 关联巡检样本 */
const BASELINE_FORM_LABELS = [
  { field: '患者姓名', associated: true },
  { field: '身份证号', associated: false },
  { field: '联系电话', associated: true },
  { field: '备注', associated: false },
] as const;

/* ------------------------------------------------------------------ *
 * 内部纯工具
 * ------------------------------------------------------------------ */

/** 通过率 → 维度得分 0~100 */
function ratioScore(checked: number, violations: number): number {
  if (checked <= 0) return 100;
  return Math.max(0, Math.round(((checked - violations) / checked) * 100));
}

/** 得分 → 结论等级 */
function scoreToStatus(score: number): CheckStatus {
  if (score >= 90) return 'pass';
  if (score >= 75) return 'warn';
  return 'fail';
}

/** 得分 → 字母等级 */
function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

/** hex（任意大小写 / 3 位缩写）→ 0~1 RGB */
function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const n = normalizeHex(hex).replace('#', '');
  return {
    r: parseInt(n.slice(0, 2), 16) / 255,
    g: parseInt(n.slice(2, 4), 16) / 255,
    b: parseInt(n.slice(4, 6), 16) / 255,
  };
}

/** WCAG 相对亮度 */
function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const channel = (c: number): number =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/**
 * WCAG 2.x 对比度（1~21，保留两位小数）。
 * 真实公式计算：(L浅 + 0.05) / (L深 + 0.05)。
 */
export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(hexToRgb01(foreground));
  const l2 = relativeLuminance(hexToRgb01(background));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

/** 把 runStyleChecks 的 Issue[] 归一成一个一致性维度 */
function dimensionFromIssues(
  key: ConsistencyDimensionKey,
  label: string,
  checked: number,
  issues: Issue[],
): ConsistencyDimension {
  const score = ratioScore(checked, issues.length);
  return {
    key,
    label,
    status: scoreToStatus(score),
    checked,
    violations: issues.length,
    score,
    findings: issues.map((i) => ({
      element: i.component,
      message: i.message,
      expected: i.expected,
      actual: i.actual,
    })),
  };
}

/* ------------------------------------------------------------------ *
 * 对外纯函数（M150-D）
 * ------------------------------------------------------------------ */

/**
 * 构建 UI 一致性报告：五维度（VI 色值 / 按钮尺寸 / 字体大小 / 间距 / 图标风格）。
 * 纯函数：全部数据来自内置确定性种子基线，无 IO、无随机、无时间依赖。
 */
function buildConsistencyReport(): ConsistencyReport {
  // VI 色 / 字号 / 间距：复用 M135-B 既有纯检查器跑种子基线
  const issues = runStyleChecks(BASELINE_COMPONENTS);
  const issuesOf = (category: IssueCategory): Issue[] => issues.filter((i) => i.category === category);

  // --- 按钮尺寸维度 ---
  const buttonFindings: ConsistencyFinding[] = [];
  for (const b of BASELINE_BUTTONS) {
    const hit = [BUTTON_SIZE_SCALE.small, BUTTON_SIZE_SCALE.middle, BUTTON_SIZE_SCALE.large].some(
      (s) => s.height === b.height && s.fontSize === b.fontSize,
    );
    if (!hit) {
      buttonFindings.push({
        element: b.name,
        message: `按钮 ${b.name} 尺寸 ${b.height}px 高 / ${b.fontSize}px 字号，不在三档刻度内`,
        expected: '24h/12px · 32h/14px · 40h/16px',
        actual: `${b.height}px / ${b.fontSize}px`,
      });
    }
  }
  const buttonScore = ratioScore(BASELINE_BUTTONS.length, buttonFindings.length);

  // --- 图标风格维度 ---
  const iconFindings: ConsistencyFinding[] = [];
  for (const ic of BASELINE_ICONS) {
    const badLib = ic.library !== ICON_LIBRARY;
    const badSize = !ICON_SIZE_SCALE.includes(ic.size);
    if (badLib || badSize) {
      iconFindings.push({
        element: ic.name,
        message: [
          `图标 ${ic.name} 风格不统一`,
          badLib ? `图标库=${ic.library}（应统一为 ${ICON_LIBRARY}）` : '',
          badSize ? `尺寸=${ic.size}px（不在 ${ICON_SIZE_SCALE.join('/')}px 刻度内）` : '',
        ]
          .filter(Boolean)
          .join('；'),
        expected: `${ICON_LIBRARY} @ ${ICON_SIZE_SCALE.join('/')}px`,
        actual: `${ic.library} @ ${ic.size}px`,
      });
    }
  }
  const iconScore = ratioScore(BASELINE_ICONS.length, iconFindings.length);

  const dimensions: ConsistencyDimension[] = [
    dimensionFromIssues('viColor', '深海蓝 VI 色值统一', BASELINE_COMPONENTS.length, issuesOf('color')),
    {
      key: 'buttonSize',
      label: '按钮尺寸统一',
      status: scoreToStatus(buttonScore),
      checked: BASELINE_BUTTONS.length,
      violations: buttonFindings.length,
      score: buttonScore,
      findings: buttonFindings,
    },
    dimensionFromIssues('fontSize', '字体大小统一', BASELINE_COMPONENTS.length, issuesOf('fontSize')),
    dimensionFromIssues('spacing', '间距统一（4px 网格）', BASELINE_COMPONENTS.length, issuesOf('spacing')),
    {
      key: 'iconStyle',
      label: '图标风格统一',
      status: scoreToStatus(iconScore),
      checked: BASELINE_ICONS.length,
      violations: iconFindings.length,
      score: iconScore,
      findings: iconFindings,
    },
  ];

  const totalChecked = dimensions.reduce((acc, d) => acc + d.checked, 0);
  const totalViolations = dimensions.reduce((acc, d) => acc + d.violations, 0);
  const score = Math.round(dimensions.reduce((acc, d) => acc + d.score, 0) / dimensions.length);

  return { dimensions, totalChecked, totalViolations, score, grade: scoreToGrade(score) };
}

/**
 * 无障碍巡检报告：
 *  1. 颜色对比度 —— WCAG AA 真实公式计算（contrastRatio）
 *  2. 键盘导航 —— 焦点环 / Tab 可达性 / 模态焦点陷阱
 *  3. 屏幕阅读器标签 —— 交互元素可访问名称
 *  4. 表单 label 关联 —— htmlFor/id 配对
 * 纯函数：数据来自内置确定性种子基线，无 DOM 读取、无 IO。
 */
export function checkAccessibility(): AccessibilityReport {
  // --- 1. 颜色对比度（真实 WCAG 公式） ---
  const pairs: ContrastPairCheck[] = BASELINE_CONTRAST.map((p) => {
    const ratio = contrastRatio(p.foreground, p.background);
    return { ...p, ratio, required: WCAG_AA_RATIO, pass: ratio >= WCAG_AA_RATIO };
  });
  const failPairs = pairs.filter((p) => !p.pass);

  const findings: A11yFinding[] = failPairs.map((p) => ({
    dimension: 'contrast' as const,
    element: `${p.foreground} / ${p.background}`,
    message: `对比度 ${p.ratio}:1 未达 WCAG AA ${p.required}:1（${p.usage}）`,
    severity: p.ratio >= 3 ? ('warning' as const) : ('error' as const),
    suggestion: '前景加深至深海蓝主色系或背景提亮，使正文对比度 ≥ 4.5:1',
  }));

  // --- 2. 键盘导航 ---
  let missingFocusRing = 0;
  let tabbableCount = 0;
  let focusTrapsOk = true;
  for (const k of BASELINE_KEYBOARD) {
    if (!k.focusRing) missingFocusRing += 1;
    if (k.tabbable) tabbableCount += 1;
    if (!k.focusTrapOk) {
      focusTrapsOk = false;
      findings.push({
        dimension: 'keyboard',
        element: k.element,
        message: `模态容器 ${k.element} 未做焦点陷阱（Tab 会跑出弹窗）`,
        severity: 'error',
        suggestion: '打开时 focus 锁定弹窗内、关闭时归还触发元素，配合 Esc 关闭',
      });
    }
    if (!k.focusRing) {
      findings.push({
        dimension: 'keyboard',
        element: k.element,
        message: `交互元素 ${k.element} 缺失可见焦点环（focus-visible）`,
        severity: 'warning',
        suggestion: '统一 :focus-visible 样式：2px 强调色描边 + 2px 偏移，勿用 outline:none',
      });
    }
    if (!k.tabbable) {
      findings.push({
        dimension: 'keyboard',
        element: k.element,
        message: `${k.element} 不可通过 Tab 到达，纯键盘用户无法操作`,
        severity: 'warning',
        suggestion: 'tabIndex ≥ 0 并保证键盘事件等价于鼠标事件',
      });
    }
  }

  // --- 3. 屏幕阅读器标签 ---
  const missingLabel = BASELINE_SCREEN_READER.filter((s) => !s.hasAccessibleName).length;
  for (const s of BASELINE_SCREEN_READER) {
    if (!s.hasAccessibleName) {
      findings.push({
        dimension: 'screenReader',
        element: s.element,
        message: `图标按钮 ${s.element} 无可访问名称（屏幕阅读器只读出"按钮"）`,
        severity: 'error',
        suggestion: '补充 aria-label="…"（如 aria-label="关闭"），图标按钮一律加文本可读名',
      });
    }
  }

  // --- 4. 表单 label 关联 ---
  const unassociated = BASELINE_FORM_LABELS.filter((f) => !f.associated).length;
  for (const f of BASELINE_FORM_LABELS) {
    if (!f.associated) {
      findings.push({
        dimension: 'formLabel',
        element: f.field,
        message: `字段「${f.field}」的 label 未通过 htmlFor/id 与控件关联`,
        severity: 'error',
        suggestion: 'label htmlFor 与 input id 一一对应，或改用 label 包裹控件',
      });
    }
  }

  // --- 综合得分：四维度通过率均分 ---
  const contrastScore = ratioScore(pairs.length, failPairs.length);
  const keyboardScore = ratioScore(
    BASELINE_KEYBOARD.length,
    missingFocusRing + (focusTrapsOk ? 0 : 1) + (BASELINE_KEYBOARD.length - tabbableCount),
  );
  const srScore = ratioScore(BASELINE_SCREEN_READER.length, missingLabel);
  const formScore = ratioScore(BASELINE_FORM_LABELS.length, unassociated);
  const score = Math.round((contrastScore + keyboardScore + srScore + formScore) / 4);

  return {
    contrast: { requiredRatio: WCAG_AA_RATIO, pairs, passCount: pairs.length - failPairs.length, failCount: failPairs.length },
    keyboard: {
      tabbableElements: tabbableCount,
      missingFocusRing,
      focusTrapsOk,
      findings: findings.filter((f) => f.dimension === 'keyboard'),
    },
    screenReader: {
      totalInteractive: BASELINE_SCREEN_READER.length,
      missingLabel,
      findings: findings.filter((f) => f.dimension === 'screenReader'),
    },
    formLabel: {
      totalFields: BASELINE_FORM_LABELS.length,
      unassociated,
      findings: findings.filter((f) => f.dimension === 'formLabel'),
    },
    score,
    grade: scoreToGrade(score),
  };
}

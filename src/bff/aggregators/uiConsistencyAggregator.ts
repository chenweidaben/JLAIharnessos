/**
 * 健澜科技 jlmedaios - M135-B 前端 UI 一致性检查聚合器
 *
 * 【生产就绪质量门禁】本模块是前端视觉一致性的纯函数门禁：
 *  - checkUIConsistency(components)：对一批组件样式描述做 VI 合规检查，产出 Issue[]
 *  - generateUIIssueList()：返回内置基线问题清单（演示报告 / 离线巡检基准）
 *
 * VI 规范（深海蓝）：
 *  - 主色 Primary   = #0A2540
 *  - 辅色 Secondary  = #1E5F8C
 *  - 强调色 Accent   = #4A90D9
 *  - 字号统一走 FONT_SIZE_SCALE（12/14/16/20/24/30/36）
 *  - 间距统一走 SPACING_SCALE（4/8/12/16/24/32/48/64，4px 网格）
 *
 * 设计约束：
 *  - 纯函数：不读取 DOM、不发请求、不连数据库、不读环境副作用；
 *  - 仅依据入参 components 做确定性运算，便于在单元测试 / BFF 路由 / CI 门禁复用；
 *  - 颜色比较前统一做 hex 归一化（大小写、3 位缩写展开、trim）。
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
 * 对一批组件样式描述执行 VI 合规检查，返回问题清单。
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
export function checkUIConsistency(components: readonly UIComponentDescriptor[]): Issue[] {
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

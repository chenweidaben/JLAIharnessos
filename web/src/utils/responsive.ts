/**
 * 健澜科技 jlmedaios - 移动端响应式适配（M128-A）
 *
 * 响应式断点令牌与布局工具（移动端+性能优化）：
 * - 该文件是断点的「唯一事实来源」，mobile-responsive.css 中的媒体查询
 *   必须与此处数值保持一致；单元测试以本文件为准校验布局切换。
 * - 纯函数、零依赖、无 DOM 监听，便于在 jsdom 中做确定性测试。
 *
 * 适配原则：
 *   手机端（<768px）单列；平板端（768~1023px）双列；桌面端（>=1024px）多列。
 *   导航：手机端底部 Tab / 平板抽屉 / 桌面侧边栏；字号最小 14px。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 */

/** 断点阈值（px），与 mobile-responsive.css 的 @media 一一对应 */
export const BREAKPOINTS = {
  /** 手机：< 768px */
  sm: 576,
  /** 手机/平板分界：768px */
  md: 768,
  /** 平板/桌面分界：1024px */
  lg: 1024,
  xl: 1280,
} as const;

/** 移动端字号下限（适配原则：字号最小 14px） */
export const MIN_FONT_SIZE = 14;

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/** 布局栅格列数类名：手机单列 / 平板双列 / 桌面多列 */
export type LayoutClass = 'jl-layout-single' | 'jl-layout-double' | 'jl-layout-multi';

/** 导航形态：手机底部 Tab / 平板抽屉 / 桌面侧边栏 */
export type NavMode = 'bottom-tab' | 'drawer' | 'sidebar';

/**
 * 按视口宽度判定设备类型。
 * @param width 视口宽度（px）；非法值（NaN/负数）按最窄的手机端兜底，保证安全。
 */
export function getDeviceType(width: number): DeviceType {
  if (!Number.isFinite(width) || width < 0) return 'mobile';
  if (width < BREAKPOINTS.md) return 'mobile';
  if (width < BREAKPOINTS.lg) return 'tablet';
  return 'desktop';
}

/**
 * 布局切换：手机单列 / 平板双列 / 桌面多列。
 * 对应页面根节点 class，CSS 据此切换 grid-template-columns。
 */
export function getLayoutClass(width: number): LayoutClass {
  const device = getDeviceType(width);
  if (device === 'mobile') return 'jl-layout-single';
  if (device === 'tablet') return 'jl-layout-double';
  return 'jl-layout-multi';
}

/** 导航形态切换：手机底部 Tab / 平板抽屉 / 桌面侧边栏常驻 */
export function getNavMode(width: number): NavMode {
  const device = getDeviceType(width);
  if (device === 'mobile') return 'bottom-tab';
  if (device === 'tablet') return 'drawer';
  return 'sidebar';
}

/** 栅格列数：手机 1 列 / 平板 2 列 / 桌面 4 列 */
export function getGridColumns(width: number): number {
  const device = getDeviceType(width);
  if (device === 'mobile') return 1;
  if (device === 'tablet') return 2;
  return 4;
}

/**
 * 字号兜底：任何计算字号不得低于 14px（适配原则）。
 * @param size 期望字号（px）
 */
export function resolveFontSize(size: number): number {
  if (!Number.isFinite(size)) return MIN_FONT_SIZE;
  return Math.max(MIN_FONT_SIZE, Math.round(size));
}

/**
 * 表格是否在小屏折叠为卡片形态：手机端 true（CSS 中 .jl-table-cards 生效）。
 */
export function shouldUseCardTable(width: number): boolean {
  return getDeviceType(width) === 'mobile';
}

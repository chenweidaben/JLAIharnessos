/**
 * 健澜科技数智医院智能体 - 通用 UI 组件统一导出
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

export type { BadgePreset, BadgeProps } from './Badge';
export { Badge, BADGE_PRESET_COLORS, resolveBadgeColors } from './Badge';
export type { ColumnAlign, DataTableProps, TableColumn } from './DataTable';
export { clampRowIndex, DataTable, getPageCount, paginateRows } from './DataTable';
export type { ProgressBarProps, ProgressStatus } from './ProgressBar';
export {
  buildProgressCells,
  clampPercent,
  ProgressBar,
  resolveProgressStatus,
} from './ProgressBar';
export type { TabItem, TabViewProps } from './TabView';
export { nextTabIndex, parseDigitTab, TabView } from './TabView';
export type { BuiltChart, TrendChartProps, TrendSeries } from './TrendChart';
export { buildTrendChart, computeRange, scalePoint, TrendChart } from './TrendChart';

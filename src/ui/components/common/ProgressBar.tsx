/**
 * 健澜科技数智医院智能体 - 进度条
 *
 * 水平文本进度条，支持百分比显示与正常/警告/危险三档颜色，
 * 用于床位使用率、质控率、Token用量等指标展示。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text } from 'ink';
import React from 'react';

import { useThemeColors } from '../../theme';

// ============================================================================
// 纯函数
// ============================================================================

/** 进度条状态 */
export type ProgressStatus = 'normal' | 'warning' | 'danger';

/**
 * 将百分比钳制在 [0, 100]
 * @param value - 原始百分比
 * @returns 钳制后的百分比
 */
export function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

/**
 * 计算进度条格数
 * @param percent - 百分比 (0-100)
 * @param width - 总格数
 * @returns 已填充格数与空格数
 */
export function buildProgressCells(
  percent: number,
  width: number,
): { filled: number; empty: number } {
  const p = clampPercent(percent);
  const filled = Math.round((p / 100) * width);
  return { filled, empty: Math.max(0, width - filled) };
}

/**
 * 根据百分比推导进度状态
 * @param percent - 百分比
 * @param warningThreshold - 警告阈值，默认 80
 * @param dangerThreshold - 危险阈值，默认 95
 * @returns 进度状态
 */
export function resolveProgressStatus(
  percent: number,
  warningThreshold = 80,
  dangerThreshold = 95,
): ProgressStatus {
  const p = clampPercent(percent);
  if (p >= dangerThreshold) return 'danger';
  if (p >= warningThreshold) return 'warning';
  return 'normal';
}

// ============================================================================
// 组件 Props
// ============================================================================

/** ProgressBar 属性 */
export interface ProgressBarProps {
  /** 百分比数值 0-100 */
  value: number;
  /** 总格数宽度，默认 24 */
  width?: number;
  /** 是否显示百分比文字，默认 true */
  showLabel?: boolean;
  /** 进度状态；不传则按阈值自动推导 */
  status?: ProgressStatus;
  /** 标题（左侧说明文字） */
  label?: string;
  /** 填充字符，默认 █ */
  fillChar?: string;
  /** 空格字符，默认 ░ */
  emptyChar?: string;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 水平进度条组件
 *
 * 以方块字符渲染水平进度条，右侧显示百分比。颜色随状态自动切换：
 * 正常(青)、警告(橙)、危险(红)。
 *
 * @example
 * ```tsx
 * <ProgressBar value={76} label="床位使用率" />
 * <ProgressBar value={97} status="danger" />
 * ```
 */
export function ProgressBar({
  value,
  width = 24,
  showLabel = true,
  status,
  label,
  fillChar = '█',
  emptyChar = '░',
}: ProgressBarProps): React.ReactElement {
  const theme = useThemeColors();
  const percent = clampPercent(value);
  const resolved: ProgressStatus = status ?? resolveProgressStatus(percent);
  const { filled, empty } = buildProgressCells(percent, width);

  const barColor =
    resolved === 'danger'
      ? theme.criticalValue
      : resolved === 'warning'
        ? theme.warning
        : theme.chartTeal;

  return (
    <Box flexDirection="row" alignItems="center" gap={1}>
      {label && <Text color={theme.subtle}>{label}</Text>}
      <Text color={barColor}>
        {fillChar.repeat(filled)}
        <Text color={theme.divider}>{emptyChar.repeat(empty)}</Text>
      </Text>
      {showLabel && (
        <Text color={resolved === 'normal' ? theme.text : barColor} bold={resolved !== 'normal'}>
          {percent.toFixed(0)}%
        </Text>
      )}
    </Box>
  );
}

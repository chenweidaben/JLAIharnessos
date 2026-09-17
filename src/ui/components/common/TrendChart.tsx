/**
 * 健澜科技数智医院智能体 - ASCII 趋势图
 *
 * 终端迷你趋势图组件：支持单/多序列折线、异常值标记、时间轴，
 * 用方块/线条字符在终端绘制生命体征与检验指标趋势。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text } from 'ink';
import React from 'react';

import { useThemeColors } from '../../theme';

// ============================================================================
// 纯函数
// ============================================================================

/** 单序列数据 */
export interface TrendSeries {
  /** 序列名称（图例） */
  label: string;
  /** 数据点（按时间顺序） */
  points: number[];
}

/**
 * 将单个数值映射到图表行下标
 * @param value - 数值
 * @param min - 数据最小值
 * @param max - 数据最大值
 * @param height - 图表行数
 * @returns 行下标（0 为最底行）
 */
export function scalePoint(value: number, min: number, max: number, height: number): number {
  if (height <= 1) return 0;
  if (max === min) return Math.floor(height / 2);
  const ratio = (value - min) / (max - min);
  // 行下标从底部（0）向上递增
  const row = Math.round((height - 1) * (1 - ratio));
  if (row < 0) return 0;
  if (row > height - 1) return height - 1;
  return row;
}

/**
 * 计算数据范围
 * @param seriesList - 序列列表
 * @param padding - 上下留白比例，默认 0.1
 * @returns 最小值与最大值
 */
export function computeRange(
  seriesList: TrendSeries[],
  padding = 0.1,
): { min: number; max: number } {
  const all = seriesList.flatMap((s) => s.points);
  if (all.length === 0) return { min: 0, max: 1 };
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  return { min: min - span * padding, max: max + span * padding };
}

/** 图表构建结果 */
export interface BuiltChart {
  /** 逐行渲染文本（不含颜色） */
  lines: string[];
  /** 列数（时间点数量） */
  width: number;
}

/**
 * 构建 ASCII 折线图
 *
 * 每个序列用一个字符绘制，重叠点以序列优先级靠后者覆盖。
 * 异常点用 ● 标记（在该列额外标注）。
 *
 * @param seriesList - 序列列表
 * @param height - 图表行数
 * @param markers - 需标记的列下标（异常点）
 * @returns 图表行文本
 */
export function buildTrendChart(
  seriesList: TrendSeries[],
  height = 6,
  markers: number[] = [],
): BuiltChart {
  const { min, max } = computeRange(seriesList);
  const width = Math.max(1, ...seriesList.map((s) => s.points.length));
  const chars = 'abcdefgh';

  // 初始化画布
  const canvas: string[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ' '),
  );

  seriesList.forEach((series, sIdx) => {
    const ch = chars[sIdx % chars.length];
    series.points.forEach((value, col) => {
      const row = scalePoint(value, min, max, height);
      if (col < width && row >= 0 && row < height) {
        canvas[row][col] = ch;
      }
    });
  });

  // 异常点标记
  markers.forEach((col) => {
    if (col < 0 || col >= width) return;
    for (let row = 0; row < height; row++) {
      if (canvas[row][col] !== ' ') {
        canvas[row][col] = '●';
        break;
      }
    }
  });

  return { lines: canvas.map((r) => r.join('')), width };
}

// ============================================================================
// 组件 Props
// ============================================================================

/** TrendChart 属性 */
export interface TrendChartProps {
  /** 数据序列 */
  series: TrendSeries[];
  /** 图表高度（行数），默认 6 */
  height?: number;
  /** 时间轴标签（底部） */
  timeLabels?: string[];
  /** 异常点列下标 */
  markers?: number[];
  /** 标题 */
  title?: string;
  /** Y 轴最小值（不传自动计算） */
  min?: number;
  /** Y 轴最大值（不传自动计算） */
  max?: number;
  /** 当前值标注 */
  currentValue?: string;
  /** 单位 */
  unit?: string;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * ASCII 趋势图组件
 *
 * 在终端内用字符绘制多序列迷你趋势折线，底部附时间轴与图例。
 * 异常值列以 ● 红色标记。
 *
 * @example
 * ```tsx
 * <TrendChart series={[{ label:'心率', points:[78,82,90,98] }]} timeLabels={['09:00','10:00','11:00','12:00']} />
 * ```
 */
export function TrendChart({
  series,
  height = 6,
  timeLabels = [],
  markers = [],
  title,
  currentValue,
  unit,
}: TrendChartProps): React.ReactElement {
  const theme = useThemeColors();
  const { lines } = buildTrendChart(series, height, markers);

  const chartColors = [theme.chartTeal, theme.chartBlue, theme.chartOrange, theme.chartYellow];

  return (
    <Box flexDirection="column">
      {title && (
        <Box flexDirection="row" gap={1}>
          <Text color={theme.jianlan} bold>
            📈
          </Text>
          <Text color={theme.text} bold>
            {title}
          </Text>
          {currentValue && (
            <Text color={theme.abnormalHigh} bold>
              {currentValue}
              {unit ?? ''}
            </Text>
          )}
        </Box>
      )}
      <Box flexDirection="column">
        {lines.map((line, i) => (
          <Text key={i} color={theme.chartBlue}>
            {line}
          </Text>
        ))}
      </Box>
      {timeLabels.length > 0 && <Text color={theme.inactive}>{timeLabels.join(' ')}</Text>}
      <Box flexDirection="row" gap={2}>
        {series.map((s, i) => (
          <Text key={s.label} color={chartColors[i % chartColors.length]}>
            ● {s.label}
          </Text>
        ))}
        {markers.length > 0 && <Text color={theme.criticalValue}>● 异常点</Text>}
      </Box>
    </Box>
  );
}

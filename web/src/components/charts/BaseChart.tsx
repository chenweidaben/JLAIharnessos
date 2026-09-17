/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * ECharts 基础封装：统一尺寸 / 主题色 / 自适应
 */
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import { jlChartColors, baseTextStyle, baseTooltip } from './theme';

interface BaseChartProps {
  option: EChartsOption;
  height?: number;
  className?: string;
}

export default function BaseChart({ option, height = 320, className }: BaseChartProps) {
  const merged: EChartsOption = {
    color: jlChartColors,
    textStyle: baseTextStyle,
    tooltip: baseTooltip(),
    ...option,
  };
  return (
    <ReactECharts
      option={merged}
      style={{ height, width: '100%' }}
      className={className}
      notMerge
      lazyUpdate
    />
  );
}

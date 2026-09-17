/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 折线图：生命体征趋势
 */
import type { EChartsOption } from 'echarts';

import BaseChart from './BaseChart';

interface SeriesItem {
  name: string;
  data: number[];
}

interface LineChartProps {
  xData: string[];
  series: SeriesItem[];
  height?: number;
  smooth?: boolean;
}

export default function LineChart({ xData, series, height = 320, smooth = true }: LineChartProps) {
  const option: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: xData,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#E8ECF1' } },
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#F0F2F5' } } },
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      smooth,
      data: s.data,
      areaStyle: { opacity: 0.08 },
    })),
  };
  return <BaseChart option={option} height={height} />;
}

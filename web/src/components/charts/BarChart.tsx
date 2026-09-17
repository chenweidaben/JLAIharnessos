/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 柱状图：统计数据 / 科室负载
 */
import type { EChartsOption } from 'echarts';

import BaseChart from './BaseChart';

interface BarChartProps {
  xData: string[];
  series: { name: string; data: number[] }[];
  height?: number;
}

export default function BarChart({ xData, series, height = 320 }: BarChartProps) {
  const option: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: xData, axisLine: { lineStyle: { color: '#E8ECF1' } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#F0F2F5' } } },
    series: series.map((s) => ({ name: s.name, type: 'bar', data: s.data, barMaxWidth: 32 })),
  };
  return <BaseChart option={option} height={height} />;
}

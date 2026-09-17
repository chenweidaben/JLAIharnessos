/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 仪表盘：关键指标
 */
import type { EChartsOption } from 'echarts';

import BaseChart from './BaseChart';

interface GaugeChartProps {
  name: string;
  value: number;
  max?: number;
  height?: number;
}

export default function GaugeChart({ name, value, max = 100, height = 260 }: GaugeChartProps) {
  const option: EChartsOption = {
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max,
        progress: { show: true, width: 14, itemStyle: { color: '#0A4D8C' } },
        axisLine: { lineStyle: { width: 14, color: [[1, '#F0F2F5']] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: true, length: '60%' },
        detail: {
          valueAnimation: true,
          formatter: '{value}',
          fontSize: 24,
          offsetCenter: [0, '20%'],
          color: '#262626',
        },
        title: { show: true, offsetCenter: [0, '55%'], fontSize: 12, color: '#8C8C8C' },
        data: [{ value, name }],
      },
    ],
  };
  return <BaseChart option={option} height={height} />;
}

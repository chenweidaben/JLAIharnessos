/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 饼图：占比分析
 */
import type { EChartsOption } from 'echarts';

import BaseChart from './BaseChart';

interface PieChartProps {
  data: { name: string; value: number }[];
  height?: number;
}

export default function PieChart({ data, height = 320 }: PieChartProps) {
  const option: EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['50%', '46%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data,
      },
    ],
  };
  return <BaseChart option={option} height={height} />;
}

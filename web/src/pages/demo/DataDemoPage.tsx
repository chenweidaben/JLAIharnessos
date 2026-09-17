/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 数据可视化 Demo：4 统计卡片 + 8 种 ECharts 图表（近 30 天 Mock 数据）
 */
import { useEffect, type ReactNode } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import GradientBackground from '@/components/demo/GradientBackground';
import SectionTitle from '@/components/demo/SectionTitle';
import AnimatedCounter from '@/components/demo/AnimatedCounter';
import FadeInOnScroll from '@/components/demo/FadeInOnScroll';
import {
  dataDashboardStats,
  visitTrendData,
  deptHeatmap,
  diseasePie,
  feeStructure,
  drgScatter,
  qualityRadar,
  losTrend,
  doctorWorkload,
} from '@/mock/demoMock';

const PALETTE = [
  '#0A4D8C',
  '#1890FF',
  '#13C2C2',
  '#52C41A',
  '#FAAD14',
  '#F5222D',
  '#722ED1',
  '#EB2F96',
];

function ChartCard({
  title,
  children,
  span = false,
}: {
  title: string;
  children: ReactNode;
  span?: boolean;
}) {
  return (
    <FadeInOnScroll className={span ? 'md:col-span-2' : ''}>
      <div className="h-full rounded-jl bg-white p-4 shadow-card">
        <h4 className="m-0 mb-2 text-sm font-semibold text-[#1A2B45]">{title}</h4>
        {children}
      </div>
    </FadeInOnScroll>
  );
}

export default function DataDemoPage() {
  useEffect(() => {
    document.title = '数据可视化 Demo · 健澜科技';
  }, []);

  // 1. 就诊量趋势
  const visitOpt: EChartsOption = {
    color: PALETTE,
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 50, right: 20, top: 40, bottom: 50 },
    dataZoom: [{ type: 'inside' }],
    xAxis: { type: 'category', data: visitTrendData.days, boundaryGap: false },
    yAxis: { type: 'value' },
    series: [
      { name: '门诊', type: 'line', smooth: true, data: visitTrendData.outpatient },
      { name: '住院', type: 'line', smooth: true, data: visitTrendData.inpatient },
      { name: '急诊', type: 'line', smooth: true, data: visitTrendData.emergency },
    ],
  };

  // 2. 科室负载热力图
  const heatOpt: EChartsOption = {
    tooltip: { position: 'top' },
    grid: { left: 70, right: 20, top: 10, bottom: 60 },
    xAxis: { type: 'category', data: deptHeatmap.hours, splitArea: { show: true } },
    yAxis: { type: 'category', data: deptHeatmap.depts, splitArea: { show: true } },
    visualMap: {
      min: 0,
      max: 90,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: ['#E6F0FB', '#1890FF', '#0A4D8C'] },
    },
    series: [
      {
        type: 'heatmap',
        data: deptHeatmap.data,
        label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.3)' } },
      },
    ],
  };

  // 3. 疾病分布饼图
  const pieOpt: EChartsOption = {
    color: PALETTE,
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { type: 'scroll', bottom: 0 },
    series: [{ type: 'pie', radius: ['40%', '68%'], center: ['50%', '45%'], data: diseasePie }],
  };

  // 4. 费用结构柱状图
  const feeOpt: EChartsOption = {
    color: ['#0A4D8C', '#13C2C2'],
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: feeStructure.categories },
    yAxis: { type: 'value', name: '万元' },
    series: [
      { name: '门诊均次', type: 'bar', data: feeStructure.outpatient },
      { name: '住院均次', type: 'bar', data: feeStructure.inpatient },
    ],
  };

  // 5. DRG 盈亏散点
  const drgOpt: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (p: unknown) => {
        const d = (p as { data: { value: [number, number]; name: string } }).data;
        return `${d.name}<br/>权重: ${d.value[0].toFixed(2)}<br/>费用偏差: ${d.value[1]}%`;
      },
    },
    grid: { left: 50, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'value', name: 'DRG 权重' },
    yAxis: { type: 'value', name: '费用偏差%' },
    series: [
      {
        type: 'scatter',
        symbolSize: 16,
        data: drgScatter.map((d) => ({ name: d.name, value: [d.weight, d.deviation] })),
        itemStyle: {
          color: (p: unknown) => {
            const v = (p as { data: { value: [number, number] } }).data.value[1];
            return v >= 0 ? '#F5222D' : '#52C41A';
          },
        },
      },
    ],
  };

  // 6. 质控雷达
  const radarOpt: EChartsOption = {
    tooltip: {},
    radar: {
      indicator: qualityRadar.indicators.map((n) => ({ name: n, max: 100 })),
    },
    series: [
      {
        type: 'radar',
        areaStyle: { opacity: 0.2 },
        data: [{ value: qualityRadar.values, name: '质控得分' }],
      },
    ],
    color: ['#0A4D8C'],
  };

  // 7. 平均住院日趋势（面积图）
  const losOpt: EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', boundaryGap: false, data: losTrend.months },
    yAxis: { type: 'value', name: '天', min: 6 },
    series: [
      {
        name: '平均住院日',
        type: 'line',
        smooth: true,
        areaStyle: { color: 'rgba(19,194,194,0.25)' },
        lineStyle: { color: '#13C2C2' },
        itemStyle: { color: '#13C2C2' },
        data: losTrend.los,
      },
    ],
  };

  // 8. 医生工作量横向柱状
  const doctorOpt: EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 70, right: 30, top: 10, bottom: 30 },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: [...doctorWorkload.doctors].reverse() },
    series: [
      {
        name: '接诊量',
        type: 'bar',
        data: [...doctorWorkload.visits].reverse(),
        itemStyle: { color: '#1890FF', borderRadius: [0, 4, 4, 0] },
      },
    ],
  };

  return (
    <div>
      <GradientBackground variant="dark" className="pb-10 pt-28 sm:pt-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionTitle
            dark
            title="数据可视化 Demo"
            subtitle="面向管理者的运营驾驶舱，8 类图表实时洞察医院运行（演示 Mock 数据）"
          />
        </div>
      </GradientBackground>

      <section className="bg-[#F5F7FA] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* 统计卡片 */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {dataDashboardStats.map((s, i) => (
              <FadeInOnScroll key={s.label} delay={i * 80}>
                <div className="rounded-jl bg-white p-5 shadow-card">
                  <div className="text-xs text-ink-secondary">{s.label}</div>
                  <div className="mt-2 text-3xl font-bold text-jl-primary">
                    <AnimatedCounter value={s.value} suffix={s.suffix} decimals={s.decimals} />
                  </div>
                  <div className="mt-1 text-xs text-[#52C41A]">较昨日 {s.trend}</div>
                </div>
              </FadeInOnScroll>
            ))}
          </div>

          {/* 图表网格 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ChartCard title="近 30 天就诊量趋势（门诊 / 住院 / 急诊）" span>
              <ReactECharts option={visitOpt} style={{ height: 320, width: '100%' }} notMerge />
            </ChartCard>
            <ChartCard title="科室负载热力图（10 科室 × 8 时段）" span>
              <ReactECharts option={heatOpt} style={{ height: 320, width: '100%' }} notMerge />
            </ChartCard>
            <ChartCard title="疾病分布 TOP10">
              <ReactECharts option={pieOpt} style={{ height: 300, width: '100%' }} notMerge />
            </ChartCard>
            <ChartCard title="费用结构对比（门诊 / 住院均次）">
              <ReactECharts option={feeOpt} style={{ height: 300, width: '100%' }} notMerge />
            </ChartCard>
            <ChartCard title="DRG 盈亏散点（权重 vs 费用偏差）">
              <ReactECharts option={drgOpt} style={{ height: 300, width: '100%' }} notMerge />
            </ChartCard>
            <ChartCard title="质控指标雷达">
              <ReactECharts option={radarOpt} style={{ height: 300, width: '100%' }} notMerge />
            </ChartCard>
            <ChartCard title="平均住院日趋势（月）">
              <ReactECharts option={losOpt} style={{ height: 300, width: '100%' }} notMerge />
            </ChartCard>
            <ChartCard title="医生工作量排行">
              <ReactECharts option={doctorOpt} style={{ height: 300, width: '100%' }} notMerge />
            </ChartCard>
          </div>
        </div>
      </section>
    </div>
  );
}

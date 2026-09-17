/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 工作台仪表盘 - 趋势图表组件（ECharts）
 * 包含：就诊量趋势折线图、科室负载热力图、等待时间柱状图
 */

import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { clsx } from 'clsx';
import type { VisitTrendPoint, DepartmentLoadPoint, WaitingTimePoint } from '@/types/dashboard';
import { timeSlotLabels } from '@/mock/dashboardMock';

// 健澜深海蓝配色
const JIANLAN_BLUE = '#0A4D8C';
const COLOR_OUTPATIENT = '#0A4D8C';
const COLOR_INPATIENT = '#1890FF';
const COLOR_EMERGENCY = '#FA8C16';

type ChartTab = 'visit' | 'load' | 'waiting';
type TimeRange = '7d' | '30d' | '90d';

interface TrendChartsProps {
  visitTrend: VisitTrendPoint[];
  departmentLoad: DepartmentLoadPoint[];
  waitingTimes: WaitingTimePoint[];
}

export const TrendCharts: React.FC<TrendChartsProps> = ({
  visitTrend,
  departmentLoad,
  waitingTimes,
}) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('visit');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  // 根据时间范围裁剪数据
  const trimmedTrend = useMemo(() => {
    const len = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : Math.min(visitTrend.length, 30);
    return visitTrend.slice(-len);
  }, [visitTrend, timeRange]);

  // ========== 就诊量趋势图 ==========
  const visitChartOption = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e5e7eb',
        textStyle: { color: '#374151', fontSize: 12 },
      },
      legend: {
        data: ['门诊', '住院', '急诊'],
        top: 0,
        right: 0,
        icon: 'roundRect',
        itemWidth: 10,
        itemHeight: 4,
        textStyle: { fontSize: 12, color: '#6b7280' },
      },
      grid: { left: 40, right: 16, top: 36, bottom: 28 },
      xAxis: {
        type: 'category',
        data: trimmedTrend.map((d) => d.date),
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#9ca3af', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f3f4f6' } },
        axisLabel: { color: '#9ca3af', fontSize: 11 },
      },
      series: [
        {
          name: '门诊',
          type: 'line',
          smooth: true,
          data: trimmedTrend.map((d) => d.outpatient),
          lineStyle: { width: 2.5, color: COLOR_OUTPATIENT },
          itemStyle: { color: COLOR_OUTPATIENT },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(10,77,140,0.18)' },
                { offset: 1, color: 'rgba(10,77,140,0)' },
              ],
            },
          },
        },
        {
          name: '住院',
          type: 'line',
          smooth: true,
          data: trimmedTrend.map((d) => d.inpatient),
          lineStyle: { width: 2, color: COLOR_INPATIENT },
          itemStyle: { color: COLOR_INPATIENT },
        },
        {
          name: '急诊',
          type: 'line',
          smooth: true,
          data: trimmedTrend.map((d) => d.emergency),
          lineStyle: { width: 2, color: COLOR_EMERGENCY },
          itemStyle: { color: COLOR_EMERGENCY },
        },
      ],
    }),
    [trimmedTrend],
  );

  // ========== 科室负载热力图 ==========
  const heatmapOption = useMemo<EChartsOption>(() => {
    const departments = departmentLoad.map((d) => d.department);
    const heatData: [number, number, number][] = [];
    departmentLoad.forEach((dept, di) => {
      dept.loads.forEach((load, ti) => {
        heatData.push([ti, di, load]);
      });
    });
    return {
      tooltip: {
        position: 'top',
        formatter: (params: unknown) => {
          const p = params as { value: [number, number, number] };
          return `${departments[p.value[1]]} ${timeSlotLabels[p.value[0]]}<br/>负载指数: <b>${p.value[2]}</b>`;
        },
      },
      grid: { left: 70, right: 20, top: 10, bottom: 30 },
      xAxis: {
        type: 'category',
        data: timeSlotLabels,
        splitArea: { show: true },
        axisLabel: { color: '#9ca3af', fontSize: 10 },
      },
      yAxis: {
        type: 'category',
        data: departments,
        splitArea: { show: true },
        axisLabel: { color: '#6b7280', fontSize: 11 },
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: { color: ['#e6f4ff', '#69b1ff', JIANLAN_BLUE, '#062a4d'] },
        textStyle: { color: '#9ca3af', fontSize: 10 },
      },
      series: [
        {
          type: 'heatmap',
          data: heatData,
          label: { show: false },
          emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.3)' } },
        },
      ],
    };
  }, [departmentLoad]);

  // ========== 等待时间柱状图 ==========
  const waitingChartOption = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const p = params as Array<{ name: string; value: number }>;
          return `${p[0].name}<br/>平均等待: <b>${p[0].value} 分钟</b>`;
        },
      },
      grid: { left: 50, right: 16, top: 16, bottom: 40 },
      xAxis: {
        type: 'category',
        data: waitingTimes.map((w) => w.department),
        axisLabel: { color: '#9ca3af', fontSize: 10, rotate: 30 },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
      },
      yAxis: {
        type: 'value',
        name: '分钟',
        nameTextStyle: { color: '#9ca3af', fontSize: 10 },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
        axisLabel: { color: '#9ca3af', fontSize: 11 },
      },
      series: [
        {
          type: 'bar',
          data: waitingTimes.map((w) => ({
            value: w.minutes,
            itemStyle: {
              color: w.minutes > 35 ? '#f5222d' : w.minutes > 25 ? '#fa8c16' : JIANLAN_BLUE,
              borderRadius: [4, 4, 0, 0],
            },
          })),
          barWidth: '45%',
        },
      ],
    }),
    [waitingTimes],
  );

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      {/* 头部：标题 + Tab + 时间范围 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-semibold text-gray-800">运营趋势分析</h3>
        <div className="flex items-center gap-2">
          {/* 图表切换 Tab */}
          <div className="flex rounded-lg bg-gray-100 p-0.5">
            {[
              { key: 'visit' as ChartTab, label: '就诊量' },
              { key: 'load' as ChartTab, label: '科室负载' },
              { key: 'waiting' as ChartTab, label: '等待时间' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  'px-3 py-1 text-xs rounded-md transition-all',
                  activeTab === tab.key
                    ? 'bg-white text-[#0A4D8C] shadow-sm font-medium'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 时间范围选择（仅就诊量图显示） */}
          {activeTab === 'visit' && (
            <div className="flex rounded-lg bg-gray-100 p-0.5">
              {[
                { key: '7d' as TimeRange, label: '近7天' },
                { key: '30d' as TimeRange, label: '近30天' },
                { key: '90d' as TimeRange, label: '近90天' },
              ].map((r) => (
                <button
                  key={r.key}
                  onClick={() => setTimeRange(r.key)}
                  className={clsx(
                    'px-2.5 py-1 text-xs rounded-md transition-all',
                    timeRange === r.key
                      ? 'bg-white text-[#0A4D8C] shadow-sm font-medium'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 图表内容 */}
      <div className="h-[320px]">
        {activeTab === 'visit' && (
          <ReactECharts option={visitChartOption} style={{ height: '100%' }} notMerge />
        )}
        {activeTab === 'load' && (
          <ReactECharts option={heatmapOption} style={{ height: '100%' }} notMerge />
        )}
        {activeTab === 'waiting' && (
          <ReactECharts option={waitingChartOption} style={{ height: '100%' }} notMerge />
        )}
      </div>
    </div>
  );
};

export default TrendCharts;

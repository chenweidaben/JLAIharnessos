/**
 * 健澜科技 jlmedaios - 管理驾驶舱（院长驾驶舱 / 全院数据大屏）
 *
 * 深色主题大屏：深海蓝 VI（#0A2540 底 / #4A90D9 强调），大数字指标卡 + ECharts 近 30 天趋势。
 * 十大核心指标：今日门诊量 / 住院人数 / 手术台数 / 急诊人数 / 平均候诊时间 /
 *               床位使用率 / 药品占比 / 患者满意度 / 医疗质量评分 / 系统智能度。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无全院运营数据）。
 * 仅 admin 可见（接口层 requireRole('admin') 强制）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Spin, Tag } from 'antd';
import { DashboardOutlined, ReloadOutlined } from '@ant-design/icons';
import type { EChartsOption } from 'echarts';

import { usePageTitle } from '@/hooks';
import BaseChart from '@/components/charts/BaseChart';

/** 与 BFF buildHospitalDashboard 输出对齐 */
type MetricStatus = 'good' | 'warn' | 'danger';

interface DashboardMetric {
  key: string;
  title: string;
  value: number;
  unit: string;
  status: MetricStatus;
  detail: string;
}

interface DashboardTrend {
  dates: string[];
  outpatient: number[];
  inpatient: number[];
  satisfaction: number[];
}

interface DashboardView {
  metrics: DashboardMetric[];
  trend: DashboardTrend;
  demo: boolean;
  generatedAt: string;
}

/** 深海蓝 VI 色板（深色大屏） */
const VI = {
  bg: '#0A2540', // 主底色：深海蓝
  bgSoft: '#0d3057',
  panel: 'rgba(255,255,255,0.05)',
  panelBorder: 'rgba(74,144,217,0.28)',
  accent: '#4A90D9', // 强调色
  text: '#E6F0FF',
  sub: 'rgba(207,227,255,0.66)',
} as const;

/** 深色大屏下的健康度配色 */
const STATUS_COLOR: Record<MetricStatus, string> = {
  good: '#2ECC8F',
  warn: '#F0B35A',
  danger: '#F06A5E',
};
const STATUS_TEXT: Record<MetricStatus, string> = {
  good: '正常',
  warn: '预警',
  danger: '超标',
};

/** 大数字指标卡（深色） */
function MetricCard({ metric }: { metric: DashboardMetric }) {
  const color = STATUS_COLOR[metric.status];
  return (
    <div
      className="p-4"
      style={{
        height: '100%',
        borderRadius: 12,
        background: VI.panel,
        border: `1px solid ${VI.panelBorder}`,
        borderTop: `4px solid ${color}`,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div className="flex items-start justify-between">
        <span style={{ color: VI.sub, fontSize: 14 }}>{metric.title}</span>
        <Tag color={metric.status === 'good' ? 'success' : metric.status === 'warn' ? 'warning' : 'error'}>
          {STATUS_TEXT[metric.status]}
        </Tag>
      </div>
      {/* 大字号主数值（40px，满足大屏远读） */}
      <div
        className="mt-2 font-bold"
        style={{ fontSize: 40, lineHeight: 1.1, color: '#fff', fontVariantNumeric: 'tabular-nums' }}
      >
        {metric.value}
        <span className="ml-2" style={{ fontSize: 15, fontWeight: 500, color }}>
          {metric.unit}
        </span>
      </div>
      <div className="mt-3" style={{ color: VI.sub, fontSize: 12 }}>
        {metric.detail}
      </div>
    </div>
  );
}

/** 组装近 30 天三线趋势 ECharts option（深色） */
function useTrendOption(trend: DashboardTrend | null): EChartsOption | null {
  return useMemo(() => {
    if (!trend || !trend.dates || trend.dates.length === 0) return null;
    return {
      backgroundColor: 'transparent',
      color: ['#4A90D9', '#2BC5C5', '#F2C14E'],
      textStyle: { color: VI.sub },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,37,64,0.92)', borderColor: VI.accent, textStyle: { color: '#fff' } },
      legend: {
        data: ['门诊量', '在院人数', '满意度'],
        top: 0,
        textStyle: { color: VI.sub },
      },
      grid: { left: 48, right: 24, top: 40, bottom: 32 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: trend.dates,
        axisLine: { lineStyle: { color: 'rgba(74,144,217,0.4)' } },
        axisLabel: { color: VI.sub },
      },
      yAxis: [
        {
          type: 'value',
          name: '人次/人',
          nameTextStyle: { color: VI.sub },
          splitLine: { lineStyle: { color: 'rgba(74,144,217,0.12)' } },
          axisLabel: { color: VI.sub },
        },
        {
          type: 'value',
          name: '满意度%',
          min: 80,
          max: 100,
          nameTextStyle: { color: VI.sub },
          splitLine: { show: false },
          axisLabel: { color: VI.sub },
        },
      ],
      series: [
        { name: '门诊量', type: 'line', smooth: true, symbol: 'none', data: trend.outpatient },
        { name: '在院人数', type: 'line', smooth: true, symbol: 'none', data: trend.inpatient },
        { name: '满意度', type: 'line', smooth: true, symbol: 'none', yAxisIndex: 1, data: trend.satisfaction },
      ],
    };
  }, [trend]);
}

export default function AdminDashboardPage() {
  usePageTitle('院长驾驶舱');
  const [data, setData] = useState<DashboardView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/dashboard');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as DashboardView);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const trendOption = useTrendOption(data?.trend ?? null);
  const metrics = data?.metrics ?? [];
  const allZero = metrics.length > 0 && metrics.every((m) => m.value === 0);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(160deg, ${VI.bg} 0%, ${VI.bgSoft} 100%)`,
        padding: 24,
      }}
    >
      {/* 大屏头部 */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3" style={{ color: '#fff' }}>
          <DashboardOutlined style={{ fontSize: 28, color: VI.accent }} />
          <div>
            <h2 className="m-0" style={{ fontSize: 24, fontWeight: 700 }}>
              院长驾驶舱 · 全院数据大屏
            </h2>
            <p className="m-0 mt-1" style={{ color: VI.sub, fontSize: 13 }}>
              十大核心指标 · 近 30 天运行趋势 · 健澜深海蓝 VI · 仅 admin 可见
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data?.demo && <Tag color="blue">演示数据</Tag>}
          <button
            type="button"
            onClick={() => void load()}
            className="ant-btn"
            style={{
              background: 'rgba(74,144,217,0.18)',
              border: `1px solid ${VI.accent}`,
              color: '#fff',
            }}
          >
            <ReloadOutlined /> 刷新
          </button>
        </div>
      </div>

      {/* loading 态 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" tip="正在汇聚全院运营数据…" />
        </div>
      )}

      {/* error 态 */}
      {!loading && error && (
        <div
          className="p-5"
          style={{
            borderRadius: 12,
            background: 'rgba(240,106,94,0.12)',
            border: '1px solid rgba(240,106,94,0.5)',
            color: '#ffd9d5',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>驾驶舱数据加载失败</div>
          <div style={{ marginBottom: 12 }}>{error}</div>
          <button
            type="button"
            onClick={() => void load()}
            className="ant-btn ant-btn-danger"
          >
            <ReloadOutlined /> 重试
          </button>
        </div>
      )}

      {/* empty 态 */}
      {!loading && !error && (metrics.length === 0 || allZero) && (
        <div
          className="p-10"
          style={{
            textAlign: 'center',
            borderRadius: 12,
            background: VI.panel,
            border: `1px dashed ${VI.panelBorder}`,
            color: VI.sub,
          }}
        >
          暂无全院运营数据。业务系统接入后将自动汇聚展示。
        </div>
      )}

      {/* 正常渲染 */}
      {!loading && !error && metrics.length > 0 && !allZero && (
        <>
          {/* 十大指标卡：一行 5 张（xl），共两行 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            {metrics.map((m) => (
              <MetricCard key={m.key} metric={m} />
            ))}
          </div>

          {/* 近 30 天趋势 */}
          <div
            className="mt-5 p-4"
            style={{
              borderRadius: 12,
              background: VI.panel,
              border: `1px solid ${VI.panelBorder}`,
            }}
          >
            <div className="mb-2" style={{ color: VI.text, fontWeight: 600 }}>
              近 30 天运行趋势
              <span className="ml-2" style={{ fontWeight: 400, color: VI.sub, fontSize: 12 }}>
                门诊量 / 在院人数 / 患者满意度
              </span>
            </div>
            {trendOption ? (
              <BaseChart option={trendOption} height={340} />
            ) : (
              <div style={{ textAlign: 'center', color: VI.sub, padding: 40 }}>暂无趋势数据</div>
            )}
          </div>
        </>
      )}

      {/* 版权 */}
      <div className="mt-6 text-center" style={{ color: 'rgba(207,227,255,0.4)', fontSize: 12 }}>
        © 2026 杭州健澜科技有限公司 · 管理驾驶舱
      </div>
    </div>
  );
}

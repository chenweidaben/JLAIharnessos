/**
 * 健澜科技 jlmedaios - 全院数据驾驶舱（院长版）
 *
 * 大屏友好：大字号（主数值 44px+）、高对比、深海蓝 VI。
 * 八大核心指标卡：门诊量 / 住院量 / 手术量 / 床位使用率 / DRG 结余 /
 *                  病历合格率 / 抗菌药强度 / 患者满意度；下方 ECharts 24h 趋势折线。
 *
 * 深海蓝 VI：主色 #0A2540（深蓝）、辅色 #1E5F8C、强调色 #4A90D9。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useMemo } from 'react';
import { Alert, Col, Empty, Row, Skeleton, Tag, Watermark } from 'antd';
import {
  HomeOutlined,
  MedicineBoxOutlined,
  TeamOutlined,
  AccountBookOutlined,
  SafetyCertificateOutlined,
  ExperimentOutlined,
  ScissorOutlined,
  HeartOutlined,
  ReloadOutlined,
  DashboardOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import type { EChartsOption } from 'echarts';

import { usePageTitle } from '@/hooks';
import { useCeoBoardStore } from '@/store/ceoBoardStore';
import BaseChart from '@/components/charts/BaseChart';
import type { CeoDashboardView, CeoMetric, CeoMetricStatus } from '@/services/api/ceoDashboard';

const watermarkText = ['健澜科技', '全院数据驾驶舱', 'jlmedaios'];

/** 深海蓝 VI 色板 */
const JL = {
  navy: '#0A2540', // 主色：深蓝
  blue: '#1E5F8C', // 辅色
  accent: '#4A90D9', // 强调色
} as const;

/** 健康度高对比配色 */
const STATUS_COLOR: Record<CeoMetricStatus, string> = {
  good: '#1E8E5A', // 正常-绿
  warn: '#E8A33D', // 预警-橙
  danger: '#D54941', // 超标-红
};
const STATUS_TEXT: Record<CeoMetricStatus, string> = {
  good: '正常',
  warn: '预警',
  danger: '超标',
};

const METRIC_ICON: Record<CeoMetric['key'], ReactNode> = {
  outpatientDaily: <MedicineBoxOutlined />,
  inpatientDaily: <TeamOutlined />,
  surgeryDaily: <ScissorOutlined />,
  bedOccupancy: <HomeOutlined />,
  drgSettlement: <AccountBookOutlined />,
  qcPassRate: <SafetyCertificateOutlined />,
  antibioticUse: <ExperimentOutlined />,
  patientSatisfaction: <HeartOutlined />,
};

interface MetricCardProps {
  metric: CeoMetric;
}

/** 院长版大字号指标卡：高对比数值 + 状态条 */
function MetricCard({ metric }: MetricCardProps) {
  const statusColor = STATUS_COLOR[metric.status];
  return (
    <div className="jl-card p-4" style={{ borderTop: `5px solid ${statusColor}`, height: '100%' }}>
      <div className="flex items-start justify-between">
        <div className="text-base" style={{ color: 'rgba(10,37,64,0.65)' }}>
          {metric.title}
        </div>
        <Tag
          color={metric.status === 'good' ? 'success' : metric.status === 'warn' ? 'warning' : 'error'}
          style={{ margin: 0 }}
        >
          {STATUS_TEXT[metric.status]}
        </Tag>
      </div>

      {/* 大字号主数值（44px，满足 24px+ 大屏可读） */}
      <div
        className="mt-2 font-bold"
        style={{ fontSize: 40, lineHeight: 1.1, color: JL.navy, fontVariantNumeric: 'tabular-nums' }}
      >
        {metric.value}
        <span className="ml-2" style={{ fontSize: 16, fontWeight: 500, color: statusColor }}>
          {metric.unit}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className="flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            color: '#fff',
            fontSize: 16,
            background: `linear-gradient(135deg, ${JL.blue} 0%, ${JL.accent} 100%)`,
          }}
        >
          {METRIC_ICON[metric.key]}
        </span>
        <span className="text-xs" style={{ color: 'rgba(10,37,64,0.55)' }}>
          {metric.detail}
        </span>
      </div>
    </div>
  );
}

/** 组装 24h 多线趋势 ECharts option（门诊 / 住院 / 手术） */
function useTrendOption(board: CeoDashboardView | null): EChartsOption | null {
  return useMemo(() => {
    const trend = board?.trend ?? [];
    if (trend.length === 0) return null;
    return {
      color: ['#0A4D8C', '#13C2C2', '#FAAD14'],
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: ['门诊量', '住院量', '手术量'],
        top: 0,
        textStyle: { color: 'rgba(10,37,64,0.75)' },
      },
      grid: { left: 48, right: 24, top: 40, bottom: 32 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: trend.map((p) => p.hour),
        axisLine: { lineStyle: { color: 'rgba(10,37,64,0.3)' } },
        axisLabel: { color: 'rgba(10,37,64,0.65)' },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(10,37,64,0.08)' } },
        axisLabel: { color: 'rgba(10,37,64,0.65)' },
      },
      series: [
        {
          name: '门诊量',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: trend.map((p) => p.outpatient),
        },
        {
          name: '住院量',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: trend.map((p) => p.inpatient),
        },
        {
          name: '手术量',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: trend.map((p) => p.surgery),
        },
      ],
    };
  }, [board]);
}

export default function CeoBoard() {
  usePageTitle('全院数据驾驶舱');
  const { board, loading, error, refresh } = useCeoBoardStore();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const metrics = board?.metrics ?? [];
  const trendOption = useTrendOption(board);

  return (
    <Watermark content={watermarkText}>
      <div>
        {/* 深海蓝 Hero 横幅 */}
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-white"
          style={{
            borderRadius: 8,
            background: `linear-gradient(135deg, ${JL.navy} 0%, ${JL.blue} 55%, ${JL.accent} 100%)`,
            boxShadow: '0 8px 24px rgba(10,37,64,0.25)',
          }}
        >
          <div className="flex items-center gap-3">
            <DashboardOutlined style={{ fontSize: 28, opacity: 0.9 }} />
            <div>
              <h2 className="m-0" style={{ fontSize: 22, fontWeight: 600 }}>
                全院数据驾驶舱
              </h2>
              <p className="m-0 mt-1 text-sm" style={{ opacity: 0.85 }}>
                八大核心指标 · 24h 运行趋势 · 健澜深海蓝 VI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {board?.demo && <Tag color="blue" style={{ margin: 0 }}>演示数据</Tag>}
            <button
              type="button"
              onClick={() => void refresh()}
              className="ant-btn ant-btn-default"
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.35)',
                color: '#fff',
              }}
            >
              <ReloadOutlined /> 刷新
            </button>
          </div>
        </div>

        {/* 三态：loading 骨架屏 / error 报错 / empty 空态 / 正常渲染 */}
        {loading ? (
          <div className="jl-card p-5">
            <Skeleton active paragraph={{ rows: 4 }} title={{ width: '30%' }} />
            <Skeleton active paragraph={{ rows: 6 }} title={false} />
          </div>
        ) : error ? (
          <Alert
            type="error"
            showIcon
            message="驾驶舱数据加载失败"
            description={error}
            action={
              <button type="button" onClick={() => void refresh()} className="ant-btn ant-btn-danger">
                <ReloadOutlined /> 重试
              </button>
            }
          />
        ) : metrics.length === 0 ? (
          <div className="jl-card p-10">
            <Empty description="暂无可视化的运营数据" />
          </div>
        ) : (
          <>
            {/* 八大指标卡：大屏一行 4 张（xl=6），共两行 */}
            <Row gutter={[16, 16]}>
              {metrics.map((m) => (
                <Col xs={24} sm={12} xl={6} key={m.key}>
                  <MetricCard metric={m} />
                </Col>
              ))}
            </Row>

            {/* 24h 趋势折线图（多线：门诊 / 住院 / 手术） */}
            <div className="jl-card mt-4 p-4">
              <div className="mb-2 flex items-center gap-2" style={{ color: JL.navy }}>
                <LineChartOutlined style={{ fontSize: 18, color: JL.blue }} />
                <span className="text-base font-semibold">24h 业务运行趋势</span>
                <span className="text-xs" style={{ color: 'rgba(10,37,64,0.45)' }}>
                  门诊 / 住院 / 手术 逐时分布
                </span>
              </div>
              {trendOption ? (
                <BaseChart option={trendOption} height={340} />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无趋势数据" />
              )}
            </div>
          </>
        )}
      </div>
    </Watermark>
  );
}

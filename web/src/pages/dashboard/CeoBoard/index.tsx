/**
 * 健澜科技 jlmedaios - 院长数据驾驶舱（院长版）
 *
 * 大屏友好：大字号（主数值 44px+）、高对比、深海蓝 VI。
 * 六大核心指标卡：床位使用率 / 日门诊 / 日住院 / DRG 结算 / 质控通过率 / 抗菌药强度。
 *
 * 深海蓝 VI：主色 #0A2540（深蓝）、辅色 #1E5F8C、强调色 #4A90D9。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect } from 'react';
import { Alert, Col, Row, Spin, Tag, Watermark } from 'antd';
import {
  HomeOutlined,
  MedicineBoxOutlined,
  TeamOutlined,
  AccountBookOutlined,
  SafetyCertificateOutlined,
  ExperimentOutlined,
  ReloadOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

import { usePageTitle } from '@/hooks';
import { useCeoBoardStore } from '@/store/ceoBoardStore';
import type { CeoMetric, CeoMetricStatus } from '@/services/api/ceoDashboard';

const watermarkText = ['健澜科技', '院长数据驾驶舱', 'jlmedaios'];

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
  bedOccupancy: <HomeOutlined />,
  outpatientDaily: <MedicineBoxOutlined />,
  inpatientDaily: <TeamOutlined />,
  drgSettlement: <AccountBookOutlined />,
  qcPassRate: <SafetyCertificateOutlined />,
  antibioticUse: <ExperimentOutlined />,
};

interface MetricCardProps {
  metric: CeoMetric;
}

/** 院长版大字号指标卡：高对比数值 + 状态条 */
function MetricCard({ metric }: MetricCardProps) {
  const statusColor = STATUS_COLOR[metric.status];
  return (
    <div
      className="jl-card p-5"
      style={{ borderTop: `5px solid ${statusColor}`, height: '100%' }}
    >
      <div className="flex items-start justify-between">
        <div className="text-base" style={{ color: 'rgba(10,37,64,0.65)' }}>
          {metric.title}
        </div>
        <Tag color={metric.status === 'good' ? 'success' : metric.status === 'warn' ? 'warning' : 'error'} style={{ margin: 0 }}>
          {STATUS_TEXT[metric.status]}
        </Tag>
      </div>

      {/* 大字号主数值（44px，满足 24px+ 大屏可读） */}
      <div
        className="mt-3 font-bold"
        style={{ fontSize: 44, lineHeight: 1.1, color: JL.navy, fontVariantNumeric: 'tabular-nums' }}
      >
        {metric.value}
        <span className="ml-2" style={{ fontSize: 20, fontWeight: 500, color: statusColor }}>
          {metric.unit}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            color: '#fff',
            fontSize: 18,
            background: `linear-gradient(135deg, ${JL.blue} 0%, ${JL.accent} 100%)`,
          }}
        >
          {METRIC_ICON[metric.key]}
        </span>
        <span className="text-sm" style={{ color: 'rgba(10,37,64,0.55)' }}>
          {metric.detail}
        </span>
      </div>
    </div>
  );
}

export default function CeoBoard() {
  usePageTitle('院长数据驾驶舱');
  const { board, loading, error, refresh } = useCeoBoardStore();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const metrics = board?.metrics ?? [];

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
                院长数据驾驶舱
              </h2>
              <p className="m-0 mt-1 text-sm" style={{ opacity: 0.85 }}>
                六大核心指标 · 一屏统览 · 健澜深海蓝 VI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {board?.demo && (
              <Tag color="blue" style={{ margin: 0 }}>演示数据</Tag>
            )}
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

        <Spin spinning={loading}>
          {error ? (
            <Alert type="error" showIcon message="驾驶舱数据加载失败" description={error} />
          ) : (
            <Row gutter={[16, 16]}>
              {metrics.map((m) => (
                <Col xs={24} md={12} xl={8} key={m.key}>
                  <MetricCard metric={m} />
                </Col>
              ))}
            </Row>
          )}
        </Spin>
      </div>
    </Watermark>
  );
}

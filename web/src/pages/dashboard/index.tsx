/**
 * 健澜科技 jlmedaios - 院长驾驶舱/工作台（M91-A，深海蓝 VI 统一）
 *
 * 从真实 PostgreSQL 统计门急诊量、在院、床位、待办、告警、趋势与科室负载。
 * 健康门禁：BFF/DB 不可用时显式 Alert + Watermark，绝不显示假数据。
 * 深海蓝 VI：主色 #0A2540（深蓝）、辅色 #1E5F8C、强调色 #4A90D9。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useState } from 'react';
import { Alert, Col, Row, Spin, Table, Tag, Typography, Watermark } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  TeamOutlined,
  AlertOutlined,
  MedicineBoxOutlined,
  HomeOutlined,
  ReloadOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

import { DataCard, EmptyState } from '@/components/common';
import { LineChart, BarChart, PieChart } from '@/components/charts';
import { usePageTitle } from '@/hooks';
import { useDashboardStatsStore } from '@/store/dashboardStatsStore';
import type { DashboardAlert } from '@/types/dashboardStats';

const watermarkText = ['健澜科技', '院长驾驶舱', 'jlmedaios'];

/** 深海蓝 VI 色板 */
const JL = {
  navy: '#0A2540', // 主色：深蓝
  blue: '#1E5F8C', // 辅色
  accent: '#4A90D9', // 强调色
} as const;

interface StatCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  icon: ReactNode;
  accent: string;
  sub?: string;
}

/** 深海蓝统计卡：顶部强调色条 + 渐变图标块 */
function StatCard({ title, value, suffix, icon, accent, sub }: StatCardProps) {
  return (
    <div
      className="jl-card p-4"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm" style={{ color: 'rgba(10,37,64,0.55)' }}>
            {title}
          </div>
          <div
            className="mt-2 font-semibold"
            style={{ fontSize: 28, lineHeight: 1.2, color: JL.navy }}
          >
            {value}
            {suffix && (
              <span className="ml-1 text-sm font-normal" style={{ color: 'rgba(10,37,64,0.45)' }}>
                {suffix}
              </span>
            )}
          </div>
          {sub && (
            <div className="mt-1 text-xs" style={{ color: 'rgba(10,37,64,0.45)' }}>
              {sub}
            </div>
          )}
        </div>
        <div
          className="flex items-center justify-center text-lg text-white"
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: `linear-gradient(135deg, ${accent} 0%, ${JL.accent} 100%)`,
            boxShadow: '0 4px 10px rgba(10,37,64,0.18)',
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

const alertColumns: ColumnsType<DashboardAlert> = [
  {
    title: '级别',
    dataIndex: 'level',
    width: 80,
    render: (level: DashboardAlert['level']) =>
      level === 'critical' ? <Tag color="red">危急</Tag> : <Tag color="orange">警告</Tag>,
  },
  { title: '告警内容', dataIndex: 'title', ellipsis: true },
  {
    title: '科室',
    dataIndex: 'department',
    width: 120,
    render: (v: string | null) => v ?? '—',
  },
  { title: '时间', dataIndex: 'time', width: 160 },
];

export default function Dashboard() {
  usePageTitle('工作台');
  const {
    stats,
    dbUp,
    healthChecking,
    loading,
    error,
    refresh,
  } = useDashboardStatsStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        await refresh(14);
      } catch {
        // 统计加载失败已写入 store.error，由错误 Alert 展示，不产生未处理拒绝
      } finally {
        setReady(true);
      }
    })();
  }, [refresh]);

  const overview = stats?.overview;
  const trend = stats?.trend ?? [];
  const alerts = stats?.latestAlerts ?? [];

  return (
    <Watermark content={watermarkText}>
      <div>
      {/* 深海蓝 Hero 横幅：标题 + 健康状态 + 刷新 */}
      <div
        className="mb-4 flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-white"
        style={{
          borderRadius: 8,
          background: `linear-gradient(135deg, ${JL.navy} 0%, ${JL.blue} 55%, ${JL.accent} 100%)`,
          boxShadow: '0 8px 24px rgba(10,37,64,0.25)',
        }}
      >
        <div className="flex items-center gap-3">
          <DashboardOutlined style={{ fontSize: 26, opacity: 0.9 }} />
          <div>
            <h2 className="m-0 text-lg font-semibold">院长驾驶舱</h2>
            <p className="m-0 mt-0.5 text-xs" style={{ opacity: 0.85 }}>
              今日运营概览与关键指标（真实数据统计）· 健澜深海蓝 VI
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tag color={dbUp ? 'success' : 'error'} data-testid="dash-health-tag" style={{ margin: 0 }}>
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
          <button
            type="button"
            data-testid="dash-refresh"
            onClick={() => void refresh(14)}
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

      <Spin spinning={!ready || healthChecking || loading}>
        {!dbUp ? (
          <Alert
            data-testid="dash-offline-alert"
            type="error"
            showIcon
            banner
            message="无法连接 BFF 或数据库，院长驾驶舱不可用"
            description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充运营指标。"
          />
        ) : error ? (
          <Alert type="error" showIcon message="统计加载失败" description={error} />
        ) : overview ? (
          <>
            {/* 统计卡片区 */}
            <Row gutter={[16, 16]}>
              <Col xs={12} md={6}>
                <StatCard
                  title="今日门诊"
                  value={overview.todayOutpatient}
                  suffix="人次"
                  icon={<MedicineBoxOutlined />}
                  accent={JL.accent}
                />
              </Col>
              <Col xs={12} md={6}>
                <StatCard
                  title="今日急诊"
                  value={overview.todayEmergency}
                  suffix="人次"
                  icon={<AlertOutlined />}
                  accent={JL.blue}
                />
              </Col>
              <Col xs={12} md={6}>
                <StatCard
                  title="当前在院"
                  value={overview.currentInpatients}
                  suffix="人"
                  icon={<TeamOutlined />}
                  accent={JL.navy}
                  sub={`今日入院 ${overview.todayAdmitted} · 今日出院 ${overview.todayDischarged}`}
                />
              </Col>
              <Col xs={12} md={6}>
                <StatCard
                  title="床位占用率"
                  value={overview.bedOccupancyRate}
                  suffix="%"
                  icon={<HomeOutlined />}
                  accent={JL.blue}
                  sub={`${overview.bedsOccupied}/${overview.bedsTotal} 张 · 空床 ${overview.bedsAvailable}`}
                />
              </Col>
            </Row>

            {/* 图表区 */}
            <Row gutter={[16, 16]} className="mt-4">
              <Col xs={24} lg={16}>
                <div className="jl-card p-4">
                  <h3 className="m-0 mb-2 text-base font-medium" style={{ color: JL.navy }}>
                    近 {trend.length} 天门急诊量趋势
                  </h3>
                  <LineChart
                    xData={trend.map((t) => t.date.slice(5))}
                    series={[
                      { name: '门诊', data: trend.map((t) => t.outpatient) },
                      { name: '急诊', data: trend.map((t) => t.emergency) },
                    ]}
                  />
                </div>
              </Col>
              <Col xs={24} lg={8}>
                <div className="jl-card p-4">
                  <h3 className="m-0 mb-2 text-base font-medium" style={{ color: JL.navy }}>
                    在院科室分布
                  </h3>
                  <PieChart
                    data={(stats?.departmentLoad ?? []).map((d) => ({
                      name: d.department,
                      value: d.inpatients,
                    }))}
                    height={280}
                  />
                </div>
              </Col>
            </Row>

            <Row gutter={[16, 16]} className="mt-4">
              <Col xs={24} lg={14}>
                <div className="jl-card p-4">
                  <h3 className="m-0 mb-2 text-base font-medium" style={{ color: JL.navy }}>
                    近 {trend.length} 天入出院统计
                  </h3>
                  <BarChart
                    xData={trend.map((t) => t.date.slice(5))}
                    series={[
                      { name: '入院', data: trend.map((t) => t.admitted) },
                      { name: '出院', data: trend.map((t) => t.discharged) },
                    ]}
                  />
                </div>
              </Col>
              <Col xs={24} lg={10}>
                <div className="jl-card p-4">
                  <h3 className="m-0 mb-2 text-base font-medium" style={{ color: JL.navy }}>
                    待办事项
                  </h3>
                  <Row gutter={[12, 12]}>
                    <Col span={12}>
                      <DataCard title="待审医嘱" value={overview.pendingOrderReview} suffix="条" />
                    </Col>
                    <Col span={12}>
                      <DataCard title="待审处方" value={overview.pendingPrescriptionReview} suffix="条" />
                    </Col>
                    <Col span={12}>
                      <DataCard
                        title="未处理危急值"
                        value={overview.unresolvedCriticalAlerts}
                        suffix="条"
                      />
                    </Col>
                    <Col span={12}>
                      <DataCard title="可用床位" value={overview.bedsAvailable} suffix="张" />
                    </Col>
                  </Row>
                </div>
              </Col>
            </Row>

            {/* 列表区：最新告警台账（数据来自现有 store，无记录时空状态，不编造接口） */}
            <Row gutter={[16, 16]} className="mt-4">
              <Col span={24}>
                <div className="jl-card p-4">
                  <h3 className="m-0 mb-2 text-base font-medium" style={{ color: JL.navy }}>
                    最新告警台账
                  </h3>
                  {alerts.length ? (
                    <Table<DashboardAlert>
                      rowKey="id"
                      size="small"
                      pagination={false}
                      columns={alertColumns}
                      dataSource={alerts}
                    />
                  ) : (
                    <EmptyState description="暂无最新告警" />
                  )}
                  <Typography.Paragraph className="mt-2 mb-0 text-xs" style={{ color: 'rgba(10,37,64,0.45)' }}>
                    告警数据由实时通道与统计接口汇聚展示，仅呈现真实记录。
                  </Typography.Paragraph>
                </div>
              </Col>
            </Row>
          </>
        ) : null}
      </Spin>
      </div>
    </Watermark>
  );
}

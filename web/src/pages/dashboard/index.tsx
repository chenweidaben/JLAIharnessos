/**
 * 健澜科技 jlmedaios - 院长驾驶舱/工作台（M9-A，真实统计）
 *
 * 从真实 PostgreSQL 统计门急诊量、在院、床位、待办、告警、趋势与科室负载。
 * 健康门禁：BFF/DB 不可用时显式 Alert + Watermark，绝不显示假数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useState } from 'react';
import { Alert, Col, Row, Spin, Tag, Typography, Watermark } from 'antd';
import {
  TeamOutlined,
  AlertOutlined,
  MedicineBoxOutlined,
  HomeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

import { PageContainer, DataCard } from '@/components/common';
import { LineChart, BarChart, PieChart } from '@/components/charts';
import { usePageTitle } from '@/hooks';
import { useDashboardStatsStore } from '@/store/dashboardStatsStore';

const watermarkText = ['健澜科技', '院长驾驶舱', 'jlmedaios'];

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

  return (
    <Watermark content={watermarkText}>
      <PageContainer
        title="院长驾驶舱"
        description="今日运营概览与关键指标（真实数据统计）"
        extra={
          <div className="flex items-center gap-2">
            <Tag color={dbUp ? 'green' : 'red'} data-testid="dash-health-tag">
              {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
            </Tag>
            <button
              type="button"
              className="ant-btn ant-btn-default"
              data-testid="dash-refresh"
              onClick={() => void refresh(14)}
            >
              <ReloadOutlined /> 刷新
            </button>
          </div>
        }
      >
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
            <Alert
              type="error"
              showIcon
              message="统计加载失败"
              description={error}
            />
          ) : overview ? (
            <>
              <Row gutter={[16, 16]}>
                <Col xs={12} md={6}>
                  <DataCard
                    title="今日门诊"
                    value={overview.todayOutpatient}
                    suffix="人次"
                    icon={<MedicineBoxOutlined />}
                  />
                </Col>
                <Col xs={12} md={6}>
                  <DataCard
                    title="今日急诊"
                    value={overview.todayEmergency}
                    suffix="人次"
                    icon={<AlertOutlined />}
                  />
                </Col>
                <Col xs={12} md={6}>
                  <DataCard
                    title="当前在院"
                    value={overview.currentInpatients}
                    suffix="人"
                    icon={<TeamOutlined />}
                  />
                </Col>
                <Col xs={12} md={6}>
                  <DataCard
                    title="床位占用率"
                    value={overview.bedOccupancyRate}
                    suffix="%"
                    icon={<HomeOutlined />}
                    trendLabel={`${overview.bedsOccupied}/${overview.bedsTotal} 张`}
                  />
                </Col>
              </Row>

              <Row gutter={[16, 16]} className="mt-4">
                <Col xs={24} lg={16}>
                  <div className="jl-card p-4">
                    <h3 className="m-0 mb-2 text-base font-medium">
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
                    <h3 className="m-0 mb-2 text-base font-medium">在院科室分布</h3>
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
                    <h3 className="m-0 mb-2 text-base font-medium">
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
                    <h3 className="m-0 mb-2 text-base font-medium">待办与告警</h3>
                    <Row gutter={[12, 12]}>
                      <Col span={12}>
                        <DataCard
                          title="待审医嘱"
                          value={overview.pendingOrderReview}
                          suffix="条"
                        />
                      </Col>
                      <Col span={12}>
                        <DataCard
                          title="待审处方"
                          value={overview.pendingPrescriptionReview}
                          suffix="条"
                        />
                      </Col>
                      <Col span={12}>
                        <DataCard
                          title="未处理危急值"
                          value={overview.unresolvedCriticalAlerts}
                          suffix="条"
                        />
                      </Col>
                      <Col span={12}>
                        <DataCard
                          title="可用床位"
                          value={overview.bedsAvailable}
                          suffix="张"
                        />
                      </Col>
                    </Row>
                    {stats?.latestAlerts?.length ? (
                      <Typography.Paragraph className="mt-3 mb-0 text-xs text-gray-500">
                        最新告警：{stats.latestAlerts[0].title}
                      </Typography.Paragraph>
                    ) : null}
                  </div>
                </Col>
              </Row>
            </>
          ) : null}
        </Spin>
      </PageContainer>
    </Watermark>
  );
}

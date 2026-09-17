/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 科室运营概览：科室信息 + 核心指标 + 床位使用 + 今日动态 + 全院排名
 */
import { useEffect } from 'react';
import { Badge, Col, Progress, Row, Tag, Tooltip } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  ApartmentOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  TeamOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import clsx from 'clsx';

import { PageContainer } from '@/components/common';
import { LineChart } from '@/components/charts';
import { useOperationStore } from '@/store/operationStore';
import type { BedStatus, CoreMetric } from '@/types/operation';

const statusColor: Record<BedStatus, string> = {
  in: '#0A4D8C',
  empty: '#E8ECF1',
  pre_discharge: '#FAAD14',
  isolated: '#F5222D',
};

const statusText: Record<BedStatus, string> = {
  in: '在院',
  empty: '空床',
  pre_discharge: '预出院',
  isolated: '隔离',
};

function MetricCard({ metric }: { metric: CoreMetric }) {
  const isUp = metric.trend >= 0;
  // 方向语义：up_good 升高为好；down_good 降低为好；range 区间最优
  const good =
    metric.direction === 'range'
      ? metric.status === 'good'
      : metric.direction === 'up_good'
        ? isUp
        : !isUp;
  return (
    <div className="jl-card p-4">
      <div className="text-sm text-ink-secondary">{metric.name}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-ink-primary">{metric.value}</span>
        {metric.unit && <span className="text-xs text-ink-secondary">{metric.unit}</span>}
      </div>
      {metric.target != null && (
        <Progress
          percent={Math.min(100, Math.round((Number(metric.value) / metric.target) * 100))}
          size="small"
          showInfo={false}
          strokeColor={
            metric.status === 'good' ? '#52C41A' : metric.status === 'warn' ? '#FAAD14' : '#F5222D'
          }
          className="mt-2"
        />
      )}
      <div
        className={clsx(
          'mt-1 flex items-center gap-1 text-xs',
          good ? 'text-medical-normal' : 'text-medical-critical',
        )}
      >
        {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        <span>{Math.abs(metric.trend)}%</span>
        <span className="text-ink-secondary">同比</span>
      </div>
    </div>
  );
}

export default function DepartmentOverview() {
  const department = useOperationStore((s) => s.department);
  const overview = useOperationStore((s) => s.overview);
  const fetchOverview = useOperationStore((s) => s.fetchOverview);
  const fetchDepartmentInfo = useOperationStore((s) => s.fetchDepartmentInfo);

  useEffect(() => {
    void fetchOverview();
    void fetchDepartmentInfo();
  }, [fetchOverview, fetchDepartmentInfo]);

  const bedCounts = overview.bedUsage.beds.reduce(
    (acc, b) => {
      acc[b.status] += 1;
      return acc;
    },
    { in: 0, empty: 0, pre_discharge: 0, isolated: 0 } as Record<BedStatus, number>,
  );

  return (
    <PageContainer
      title="科室运营概览"
      description={`${department.name} · ${department.address} · 建科于 ${department.establishedYear} 年`}
    >
      {/* 科室基本信息 */}
      <div className="jl-card mb-4 p-4">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={14}>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-jl-primary text-xl text-white">
                <HeartOutlined />
              </div>
              <div>
                <h2 className="m-0 text-lg font-semibold text-ink-primary">{department.name}</h2>
                <p className="m-0 mt-1 text-sm text-ink-secondary">{department.introduction}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span className="text-ink-secondary">
                科主任：<b className="text-ink-primary">{department.director}</b>
              </span>
              <span className="text-ink-secondary">
                护士长：<b className="text-ink-primary">{department.headNurse}</b>
              </span>
              <span className="text-ink-secondary">
                医护：医生 <b className="text-ink-primary">{department.doctorCount}</b> / 护士{' '}
                <b className="text-ink-primary">{department.nurseCount}</b> / 技师{' '}
                <b className="text-ink-primary">{department.technicianCount}</b>
              </span>
            </div>
          </Col>
          <Col xs={24} md={10}>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-jl-primary/5 p-3">
                <div className="text-xs text-ink-secondary">编制床位</div>
                <div className="mt-1 text-xl font-semibold text-jl-primary">
                  {department.bedTotal}
                </div>
              </div>
              <div className="rounded-lg bg-jl-primary/5 p-3">
                <div className="text-xs text-ink-secondary">实际开放</div>
                <div className="mt-1 text-xl font-semibold text-jl-primary">
                  {department.bedOpen}
                </div>
              </div>
              <div className="rounded-lg bg-jl-primary/5 p-3">
                <div className="text-xs text-ink-secondary">在院人数</div>
                <div className="mt-1 text-xl font-semibold text-medical-critical">
                  {department.inPatient}
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* 核心指标卡片 */}
      <Row gutter={[16, 16]}>
        {overview.coreMetrics.map((m) => (
          <Col xs={12} sm={8} md={6} xl={3} key={m.key}>
            <MetricCard metric={m} />
          </Col>
        ))}
      </Row>

      {/* 床位使用 + 今日动态 */}
      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} lg={14}>
          <div className="jl-card h-full p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="m-0 text-base font-medium">
                <ApartmentOutlined className="mr-1 text-jl-primary" />
                床位使用情况
              </h3>
              <div className="flex gap-3 text-xs text-ink-secondary">
                {(Object.keys(statusColor) as BedStatus[]).map((k) => (
                  <span key={k} className="flex items-center gap-1">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ background: statusColor[k] }}
                    />
                    {statusText[k]} {bedCounts[k]}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {overview.bedUsage.beds.map((b) => (
                <Tooltip
                  key={b.bedNo}
                  title={`${b.bedNo} · ${statusText[b.status]}${b.patientName ? ` · ${b.patientName}${b.level && b.level !== '普通' ? `（${b.level}）` : ''}` : ''}`}
                >
                  <div
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-[10px] text-white"
                    style={{ background: statusColor[b.status] }}
                  >
                    {b.status === 'in'
                      ? '入'
                      : b.status === 'empty'
                        ? '空'
                        : b.status === 'pre_discharge'
                          ? '出'
                          : '隔'}
                  </div>
                </Tooltip>
              ))}
            </div>
            <div className="mt-4">
              <div className="mb-1 text-sm text-ink-secondary">
                近 30 天床位使用率趋势（当前 {overview.bedUsage.occupancyRate}%）
              </div>
              <LineChart
                xData={overview.bedUsage.occupancyTrend.map((t) => t.date)}
                series={[
                  {
                    name: '床位使用率%',
                    data: overview.bedUsage.occupancyTrend.map((t) => t.rate),
                  },
                ]}
                height={220}
              />
            </div>
          </div>
        </Col>

        <Col xs={24} lg={10}>
          <div className="jl-card mb-4 p-4">
            <h3 className="m-0 mb-3 text-base font-medium">
              <CalendarOutlined className="mr-1 text-jl-primary" />
              今日动态
            </h3>
            <Row gutter={[12, 12]}>
              <Col span={6}>
                <div className="rounded-lg bg-jl-primary/5 p-3 text-center">
                  <div className="text-2xl font-semibold text-jl-primary">
                    {overview.today.newAdmission}
                  </div>
                  <div className="mt-1 text-xs text-ink-secondary">新入院</div>
                </div>
              </Col>
              <Col span={6}>
                <div className="rounded-lg bg-success/10 p-3 text-center">
                  <div className="text-2xl font-semibold text-medical-normal">
                    {overview.today.discharge}
                  </div>
                  <div className="mt-1 text-xs text-ink-secondary">出院</div>
                </div>
              </Col>
              <Col span={6}>
                <div className="rounded-lg bg-warning/10 p-3 text-center">
                  <div className="text-2xl font-semibold text-warning">
                    {overview.today.surgery}
                  </div>
                  <div className="mt-1 text-xs text-ink-secondary">手术</div>
                </div>
              </Col>
              <Col span={6}>
                <div className="rounded-lg bg-medical-critical/10 p-3 text-center">
                  <div className="text-2xl font-semibold text-medical-critical">
                    {overview.today.critical}
                  </div>
                  <div className="mt-1 text-xs text-ink-secondary">危急值</div>
                </div>
              </Col>
            </Row>
            <div className="mt-3 flex items-center justify-between rounded-lg border border-dashed border-ink-border p-3">
              <span className="text-sm text-ink-secondary">
                <MedicineBoxOutlined className="mr-1" />
                待处理事项
              </span>
              <Badge
                count={overview.today.pendingTasks}
                style={{ background: '#FAAD14' }}
                overflowCount={99}
              />
            </div>
          </div>

          <div className="jl-card p-4">
            <h3 className="m-0 mb-3 text-base font-medium">
              <TrophyOutlined className="mr-1 text-jl-primary" />
              全院科室排名（共 {overview.ranking[0]?.total ?? 28} 个科室）
            </h3>
            {overview.ranking.map((r) => (
              <div
                key={r.metric}
                className="mb-2 flex items-center justify-between text-sm last:mb-0"
              >
                <span className="text-ink-secondary">{r.metric}</span>
                <span className="flex items-center gap-2">
                  <span className="text-ink-secondary">{r.value}</span>
                  <Tag color={r.rank <= 5 ? 'success' : r.rank <= 10 ? 'processing' : 'default'}>
                    第 {r.rank} 名
                  </Tag>
                </span>
              </div>
            ))}
          </div>
        </Col>
      </Row>

      {/* 亚专业组 */}
      <div className="jl-card mt-4 p-4">
        <h3 className="m-0 mb-3 text-base font-medium">
          <ExperimentOutlined className="mr-1 text-jl-primary" />
          亚专业组
        </h3>
        <div className="flex flex-wrap gap-2">
          {department.specialties.map((s) => (
            <Tag key={s} icon={<TeamOutlined />} color="blue" className="px-3 py-1">
              {s}
            </Tag>
          ))}
          <Tag icon={<CheckCircleOutlined />} color="green" className="px-3 py-1">
            国家级胸痛中心
          </Tag>
          <Tag icon={<CheckCircleOutlined />} color="green" className="px-3 py-1">
            房颤中心示范单位
          </Tag>
        </div>
      </div>
    </PageContainer>
  );
}

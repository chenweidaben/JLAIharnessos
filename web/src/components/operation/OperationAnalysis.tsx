/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 运营分析：门诊 / 住院 / 手术 / 费用 多维交叉分析与下钻
 */
import { useEffect, useState } from 'react';
import { Button, Col, Row, Segmented, Select, Space, Statistic, Tabs, Tooltip } from 'antd';
import { DownloadOutlined, DownOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { BarChart, LineChart, PieChart } from '@/components/charts';
import { useOperationStore } from '@/store/operationStore';
import type { TimeGranularity } from '@/types/operation';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="m-0 mb-2 text-base font-medium">{children}</h3>;
}

function DrillCrumb({ path }: { path: string[] }) {
  return (
    <div className="mb-3 text-xs text-ink-secondary">
      下钻路径：
      {path.map((p, i) => (
        <span key={p}>
          {i > 0 && <span className="mx-1 text-ink-border">/</span>}
          <span className={i === path.length - 1 ? 'text-jl-primary' : ''}>{p}</span>
        </span>
      ))}
    </div>
  );
}

export default function OperationAnalysis() {
  const analysis = useOperationStore((s) => s.analysis);
  const fetchAnalysis = useOperationStore((s) => s.fetchAnalysis);
  const [granularity, setGranularity] = useState<TimeGranularity>('month');
  const [scope, setScope] = useState('dept');
  const [drillPath] = useState<string[]>(['心血管内科']);

  useEffect(() => {
    void fetchAnalysis();
  }, [fetchAnalysis]);

  const { outpatient, inpatient, surgery, fee } = analysis;

  return (
    <PageContainer
      title="运营分析"
      description="门诊 / 住院 / 手术 / 费用多维交叉分析，支持逐级下钻与数据导出"
      extra={
        <Space>
          <Button icon={<DownloadOutlined />} size="small">
            导出 Excel
          </Button>
          <Button icon={<DownloadOutlined />} size="small">
            导出 PDF
          </Button>
        </Space>
      }
    >
      {/* 维度筛选 */}
      <div className="jl-card mb-4 flex flex-wrap items-center gap-4 p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-secondary">时间粒度</span>
          <Segmented
            size="small"
            value={granularity}
            onChange={(v) => setGranularity(v as TimeGranularity)}
            options={[
              { label: '日', value: 'day' },
              { label: '周', value: 'week' },
              { label: '月', value: 'month' },
              { label: '季', value: 'quarter' },
              { label: '年', value: 'year' },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-secondary">对比维度</span>
          <Select
            size="small"
            value={scope}
            onChange={setScope}
            style={{ width: 160 }}
            options={[
              { label: '本科室', value: 'dept' },
              { label: '全院对比', value: 'all' },
              { label: '心外科对比', value: 'peer' },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-secondary">病种维度</span>
          <Select
            size="small"
            defaultValue="all"
            style={{ width: 160 }}
            options={[
              { label: '全部病种', value: 'all' },
              { label: 'TOP10 病种', value: 'top' },
              { label: '急性心肌梗死', value: 'AMI' },
            ]}
          />
        </div>
      </div>

      <DrillCrumb path={drillPath} />

      <Tabs
        defaultActiveKey="outpatient"
        items={[
          {
            key: 'outpatient',
            label: '门诊分析',
            children: (
              <div>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={6}>
                    <div className="jl-card p-4">
                      <Statistic
                        title="次均门诊费用"
                        value={outpatient.avgVisitCost}
                        precision={1}
                        suffix="元"
                      />
                    </div>
                  </Col>
                  <Col xs={24} md={6}>
                    <div className="jl-card p-4">
                      <Statistic
                        title="门诊药占比"
                        value={outpatient.drugRatio}
                        precision={1}
                        suffix="%"
                      />
                    </div>
                  </Col>
                  <Col xs={24} md={6}>
                    <div className="jl-card p-4">
                      <Statistic
                        title="预约挂号率"
                        value={outpatient.appointmentRate}
                        precision={1}
                        suffix="%"
                      />
                    </div>
                  </Col>
                  <Col xs={24} md={6}>
                    <div className="jl-card p-4">
                      <Statistic
                        title="平均候诊时间"
                        value={outpatient.avgWaitMinutes}
                        suffix="分钟"
                      />
                    </div>
                  </Col>
                </Row>
                <Row gutter={[16, 16]} className="mt-4">
                  <Col xs={24} lg={12}>
                    <div className="jl-card p-4">
                      <SectionTitle>
                        门诊量趋势（按
                        {granularity === 'day' ? '日' : granularity === 'week' ? '周' : '月'}）
                      </SectionTitle>
                      <LineChart
                        xData={outpatient.visitTrend.map((t) => t.label)}
                        series={[
                          { name: '门诊量', data: outpatient.visitTrend.map((t) => t.value) },
                        ]}
                      />
                    </div>
                  </Col>
                  <Col xs={24} lg={12}>
                    <div className="jl-card p-4">
                      <SectionTitle>门诊医生工作量排名</SectionTitle>
                      <BarChart
                        xData={outpatient.doctorWorkload.map((d) => d.name)}
                        series={[
                          { name: '门诊人次', data: outpatient.doctorWorkload.map((d) => d.value) },
                        ]}
                      />
                    </div>
                  </Col>
                </Row>
                <Row gutter={[16, 16]} className="mt-4">
                  <Col xs={24} lg={12}>
                    <div className="jl-card p-4">
                      <SectionTitle>门诊疾病谱分布（TOP10）</SectionTitle>
                      <PieChart
                        data={outpatient.diseaseTop10.map((d) => ({
                          name: d.name,
                          value: d.count,
                        }))}
                        height={300}
                      />
                    </div>
                  </Col>
                  <Col xs={24} lg={12}>
                    <div className="jl-card p-4">
                      <SectionTitle>预约与爽约分析</SectionTitle>
                      <BarChart
                        xData={['预约率', '实际就诊率', '爽约率']}
                        series={[
                          {
                            name: '%',
                            data: [
                              outpatient.appointmentRate,
                              100 - outpatient.noShowRate,
                              outpatient.noShowRate,
                            ],
                          },
                        ]}
                      />
                      <div className="mt-2 text-xs text-ink-secondary">
                        点击医生柱状图可下钻至医生门诊明细 → 病种 → 患者
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            ),
          },
          {
            key: 'inpatient',
            label: '住院分析',
            children: (
              <div>
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={12}>
                    <div className="jl-card p-4">
                      <SectionTitle>出院人数趋势</SectionTitle>
                      <LineChart
                        xData={inpatient.dischargeTrend.map((t) => t.label)}
                        series={[
                          { name: '出院人数', data: inpatient.dischargeTrend.map((t) => t.value) },
                        ]}
                      />
                    </div>
                  </Col>
                  <Col xs={24} lg={12}>
                    <div className="jl-card p-4">
                      <SectionTitle>床位使用率 / 平均住院日趋势</SectionTitle>
                      <LineChart
                        xData={inpatient.occupancyTrend.map((t) => t.label)}
                        series={[
                          {
                            name: '床位使用率%',
                            data: inpatient.occupancyTrend.map((t) => t.value),
                          },
                          { name: '平均住院日(天)', data: inpatient.losTrend.map((t) => t.value) },
                        ]}
                      />
                    </div>
                  </Col>
                </Row>
                <Row gutter={[16, 16]} className="mt-4">
                  <Col xs={24} lg={12}>
                    <div className="jl-card p-4">
                      <SectionTitle>住院疾病谱分布（TOP10）</SectionTitle>
                      <BarChart
                        xData={inpatient.diseaseTop10.map((d) => d.name.slice(0, 8))}
                        series={[
                          { name: '例数', data: inpatient.diseaseTop10.map((d) => d.count) },
                        ]}
                        height={300}
                      />
                    </div>
                  </Col>
                  <Col xs={24} lg={12}>
                    <div className="jl-card p-4">
                      <SectionTitle>住院转归分析</SectionTitle>
                      <PieChart
                        data={[
                          { name: '治愈', value: inpatient.outcome.cureRate },
                          { name: '好转', value: inpatient.outcome.improveRate },
                          { name: '未愈', value: inpatient.outcome.unhealRate },
                          { name: '死亡', value: inpatient.outcome.deathRate },
                        ]}
                        height={300}
                      />
                    </div>
                  </Col>
                </Row>
                <div className="jl-card mt-4 p-4">
                  <SectionTitle>住院费用结构</SectionTitle>
                  <Row gutter={[16, 16]}>
                    <Col span={6}>
                      <Statistic title="次均住院费用" value={inpatient.avgStayCost} suffix="元" />
                    </Col>
                    <Col span={6}>
                      <Statistic title="药占比" value={inpatient.drugRatio} suffix="%" />
                    </Col>
                    <Col span={6}>
                      <Statistic title="耗占比" value={inpatient.consumableRatio} suffix="%" />
                    </Col>
                    <Col span={6}>
                      <Statistic title="检查占比" value={inpatient.examRatio} suffix="%" />
                    </Col>
                  </Row>
                </div>
              </div>
            ),
          },
          {
            key: 'surgery',
            label: '手术分析',
            children: (
              <div>
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={12}>
                    <div className="jl-card p-4">
                      <SectionTitle>手术量趋势</SectionTitle>
                      <LineChart
                        xData={surgery.volumeTrend.map((t) => t.label)}
                        series={[{ name: '手术量', data: surgery.volumeTrend.map((t) => t.value) }]}
                      />
                    </div>
                  </Col>
                  <Col xs={24} lg={12}>
                    <div className="jl-card p-4">
                      <SectionTitle>手术分级分布</SectionTitle>
                      <PieChart
                        data={surgery.levelDist.map((l) => ({ name: l.name, value: l.count }))}
                        height={300}
                      />
                    </div>
                  </Col>
                </Row>
                <Row gutter={[16, 16]} className="mt-4">
                  <Col xs={24} lg={12}>
                    <div className="jl-card p-4">
                      <SectionTitle>手术医生工作量排名</SectionTitle>
                      <BarChart
                        xData={surgery.doctorWorkload.map((d) => d.name)}
                        series={[
                          { name: '手术台次', data: surgery.doctorWorkload.map((d) => d.value) },
                        ]}
                      />
                    </div>
                  </Col>
                  <Col xs={24} lg={12}>
                    <div className="jl-card p-4">
                      <SectionTitle>手术类型分布</SectionTitle>
                      <PieChart data={surgery.typeDist} height={300} />
                    </div>
                  </Col>
                </Row>
                <Row gutter={[16, 16]} className="mt-4">
                  <Col span={8}>
                    <div className="jl-card p-4">
                      <Statistic title="手术并发症率" value={surgery.complicationRate} suffix="%" />
                    </div>
                  </Col>
                  <Col span={8}>
                    <div className="jl-card p-4">
                      <Statistic
                        title="平均手术时长"
                        value={surgery.avgDurationMinutes}
                        suffix="分钟"
                      />
                    </div>
                  </Col>
                  <Col span={8}>
                    <div className="jl-card p-4">
                      <Statistic title="四级手术占比" value={16.0} suffix="%" />
                    </div>
                  </Col>
                </Row>
              </div>
            ),
          },
          {
            key: 'fee',
            label: '费用分析',
            children: (
              <div>
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={14}>
                    <div className="jl-card p-4">
                      <SectionTitle>总收入趋势（门诊 + 住院）</SectionTitle>
                      <LineChart
                        xData={fee.revenueTrend.map((t) => t.label)}
                        series={[
                          {
                            name: '门诊收入(万元)',
                            data: fee.revenueTrend.map((t) => t.outpatient),
                          },
                          {
                            name: '住院收入(万元)',
                            data: fee.revenueTrend.map((t) => t.inpatient),
                          },
                        ]}
                      />
                    </div>
                  </Col>
                  <Col xs={24} lg={10}>
                    <div className="jl-card p-4">
                      <SectionTitle>收入结构</SectionTitle>
                      <PieChart
                        data={fee.structure.map((s) => ({ name: s.name, value: s.amount }))}
                        height={300}
                      />
                    </div>
                  </Col>
                </Row>
                <Row gutter={[16, 16]} className="mt-4">
                  <Col xs={24} lg={12}>
                    <div className="jl-card p-4">
                      <SectionTitle>次均费用与标杆对比</SectionTitle>
                      <BarChart
                        xData={fee.avgCostCompare.map((c) => c.name)}
                        series={[
                          { name: '本科室', data: fee.avgCostCompare.map((c) => c.value) },
                          { name: '标杆', data: fee.avgCostCompare.map((c) => c.benchmark) },
                        ]}
                      />
                    </div>
                  </Col>
                  <Col xs={24} lg={12}>
                    <div className="jl-card p-4">
                      <SectionTitle>医保 / 自费结构</SectionTitle>
                      <PieChart
                        data={[
                          { name: '医保', value: fee.insuranceRatio },
                          { name: '自费', value: fee.selfPayRatio },
                        ]}
                        height={280}
                      />
                      <Tooltip title="点击饼图可下钻至参保类型与费用明细">
                        <div className="mt-2 flex items-center gap-1 text-xs text-jl-primary">
                          下钻分析 <DownOutlined />
                        </div>
                      </Tooltip>
                    </div>
                  </Col>
                </Row>
              </div>
            ),
          },
        ]}
      />
    </PageContainer>
  );
}

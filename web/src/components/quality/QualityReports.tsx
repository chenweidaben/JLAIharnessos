/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 质控报表：科室/医生排名 + 缺陷分布 + 整改统计 + DRG质控 + 导出
 */
import { useEffect } from 'react';
import { Button, Card, Col, Row, Space, Table, Tabs, Tag, message } from 'antd';
import { DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import type { RankItem } from '@/types/quality';
import { useQualityStore } from '@/store/qualityStore';
import BaseChart from '@/components/charts/BaseChart';

function DeptRankTable({ data }: { data: RankItem[] }) {
  return (
    <Table<RankItem>
      size="small"
      pagination={false}
      rowKey="name"
      dataSource={data}
      columns={[
        { title: '排名', width: 60, render: (_, __, i) => i + 1 },
        { title: '科室/医生', dataIndex: 'name' },
        { title: '质控数', dataIndex: 'total', width: 80 },
        {
          title: '合格率%',
          dataIndex: 'passRate',
          width: 90,
          sorter: (a, b) => a.passRate - b.passRate,
          render: (v: number) => (
            <Tag color={v >= 85 ? 'success' : v >= 80 ? 'warning' : 'error'}>{v.toFixed(1)}</Tag>
          ),
        },
        {
          title: '平均分',
          dataIndex: 'avgScore',
          width: 80,
          sorter: (a, b) => a.avgScore - b.avgScore,
        },
        { title: '均缺陷', dataIndex: 'avgDefects', width: 80 },
        {
          title: '整改率%',
          dataIndex: 'rectifyRate',
          width: 90,
          render: (v: number) => v.toFixed(1),
        },
      ]}
    />
  );
}

export default function QualityReports() {
  const { qualityStats, fetchQualityStats, loading } = useQualityStore();

  useEffect(() => {
    void fetchQualityStats();
  }, [fetchQualityStats]);

  const s = qualityStats;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Space>
          <Button icon={<PrinterOutlined />} onClick={() => message.success('已发送到打印机')}>
            打印
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => message.success('报表已导出为 Excel')}>
            导出 Excel
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => message.success('报表已导出为 PDF')}>
            导出 PDF
          </Button>
        </Space>
      </div>

      <Tabs
        items={[
          {
            key: 'rank',
            label: '科室 / 医生排名',
            children: (
              <Row gutter={3}>
                <Col xs={24} lg={12}>
                  <Card size="small" title="科室质控排名" className="shadow-card">
                    <DeptRankTable data={s?.deptRanking ?? []} />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card size="small" title="医生质控排名" className="shadow-card">
                    <DeptRankTable data={s?.doctorRanking ?? []} />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'trend',
            label: '质控趋势',
            children: (
              <Row gutter={3}>
                <Col xs={24} lg={12}>
                  <Card size="small" title="月度质控量与合格率趋势" className="shadow-card">
                    <BaseChart
                      height={280}
                      option={{
                        tooltip: { trigger: 'axis' },
                        legend: { data: ['质控份数', '合格率%'] },
                        xAxis: {
                          type: 'category',
                          data: (s?.monthlyTrend ?? []).map((m) => m.month),
                        },
                        yAxis: [
                          { type: 'value', name: '份数' },
                          { type: 'value', name: '%', min: 70, max: 100 },
                        ],
                        series: [
                          {
                            name: '质控份数',
                            type: 'bar',
                            data: (s?.monthlyTrend ?? []).map((m) => m.checked),
                          },
                          {
                            name: '合格率%',
                            type: 'line',
                            yAxisIndex: 1,
                            smooth: true,
                            data: (s?.monthlyTrend ?? []).map((m) => m.passRate),
                          },
                        ],
                      }}
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card size="small" title="病历类型质控分布" className="shadow-card">
                    <BaseChart
                      height={280}
                      option={{
                        tooltip: { trigger: 'item' },
                        legend: { bottom: 0 },
                        series: [
                          {
                            type: 'pie',
                            radius: ['40%', '65%'],
                            data: s?.recordTypeDist ?? [],
                            label: { formatter: '{b}: {c}' },
                          },
                        ],
                      }}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'defect',
            label: '缺陷分布分析',
            children: (
              <Row gutter={3}>
                <Col xs={24} lg={8}>
                  <Card size="small" title="缺陷类型分布" className="shadow-card">
                    <BaseChart
                      height={260}
                      option={{
                        tooltip: { trigger: 'item' },
                        legend: { bottom: 0 },
                        series: [{ type: 'pie', radius: '62%', data: s?.defectTypeDist ?? [] }],
                      }}
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card size="small" title="缺陷等级分布" className="shadow-card">
                    <BaseChart
                      height={260}
                      option={{
                        tooltip: { trigger: 'item' },
                        legend: { bottom: 0 },
                        series: [{ type: 'pie', radius: '62%', data: s?.defectLevelDist ?? [] }],
                      }}
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card size="small" title="高频缺陷 TOP10" className="shadow-card">
                    <BaseChart
                      height={260}
                      option={{
                        tooltip: { trigger: 'axis' },
                        grid: { left: 90 },
                        xAxis: { type: 'value' },
                        yAxis: {
                          type: 'category',
                          data: (s?.topDefects ?? []).map((d) => d.name).reverse(),
                        },
                        series: [
                          {
                            type: 'bar',
                            data: (s?.topDefects ?? []).map((d) => d.count).reverse(),
                          },
                        ],
                      }}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'rectify',
            label: '整改情况统计',
            children: (
              <Row gutter={3}>
                <Col xs={24} lg={12}>
                  <Card size="small" title="整改率趋势" className="shadow-card">
                    <BaseChart
                      height={280}
                      option={{
                        tooltip: { trigger: 'axis' },
                        xAxis: {
                          type: 'category',
                          data: (s?.rectifyTrend ?? []).map((r) => r.month),
                        },
                        yAxis: {
                          type: 'value',
                          min: 60,
                          max: 100,
                          axisLabel: { formatter: '{value}%' },
                        },
                        series: [
                          {
                            type: 'line',
                            smooth: true,
                            areaStyle: { opacity: 0.2 },
                            data: (s?.rectifyTrend ?? []).map((r) => r.rate),
                          },
                        ],
                      }}
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card size="small" title="整改概览" className="shadow-card">
                    <Table
                      size="small"
                      pagination={false}
                      rowKey="label"
                      dataSource={[
                        { label: '待整改', value: s?.pendingRectify ?? 0, color: 'warning' },
                        { label: '已整改', value: s?.rectifiedCount ?? 0, color: 'success' },
                        { label: '逾期未整改', value: s?.overdueCount ?? 0, color: 'error' },
                      ]}
                      columns={[
                        { title: '指标', dataIndex: 'label' },
                        {
                          title: '数量',
                          dataIndex: 'value',
                          render: (v: number, r) => <Tag color={r.color}>{v} 项</Tag>,
                        },
                      ]}
                    />
                    <div className="mt-3 text-xs text-ink-secondary">
                      整改质量评估：本月整改合格率 91.5%，逾期 7 项已红色预警并通知科室主任。
                    </div>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'drg',
            label: 'DRG / DIP 质控',
            children: (
              <Row gutter={3}>
                <Col xs={24} lg={8}>
                  <Card size="small" title="DRG入组率" className="shadow-card">
                    <div className="py-4 text-center">
                      <span className="text-4xl font-semibold text-jl-primary">
                        {s?.drgAdmissionRate ?? '--'}%
                      </span>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card size="small" title="低风险死亡率" className="shadow-card">
                    <div className="py-4 text-center">
                      <span className="text-4xl font-semibold text-success">
                        {s?.lowRiskDeathRate ?? '--'}%
                      </span>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card size="small" title="费用 / 时间偏差" className="shadow-card">
                    <div className="space-y-2 py-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-ink-secondary">费用偏差控制</span>
                        <span>平均 +4.2%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-secondary">时间偏差控制</span>
                        <span>平均 -3.6%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-secondary">结余病例占比</span>
                        <span>62.8%</span>
                      </div>
                    </div>
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />
      {loading && !s && <div className="py-10 text-center text-ink-secondary">加载报表中...</div>}
    </div>
  );
}

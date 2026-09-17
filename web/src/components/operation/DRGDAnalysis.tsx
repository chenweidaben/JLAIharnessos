/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * DRG/DIP 分析：入组率 / CMI / 盈亏散点 / 费用时间偏差 / 标杆对比 / AI 建议
 */
import { useEffect, useMemo, useState } from 'react';
import { Badge, Col, Row, Select, Statistic, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AimOutlined, BulbOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';
import type { EChartsOption } from 'echarts';

import { PageContainer } from '@/components/common';
import { BaseChart, BarChart } from '@/components/charts';
import { useOperationStore } from '@/store/operationStore';
import type { DRGGroup, ProfitStatus } from '@/types/operation';

const profitColor: Record<ProfitStatus, string> = {
  profit: '#52C41A',
  balance: '#8C8C8C',
  loss: '#F5222D',
};
const profitLabel: Record<ProfitStatus, string> = { profit: '盈利', balance: '持平', loss: '亏损' };

export default function DRGDAnalysis() {
  const drgDip = useOperationStore((s) => s.drgDip);
  const fetchDRGDAnalysis = useOperationStore((s) => s.fetchDRGDAnalysis);
  const [filterStatus, setFilterStatus] = useState<ProfitStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<'profit' | 'weight' | 'caseCount'>('profit');

  useEffect(() => {
    void fetchDRGDAnalysis();
  }, [fetchDRGDAnalysis]);

  // 盈亏散点图（气泡：X 费用偏差 Y 时间偏差 大小=例数）
  const scatterOption: EChartsOption = useMemo(() => {
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as { data: [number, number, number, string] };
          return `${p.data[3]}<br/>费用偏差：${p.data[0]}%<br/>时间偏差：${p.data[1]}%<br/>例数：${p.data[2]}`;
        },
      },
      grid: { left: 50, right: 30, top: 30, bottom: 40 },
      xAxis: { name: '费用偏差(%)', type: 'value', splitLine: { lineStyle: { color: '#F0F2F5' } } },
      yAxis: { name: '时间偏差(%)', type: 'value', splitLine: { lineStyle: { color: '#F0F2F5' } } },
      series: [
        {
          type: 'scatter',
          symbolSize: (val: unknown[]) => Math.max(10, Number(val[2]) * 1.6),
          data: drgDip.scatter.map((b) => [b.costDev, b.timeDev, b.count, b.groupName]),
          itemStyle: { color: '#0A4D8C', opacity: 0.75 },
        },
      ],
    };
  }, [drgDip.scatter]);

  const filteredGroups = useMemo(() => {
    let list = drgDip.groups.slice();
    if (filterStatus !== 'all') list = list.filter((g) => g.profitStatus === filterStatus);
    list.sort((a, b) => {
      if (sortKey === 'profit') return b.profit - a.profit;
      if (sortKey === 'weight') return b.weight - a.weight;
      return b.caseCount - a.caseCount;
    });
    return list;
  }, [drgDip.groups, filterStatus, sortKey]);

  const columns: ColumnsType<DRGGroup> = [
    { title: 'DRG 组', dataIndex: 'groupName', key: 'groupName', width: 200, ellipsis: true },
    { title: '编码', dataIndex: 'groupCode', key: 'groupCode', width: 90 },
    {
      title: '权重',
      dataIndex: 'weight',
      key: 'weight',
      width: 70,
      sorter: (a, b) => a.weight - b.weight,
    },
    { title: '例数', dataIndex: 'caseCount', key: 'caseCount', width: 70 },
    {
      title: '平均费用(元)',
      dataIndex: 'avgCost',
      key: 'avgCost',
      width: 110,
      align: 'right',
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: '标准费用(元)',
      dataIndex: 'stdCost',
      key: 'stdCost',
      width: 110,
      align: 'right',
      render: (v: number) => v.toLocaleString(),
    },
    { title: '平均住院日', dataIndex: 'avgLOS', key: 'avgLOS', width: 90, align: 'right' },
    {
      title: '盈亏(万元)',
      dataIndex: 'profit',
      key: 'profit',
      width: 100,
      align: 'right',
      sorter: (a, b) => a.profit - b.profit,
      render: (v: number) => (
        <span style={{ color: v >= 0 ? '#52C41A' : '#F5222D' }}>{v.toFixed(1)}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'profitStatus',
      key: 'profitStatus',
      width: 80,
      render: (v: ProfitStatus) => <Tag color={profitColor[v]}>{profitLabel[v]}</Tag>,
    },
    { title: '主诊医生', dataIndex: 'doctor', key: 'doctor', width: 90 },
  ];

  return (
    <PageContainer
      title="DRG/DIP 分析"
      description="基于国家医保分组方案的病例组合、盈亏与费用时间偏差分析"
    >
      {/* 概览指标 */}
      <Row gutter={[16, 16]}>
        {[
          {
            title: '入组率',
            value: drgDip.groupingRate,
            suffix: '%',
            target: '目标 >95%',
            good: drgDip.groupingRate >= 95,
          },
          {
            title: '覆盖 DRG 组数',
            value: drgDip.coveredGroups,
            suffix: '组',
            target: '',
            good: true,
          },
          { title: 'CMI 值', value: drgDip.cmi, suffix: '', target: '', good: true },
          {
            title: '时间消耗指数',
            value: drgDip.timeEfficiencyIndex,
            suffix: '',
            target: '<1 为佳',
            good: drgDip.timeEfficiencyIndex <= 1,
          },
          {
            title: '费用消耗指数',
            value: drgDip.costEfficiencyIndex,
            suffix: '',
            target: '<1 为佳',
            good: drgDip.costEfficiencyIndex <= 1,
          },
          {
            title: '低风险死亡率',
            value: drgDip.lowRiskMortality,
            suffix: '%',
            target: '<0.1%',
            good: true,
          },
        ].map((c) => (
          <Col xs={12} md={8} lg={4} key={c.title}>
            <div className="jl-card p-4">
              <Statistic
                title={c.title}
                value={c.value}
                suffix={c.suffix}
                precision={typeof c.value === 'number' ? (c.value < 10 ? 2 : 1) : 0}
              />
              {c.target && (
                <div className="mt-1">
                  <Badge
                    status={c.good ? 'success' : 'warning'}
                    text={<span className="text-xs text-ink-secondary">{c.target}</span>}
                  />
                </div>
              )}
            </div>
          </Col>
        ))}
      </Row>

      {/* 盈亏总览 */}
      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} lg={8}>
          <div className="jl-card p-4">
            <h3 className="m-0 mb-3 text-base font-medium">盈亏总览</h3>
            <Row gutter={[12, 12]}>
              <Col span={8}>
                <div className="rounded-lg bg-success/10 p-3 text-center">
                  <RiseOutlined className="text-medical-normal" />
                  <div className="mt-1 text-xl font-semibold text-medical-normal">
                    {drgDip.profitOverview.profitCount}
                  </div>
                  <div className="text-xs text-ink-secondary">盈利组</div>
                </div>
              </Col>
              <Col span={8}>
                <div className="rounded-lg bg-medical-critical/10 p-3 text-center">
                  <FallOutlined className="text-medical-critical" />
                  <div className="mt-1 text-xl font-semibold text-medical-critical">
                    {drgDip.profitOverview.lossCount}
                  </div>
                  <div className="text-xs text-ink-secondary">亏损组</div>
                </div>
              </Col>
              <Col span={8}>
                <div className="rounded-lg bg-jl-primary/5 p-3 text-center">
                  <div className="mt-1 text-xl font-semibold text-jl-primary">
                    {drgDip.profitOverview.balanceCount}
                  </div>
                  <div className="text-xs text-ink-secondary">持平组</div>
                </div>
              </Col>
            </Row>
            <div className="mt-3 rounded-lg border border-ink-border p-3 text-center">
              <span className="text-sm text-ink-secondary">净盈亏：</span>
              <span
                className={`text-lg font-semibold ${drgDip.profitOverview.netProfit >= 0 ? 'text-medical-normal' : 'text-medical-critical'}`}
              >
                {drgDip.profitOverview.netProfit >= 0 ? '+' : ''}
                {drgDip.profitOverview.netProfit} 万元
              </span>
            </div>
          </div>
        </Col>
        <Col xs={24} lg={16}>
          <div className="jl-card p-4">
            <h3 className="m-0 mb-2 text-base font-medium">盈亏散点图（气泡大小 = 例数）</h3>
            <BaseChart option={scatterOption} height={300} />
          </div>
        </Col>
      </Row>

      {/* DRG 分组列表 */}
      <div className="jl-card mt-4 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="m-0 text-base font-medium">
            DRG 分组列表（共 {drgDip.groups.length} 组）
          </h3>
          <div className="flex gap-2">
            <Select
              size="small"
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 120 }}
              options={[
                { label: '全部', value: 'all' },
                { label: '盈利', value: 'profit' },
                { label: '亏损', value: 'loss' },
                { label: '持平', value: 'balance' },
              ]}
            />
            <Select
              size="small"
              value={sortKey}
              onChange={(v) => setSortKey(v as typeof sortKey)}
              style={{ width: 130 }}
              options={[
                { label: '按盈亏排序', value: 'profit' },
                { label: '按权重排序', value: 'weight' },
                { label: '按例数排序', value: 'caseCount' },
              ]}
            />
          </div>
        </div>
        <Table
          rowKey="groupCode"
          columns={columns}
          dataSource={filteredGroups}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1100 }}
        />
      </div>

      {/* 偏差分析 + 标杆对比 */}
      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} lg={8}>
          <div className="jl-card p-4">
            <h3 className="m-0 mb-2 text-base font-medium">费用偏差分布</h3>
            <BarChart
              xData={drgDip.costDevDist.map((d) => d.range)}
              series={[{ name: '组数', data: drgDip.costDevDist.map((d) => d.count) }]}
              height={240}
            />
          </div>
        </Col>
        <Col xs={24} lg={8}>
          <div className="jl-card p-4">
            <h3 className="m-0 mb-2 text-base font-medium">时间偏差分布</h3>
            <BarChart
              xData={drgDip.timeDevDist.map((d) => d.range)}
              series={[{ name: '组数', data: drgDip.timeDevDist.map((d) => d.count) }]}
              height={240}
            />
          </div>
        </Col>
        <Col xs={24} lg={8}>
          <div className="jl-card p-4">
            <h3 className="m-0 mb-2 text-base font-medium">高费用病例识别</h3>
            {drgDip.highCostCases.map((c) => (
              <div
                key={c.groupName}
                className="mb-2 flex items-center justify-between text-sm last:mb-0"
              >
                <span
                  className="text-ink-secondary"
                  style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {c.groupName}
                </span>
                <span>
                  <Tag color="red">×{c.multiple}</Tag>
                  <span className="ml-1 text-xs text-ink-secondary">
                    {(c.avgCost / 10000).toFixed(1)}万
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Col>
      </Row>

      {/* 标杆对比 */}
      <div className="jl-card mt-4 p-4">
        <h3 className="m-0 mb-3 text-base font-medium">
          <AimOutlined className="mr-1 text-jl-primary" />
          标杆对比（全国 / 全省 / 同级科室）
        </h3>
        <Table
          rowKey="metric"
          size="small"
          pagination={false}
          dataSource={drgDip.benchmarks}
          columns={[
            { title: '指标', dataIndex: 'metric' },
            {
              title: '本科室',
              dataIndex: 'deptValue',
              render: (v: number) => <b className="text-jl-primary">{v}</b>,
            },
            { title: '全国标杆', dataIndex: 'national' },
            { title: '全省标杆', dataIndex: 'provincial' },
            { title: '同级科室', dataIndex: 'peerDept' },
            { title: '单位', dataIndex: 'unit' },
          ]}
        />
      </div>

      {/* AI 改进建议 */}
      <div className="jl-card mt-4 p-4">
        <h3 className="m-0 mb-3 text-base font-medium">
          <BulbOutlined className="mr-1 text-warning" />
          AI 智能改进建议
        </h3>
        <Row gutter={[16, 16]}>
          {drgDip.advices.map((a) => (
            <Col xs={24} md={12} key={a.drgGroup}>
              <div className="rounded-lg border border-ink-border p-3">
                <div className="mb-1 flex items-center justify-between">
                  <b className="text-ink-primary">{a.drgGroup}</b>
                  <Tag
                    color={
                      a.priority === 'high' ? 'red' : a.priority === 'medium' ? 'orange' : 'default'
                    }
                  >
                    {a.priority === 'high' ? '重点' : a.priority === 'medium' ? '关注' : '一般'}
                  </Tag>
                </div>
                <p className="m-0 mb-1 text-xs text-ink-secondary">亏损原因：{a.reason}</p>
                <p className="m-0 mb-1 text-sm text-ink-primary">改进建议：{a.suggestion}</p>
                <p className="m-0 text-xs text-medical-normal">预期收益：{a.expectedBenefit}</p>
              </div>
            </Col>
          ))}
        </Row>
      </div>
    </PageContainer>
  );
}

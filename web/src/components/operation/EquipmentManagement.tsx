/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 设备与物资管理：设备台账 / 高值耗材追溯 / 库存预警 / 效益与成本统计
 */
import { useEffect, useMemo, useState } from 'react';
import { Badge, Col, Drawer, Progress, Row, Statistic, Table, Tabs, Tag, Timeline } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AlertOutlined, ToolOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { PieChart, BarChart } from '@/components/charts';
import { useOperationStore } from '@/store/operationStore';
import type { EquipmentInfo, EquipmentStatus, Consumable, InventoryAlert } from '@/types/operation';
import { clickableProps } from '@/utils/a11y';

const eqStatusColor: Record<EquipmentStatus, string> = {
  normal: 'success',
  repair: 'warning',
  scrap: 'default',
  idle: 'processing',
};
const eqStatusLabel: Record<EquipmentStatus, string> = {
  normal: '正常',
  repair: '维修中',
  scrap: '已报废',
  idle: '闲置',
};

export default function EquipmentManagement() {
  const equipmentList = useOperationStore((s) => s.equipmentList);
  const consumables = useOperationStore((s) => s.consumables);
  const alerts = useOperationStore((s) => s.inventoryAlerts);
  const stats = useOperationStore((s) => s.equipmentStats);
  const fetchEquip = useOperationStore((s) => s.fetchEquipmentList);

  const [detail, setDetail] = useState<EquipmentInfo | null>(null);

  useEffect(() => {
    void fetchEquip();
  }, [fetchEquip]);

  const eqColumns: ColumnsType<EquipmentInfo> = [
    { title: '设备名称', dataIndex: 'name', width: 220, ellipsis: true },
    { title: '型号', dataIndex: 'model', width: 140, ellipsis: true },
    { title: '厂家', dataIndex: 'vendor', width: 110 },
    { title: '购置日期', dataIndex: 'purchaseDate', width: 110 },
    {
      title: '价值(万元)',
      dataIndex: 'value',
      width: 90,
      align: 'right',
      render: (v: number) => v.toFixed(1),
    },
    {
      title: '使用率',
      dataIndex: 'usageRate',
      width: 130,
      render: (v: number) => (
        <Progress
          percent={v}
          size="small"
          strokeColor={v > 80 ? '#52C41A' : v > 50 ? '#1890FF' : '#FAAD14'}
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: EquipmentStatus) => (
        <Badge status={eqStatusColor[v] as never} text={eqStatusLabel[v]} />
      ),
    },
    {
      title: '维保到期',
      dataIndex: 'nextMaintenance',
      width: 110,
      render: (v: string) =>
        v.includes('2026-09') || v.includes('2026-10') ? <Tag color="orange">{v}</Tag> : v,
    },
    {
      title: '操作',
      width: 80,
      render: (_, row) => (
        <span
          {...clickableProps(() => setDetail(row))}
          style={{ color: '#1677ff', cursor: 'pointer' }}
        >
          详情
        </span>
      ),
    },
  ];

  const conColumns: ColumnsType<Consumable> = [
    { title: '耗材名称', dataIndex: 'name', width: 180, ellipsis: true },
    { title: '规格', dataIndex: 'spec', width: 110 },
    { title: '型号', dataIndex: 'model', width: 130, ellipsis: true },
    { title: '厂家', dataIndex: 'vendor', width: 100 },
    {
      title: '单价(元)',
      dataIndex: 'unitPrice',
      width: 90,
      align: 'right',
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: '库存',
      dataIndex: 'stock',
      width: 130,
      render: (v: number, row) => (
        <div className="flex items-center gap-2">
          <Progress
            percent={Math.min(100, Math.round((v / row.safetyStock) * 100))}
            size="small"
            style={{ width: 70 }}
            strokeColor={v < row.safetyStock ? '#F5222D' : '#52C41A'}
          />
          <b>{v}</b>
        </div>
      ),
    },
    { title: '安全库存', dataIndex: 'safetyStock', width: 80 },
    { title: '有效期', dataIndex: 'expiryDate', width: 110 },
    {
      title: '追溯',
      dataIndex: 'traceEnabled',
      width: 80,
      render: (v: boolean) =>
        v ? <Tag color="blue">可追溯</Tag> : <span className="text-ink-secondary">—</span>,
    },
  ];

  const highValue = useMemo(
    () => consumables.filter((c) => c.category === 'high_value'),
    [consumables],
  );
  const ordinary = useMemo(
    () => consumables.filter((c) => c.category === 'ordinary'),
    [consumables],
  );

  const alertTag = (t: InventoryAlert['type']) =>
    t === 'low_stock' ? (
      <Tag color="red">低库存</Tag>
    ) : t === 'expiring' ? (
      <Tag color="orange">临期</Tag>
    ) : (
      <Tag color="red">过期</Tag>
    );

  return (
    <PageContainer
      title="设备与物资管理"
      description="医疗设备台账 / 高值耗材追溯 / 库存预警 / 效益成本分析"
    >
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <div className="jl-card p-4">
            <Statistic title="设备总台数" value={equipmentList.length} />
          </div>
        </Col>
        <Col span={6}>
          <div className="jl-card p-4">
            <Statistic
              title="设备总值"
              value={equipmentList.reduce((s, e) => s + e.value, 0).toFixed(1)}
              suffix="万元"
            />
          </div>
        </Col>
        <Col span={6}>
          <div className="jl-card p-4">
            <Statistic
              title="库存预警"
              value={alerts.length}
              suffix="项"
              valueStyle={{ color: '#F5222D' }}
            />
          </div>
        </Col>
        <Col span={6}>
          <div className="jl-card p-4">
            <Statistic title="本月耗材成本" value={276} suffix="万元" />
          </div>
        </Col>
      </Row>

      <Tabs
        className="mt-4"
        defaultActiveKey="equip"
        items={[
          {
            key: 'equip',
            label: '设备台账',
            children: (
              <div className="jl-card p-4">
                <Table
                  rowKey="equipId"
                  columns={eqColumns}
                  dataSource={equipmentList}
                  size="small"
                  pagination={false}
                  scroll={{ x: 1100 }}
                />
              </div>
            ),
          },
          {
            key: 'high',
            label: '高值耗材',
            children: (
              <div className="jl-card p-4">
                <div className="mb-2 text-xs text-ink-secondary">
                  高值耗材实行一物一码全程追溯，关联患者使用记录
                </div>
                <Table
                  rowKey="consumableId"
                  columns={conColumns}
                  dataSource={highValue}
                  size="small"
                  pagination={false}
                />
                <h4 className="mt-4 mb-2 text-sm">普通物资</h4>
                <Table
                  rowKey="consumableId"
                  columns={conColumns}
                  dataSource={ordinary}
                  size="small"
                  pagination={false}
                />
              </div>
            ),
          },
          {
            key: 'alert',
            label: '库存预警',
            children: (
              <div className="jl-card p-4">
                {alerts.map((a) => (
                  <div
                    key={a.consumableId}
                    className="mb-2 flex items-center justify-between rounded-lg border border-ink-border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <AlertOutlined className="text-warning" />
                      <span className="text-sm">{a.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {alertTag(a.type)}
                      <span className="text-xs text-ink-secondary">{a.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
          {
            key: 'stats',
            label: '统计报表',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={8}>
                  <div className="jl-card p-4">
                    <h3 className="m-0 mb-2 text-sm font-medium">设备分类</h3>
                    <PieChart
                      data={stats.equipCountByCategory.map((c) => ({
                        name: c.category,
                        value: c.count,
                      }))}
                      height={240}
                    />
                  </div>
                </Col>
                <Col xs={24} lg={8}>
                  <div className="jl-card p-4">
                    <h3 className="m-0 mb-2 text-sm font-medium">设备状态</h3>
                    <PieChart data={stats.equipStatusDist} height={240} />
                  </div>
                </Col>
                <Col xs={24} lg={8}>
                  <div className="jl-card p-4">
                    <h3 className="m-0 mb-2 text-sm font-medium">成本构成（万元）</h3>
                    <BarChart
                      xData={stats.costAnalysis.map((c) => c.name)}
                      series={[{ name: '成本', data: stats.costAnalysis.map((c) => c.cost) }]}
                      height={240}
                    />
                  </div>
                </Col>
                <Col span={24}>
                  <div className="jl-card p-4">
                    <h3 className="m-0 mb-2 text-sm font-medium">高值耗材消耗趋势（万元）</h3>
                    <BarChart
                      xData={stats.consumableTrend.map((c) => c.month)}
                      series={[
                        { name: '耗材成本', data: stats.consumableTrend.map((c) => c.amount) },
                      ]}
                    />
                  </div>
                </Col>
              </Row>
            ),
          },
        ]}
      />

      {/* 设备详情 */}
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        width={560}
        title={detail ? `设备详情 · ${detail.name}` : ''}
      >
        {detail && (
          <div>
            <Row gutter={[8, 8]}>
              <Col span={12} className="text-sm">
                <span className="text-ink-secondary">型号：</span>
                {detail.model}
              </Col>
              <Col span={12} className="text-sm">
                <span className="text-ink-secondary">厂家：</span>
                {detail.vendor}
              </Col>
              <Col span={12} className="text-sm">
                <span className="text-ink-secondary">购置日期：</span>
                {detail.purchaseDate}
              </Col>
              <Col span={12} className="text-sm">
                <span className="text-ink-secondary">价值：</span>
                {detail.value} 万元
              </Col>
              <Col span={12} className="text-sm">
                <span className="text-ink-secondary">使用科室：</span>
                {detail.dept}
              </Col>
              <Col span={12} className="text-sm">
                <span className="text-ink-secondary">本月开机：</span>
                {detail.usageHours} 小时
              </Col>
            </Row>
            <h4 className="mt-4 mb-2 text-sm">运行指标</h4>
            <div className="mb-2">
              <span className="text-ink-secondary text-sm">使用率：</span>
              <Progress percent={detail.usageRate} size="small" style={{ width: 300 }} />
            </div>
            <div className="mb-2">
              <span className="text-ink-secondary text-sm">故障率：</span>
              {detail.faultRate}%
            </div>
            <div className="mb-2">
              <span className="text-ink-secondary text-sm">月收入：</span>
              {detail.monthlyRevenue} 万元
            </div>
            <div className="mb-2">
              <span className="text-ink-secondary text-sm">投资回收期：</span>
              {detail.paybackMonths > 0 ? `${detail.paybackMonths} 个月` : '—'}
            </div>
            <h4 className="mt-4 mb-2 text-sm">
              <ToolOutlined /> 维保 / 校准记录
            </h4>
            <Timeline
              items={detail.maintenanceLog.map((m) => ({
                color: m.type === '维修' ? 'red' : m.type === '校准' ? 'blue' : 'green',
                children: `${m.date} · ${m.type} · ${m.vendor} · ${m.result}${m.cost ? `（${m.cost}万元）` : ''}`,
              }))}
            />
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
}

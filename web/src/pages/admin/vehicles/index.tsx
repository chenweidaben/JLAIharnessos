/**
 * 健澜科技 jlmedaios - 车辆管理（M751）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useVehicleM751Store } from '@/store/vehicleM751Store';
import {
  VEHICLE_STATUS_META,
  type Vehicle,
} from '@/services/api/vehicleM751';

const usageColumns: ColumnsType<{ date: string; purpose: string; miles: number }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '用途', dataIndex: 'purpose' },
  { title: '里程(km)', dataIndex: 'miles', align: 'right', width: 110 },
];

const maintenanceColumns: ColumnsType<{ date: string; item: string; cost: number }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '项目', dataIndex: 'item' },
  { title: '费用(元)', dataIndex: 'cost', align: 'right', render: (v: number) => v.toLocaleString() },
];

const buildColumns = (setDetail: (r: Vehicle) => void): ColumnsType<Vehicle> => [
  { title: '车牌号', dataIndex: 'plate', width: 140 },
  { title: '车辆类型', dataIndex: 'type', width: 130 },
  { title: '驾驶员', dataIndex: 'driver', width: 110 },
  { title: '所属科室', dataIndex: 'dept', width: 130 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: Vehicle['status']) => <Tag color={VEHICLE_STATUS_META[v].color}>{VEHICLE_STATUS_META[v].label}</Tag>,
  },
  {
    title: '操作',
    width: 90,
    render: (_v, row) => (
      <Button type="link" size="small" onClick={() => setDetail(row)}>
        详情
      </Button>
    ),
  },
];

export default function VehiclesM751Page() {
  usePageTitle('车辆管理');
  const { items, loading, error, demo, load } = useVehicleM751Store();
  const [detail, setDetail] = useState<Vehicle | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="车辆管理"
      description="车牌号 / 车辆类型 / 驾驶员 / 所属科室 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`车辆列表（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="车辆详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="车牌号">{detail.plate}</Descriptions.Item>
              <Descriptions.Item label="车辆类型">{detail.type}</Descriptions.Item>
              <Descriptions.Item label="驾驶员">{detail.driver}</Descriptions.Item>
              <Descriptions.Item label="所属科室">{detail.dept}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={VEHICLE_STATUS_META[detail.status].color}>{VEHICLE_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="用车记录" style={{ marginBottom: 16 }}>
              {detail.usages.length
                ? <Table rowKey="date" dataSource={detail.usages} columns={usageColumns} size="small" pagination={false} />
                : <span style={{ color: '#999' }}>无用车记录</span>}
            </Card>
            <Card size="small" title="保养维修记录">
              {detail.maintenances.length
                ? <Table rowKey="date" dataSource={detail.maintenances} columns={maintenanceColumns} size="small" pagination={false} />
                : <span style={{ color: '#999' }}>无保养维修记录</span>}
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}

/**
 * 健澜科技 jlmedaios - 设备管理（M895）
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
import { useEquipmentWorkloadM895Store } from '@/store/equipmentWorkloadM895Store';
import type { EquipmentWorkload } from '@/services/api/equipmentWorkloadM895';

const simpleColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '项目', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: EquipmentWorkload) => void): ColumnsType<EquipmentWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '在用设备数', dataIndex: 'inUse', width: 120, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '故障设备数', dataIndex: 'broken', width: 120, align: 'right', render: (v: number) => <Tag color={v === 0 ? 'green' : 'red'}>{v}</Tag> },
  { title: '维护保养数', dataIndex: 'maintenance', width: 120, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '计量检定数', dataIndex: 'calibration', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '报废设备数', dataIndex: 'scrapped', width: 120, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '状态', dataIndex: 'status', width: 110 },
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

export default function EquipmentManagementM895Page() {
  usePageTitle('设备管理');
  const { items, loading, error, demo, load } = useEquipmentWorkloadM895Store();
  const [detail, setDetail] = useState<EquipmentWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="设备管理"
      description="日期 / 在用 / 故障 / 维护保养 / 计量检定 / 报废 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`设备工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="设备工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="在用设备数">{detail.inUse}</Descriptions.Item>
              <Descriptions.Item label="故障设备数">{detail.broken}</Descriptions.Item>
              <Descriptions.Item label="维护保养数">{detail.maintenance}</Descriptions.Item>
              <Descriptions.Item label="计量检定数">{detail.calibration}</Descriptions.Item>
              <Descriptions.Item label="报废设备数">{detail.scrapped}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="维护保养记录" span={2}>{detail.maintenanceRecord}</Descriptions.Item>
              <Descriptions.Item label="计量检定记录" span={2}>{detail.calibrationRecord}</Descriptions.Item>
              <Descriptions.Item label="设备采购计划" span={2}>{detail.procurementPlan}</Descriptions.Item>
              <Descriptions.Item label="故障率统计" span={2}>{detail.failureRate}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card size="small" title="设备分类（大型/中型/小型）">
                <Table rowKey="name" dataSource={detail.categoryBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="设备状态（在用/闲置/维修/报废）">
                <Table rowKey="name" dataSource={detail.statusBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}

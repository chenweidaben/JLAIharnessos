/**
 * 健澜科技 jlmedaios - 设备维护保养管理（M729，升级自 M279 简易页）
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
import { useMaintenanceM729Store } from '@/store/maintenancePlanM729Store';
import {
  MAINT_STATUS_META,
  MAINT_TYPE_META,
  type MaintenancePlan,
} from '@/services/api/maintenancePlanM729';

const recordColumns: ColumnsType<{ date: string; result: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '维护结果', dataIndex: 'result' },
];

const faultColumns: ColumnsType<{ date: string; fault: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '故障描述', dataIndex: 'fault' },
];

const buildColumns = (setDetail: (r: MaintenancePlan) => void): ColumnsType<MaintenancePlan> => [
  { title: '设备名称', dataIndex: 'equipName', ellipsis: true },
  {
    title: '维护类型',
    dataIndex: 'type',
    width: 130,
    render: (v: MaintenancePlan['type']) => <Tag color={MAINT_TYPE_META[v].color}>{MAINT_TYPE_META[v].label}</Tag>,
  },
  { title: '计划日期', dataIndex: 'plannedAt', width: 120 },
  { title: '责任人', dataIndex: 'owner', width: 140 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: MaintenancePlan['status']) => <Tag color={MAINT_STATUS_META[v].color}>{MAINT_STATUS_META[v].label}</Tag>,
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

export default function EquipmentMaintenancePage() {
  usePageTitle('设备维护保养管理');
  const { items, loading, error, demo, load } = useMaintenanceM729Store();
  const [detail, setDetail] = useState<MaintenancePlan | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="设备维护保养管理"
      description="设备名称 / 维护类型 / 计划日期 / 责任人 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`维护计划（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="维护计划详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="设备名称" span={2}>{detail.equipName}</Descriptions.Item>
              <Descriptions.Item label="维护类型">
                <Tag color={MAINT_TYPE_META[detail.type].color}>{MAINT_TYPE_META[detail.type].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="计划日期">{detail.plannedAt}</Descriptions.Item>
              <Descriptions.Item label="责任人">{detail.owner}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={MAINT_STATUS_META[detail.status].color}>{MAINT_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="维护内容" span={2}>{detail.content}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="维护记录" style={{ marginBottom: 16 }}>
              <Table rowKey="date" dataSource={detail.records} columns={recordColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="故障历史">
              {detail.faults.length
                ? <Table rowKey="date" dataSource={detail.faults} columns={faultColumns} size="small" pagination={false} />
                : <span style={{ color: '#999' }}>无故障历史</span>}
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}

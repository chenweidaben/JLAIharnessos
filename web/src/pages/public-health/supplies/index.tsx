/**
 * 健澜科技 jlmedaios - 应急物资储备管理（M765）
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
import { useEmergencySupplyM765Store } from '@/store/emergencySupplyM765Store';
import {
  SUPPLY_STATUS_META,
  type EmergencySupply,
} from '@/services/api/emergencySupplyM765';

const moveColumns: ColumnsType<{ date: string; type: string; qty: number }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  {
    title: '类型',
    dataIndex: 'type',
    width: 100,
    render: (v: string) => <Tag color={v === '入库' ? 'green' : 'orange'}>{v}</Tag>,
  },
  { title: '数量', dataIndex: 'qty', align: 'right' },
];

const buildColumns = (setDetail: (r: EmergencySupply) => void): ColumnsType<EmergencySupply> => [
  { title: '物资编码', dataIndex: 'code', width: 110 },
  { title: '物资名称', dataIndex: 'name', ellipsis: true },
  { title: '规格', dataIndex: 'spec', width: 130 },
  { title: '储备数量', dataIndex: 'qty', width: 110, align: 'right' },
  { title: '效期', dataIndex: 'expiryDate', width: 110 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: EmergencySupply['status']) => <Tag color={SUPPLY_STATUS_META[v].color}>{SUPPLY_STATUS_META[v].label}</Tag>,
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

export default function EmergencySuppliesM765Page() {
  usePageTitle('应急物资储备管理');
  const { items, loading, error, demo, load } = useEmergencySupplyM765Store();
  const [detail, setDetail] = useState<EmergencySupply | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="应急物资储备管理"
      description="物资编码 / 物资名称 / 规格 / 储备数量 / 效期 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`应急物资（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="应急物资详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="物资编码">{detail.code}</Descriptions.Item>
              <Descriptions.Item label="物资名称">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="规格">{detail.spec}</Descriptions.Item>
              <Descriptions.Item label="储备数量">{detail.qty}</Descriptions.Item>
              <Descriptions.Item label="效期">{detail.expiryDate}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={SUPPLY_STATUS_META[detail.status].color}>{SUPPLY_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="补货预警" span={2}>{detail.warning}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="出入库记录">
              <Table rowKey="date" dataSource={detail.movements} columns={moveColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}

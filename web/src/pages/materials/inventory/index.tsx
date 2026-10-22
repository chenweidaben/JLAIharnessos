/**
 * 健澜科技 jlmedaios - 耗材库存管理（M731）
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
import { useMaterialStockM731Store } from '@/store/materialStockM731Store';
import {
  STOCK_STATUS_META,
  type MaterialStock,
} from '@/services/api/materialStockM731';

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

const buildColumns = (setDetail: (r: MaterialStock) => void): ColumnsType<MaterialStock> => [
  { title: '耗材编码', dataIndex: 'code', width: 140 },
  { title: '耗材名称', dataIndex: 'name', ellipsis: true },
  { title: '规格', dataIndex: 'spec', width: 160 },
  { title: '库存数量', dataIndex: 'qty', width: 100, align: 'right' },
  { title: '效期', dataIndex: 'expiryDate', width: 110 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: MaterialStock['status']) => <Tag color={STOCK_STATUS_META[v].color}>{STOCK_STATUS_META[v].label}</Tag>,
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

export default function MaterialInventoryM731Page() {
  usePageTitle('耗材库存管理');
  const { items, loading, error, demo, load } = useMaterialStockM731Store();
  const [detail, setDetail] = useState<MaterialStock | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="耗材库存管理"
      description="耗材编码 / 耗材名称 / 规格 / 库存数量 / 效期 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`耗材库存（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="耗材库存详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="耗材编码">{detail.code}</Descriptions.Item>
              <Descriptions.Item label="耗材名称">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="规格">{detail.spec}</Descriptions.Item>
              <Descriptions.Item label="单价">¥{detail.unitPrice.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="当前库存">{detail.qty}</Descriptions.Item>
              <Descriptions.Item label="效期">{detail.expiryDate}</Descriptions.Item>
              <Descriptions.Item label="供应商" span={2}>{detail.supplier}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="出入库记录">
              <Table rowKey={(r) => `${r.date}-${r.type}-${r.qty}`} dataSource={detail.movements} columns={moveColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}

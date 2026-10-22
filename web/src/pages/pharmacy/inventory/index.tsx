/**
 * 健澜科技 jlmedaios - 药房库存管理（M687，升级自 M326 简易页）
 *
 * 三甲流程：库存 Table（药品名/规格/批号/数量/有效期/状态 badge）+ 低库存红字加粗。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import { Alert, Card, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePharmacyInventoryM687Store } from '@/store/pharmacyInventoryM687Store';
import {
  STOCK_STATUS_META,
  type PharmacyStock,
} from '@/services/api/pharmacyInventoryM687';

const columns: ColumnsType<PharmacyStock> = [
  { title: '药品名', dataIndex: 'drugName', width: 200 },
  { title: '规格', dataIndex: 'spec', width: 140 },
  { title: '批号', dataIndex: 'batchNo', width: 120 },
  {
    title: '库存数量',
    dataIndex: 'quantity',
    width: 120,
    align: 'right',
    render: (v: number, row) => (
      <span style={{ color: row.status === 'low' ? '#cf1322' : 'inherit', fontWeight: row.status === 'low' ? 600 : 400 }}>
        {v.toLocaleString()} {row.unit}
      </span>
    ),
  },
  { title: '有效期', dataIndex: 'expiryDate', width: 120 },
  {
    title: '库存状态',
    dataIndex: 'status',
    width: 110,
    render: (v: PharmacyStock['status']) => <Tag color={STOCK_STATUS_META[v].color}>{STOCK_STATUS_META[v].label}</Tag>,
  },
];

export default function PharmacyInventoryPage() {
  usePageTitle('药房库存管理');
  const { items, loading, error, demo, load } = usePharmacyInventoryM687Store();

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="药房库存管理"
      description="药品名 / 规格 / 库存数量 / 有效期 / 库存状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`库存（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 15 }} />
        </Spin>
      </Card>
    </PageContainer>
  );
}

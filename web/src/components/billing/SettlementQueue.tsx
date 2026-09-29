/**
 * 健澜科技 jlmedaios - 结算单队列组件（M3-B）
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { Button, Card, Table, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useBillingStore } from '@/store/billingStore';
import {
  PAYMENT_METHOD_LABEL,
  SETTLEMENT_STATUS_COLOR,
  SETTLEMENT_STATUS_LABEL,
  type Settlement,
} from '@/types/billing';

export default function SettlementQueue() {
  const { queue, loading, currentId, loadQueue, openDetail } = useBillingStore();

  const columns = [
    { title: '结算单号', dataIndex: 'settlementNo', key: 'settlementNo' },
    { title: '科室', dataIndex: 'department', key: 'department' },
    {
      title: '应收金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right' as const,
      render: (v: string) => `¥${v}`,
    },
    {
      title: '已退金额',
      dataIndex: 'refundedAmount',
      key: 'refundedAmount',
      align: 'right' as const,
      render: (v: string) => (Number(v) > 0 ? `¥${v}` : '—'),
    },
    {
      title: '支付方式',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (v: string) => PAYMENT_METHOD_LABEL[v as keyof typeof PAYMENT_METHOD_LABEL] ?? v,
    },
    {
      title: '状态',
      key: 'status',
      render: (_: unknown, row: Settlement) => (
        <Tag color={SETTLEMENT_STATUS_COLOR[row.status]}>
          {SETTLEMENT_STATUS_LABEL[row.status]}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, row: Settlement) => (
        <Button type="link" size="small" onClick={() => void openDetail(row.id)}>
          查看
        </Button>
      ),
    },
  ];

  return (
    <Card
      className="mb-4"
      title={`结算单队列（${queue.length}）`}
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void loadQueue()}
          data-testid="billing-refresh"
        >
          刷 新
        </Button>
      }
    >
      <Table<Settlement>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={queue}
        pagination={{ pageSize: 8 }}
        rowClassName={(row) => (row.id === currentId ? 'ant-table-row-selected' : '')}
        onRow={(row) => ({ onClick: () => void openDetail(row.id) })}
      />
    </Card>
  );
}

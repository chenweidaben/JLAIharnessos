/**
 * 健澜科技 jlmedaios - 医保结算对账（M726）
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
import { useReconciliationM726Store } from '@/store/reconciliationM726Store';
import {
  RECON_STATUS_META,
  type Reconciliation,
} from '@/services/api/reconciliationM726';

const fmt = (v: number): string => `¥${v.toLocaleString()}`;

const buildColumns = (setDetail: (r: Reconciliation) => void): ColumnsType<Reconciliation> => [
  { title: '对账日期', dataIndex: 'reconDate', width: 120 },
  { title: '申报总额', dataIndex: 'declaredTotal', width: 140, align: 'right', render: fmt },
  { title: '拨付总额', dataIndex: 'paidTotal', width: 140, align: 'right', render: fmt },
  {
    title: '差异金额',
    dataIndex: 'diffAmount',
    width: 130,
    align: 'right',
    render: (v: number) => (v ? <Tag color="red">{fmt(v)}</Tag> : <Tag color="green">0</Tag>),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 120,
    render: (v: Reconciliation['status']) => <Tag color={RECON_STATUS_META[v].color}>{RECON_STATUS_META[v].label}</Tag>,
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

export default function ReconciliationM726Page() {
  usePageTitle('医保结算对账');
  const { items, loading, error, demo, load } = useReconciliationM726Store();
  const [detail, setDetail] = useState<Reconciliation | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="医保结算对账"
      description="对账日期 / 申报总额 / 拨付总额 / 差异金额 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`医保对账（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="医保结算对账详情"
        width={680}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="对账日期">{detail.reconDate}</Descriptions.Item>
            <Descriptions.Item label="申报总额">{fmt(detail.declaredTotal)}</Descriptions.Item>
            <Descriptions.Item label="拨付总额">{fmt(detail.paidTotal)}</Descriptions.Item>
            <Descriptions.Item label="差异金额">{detail.diffAmount ? fmt(detail.diffAmount) : '0（一致）'}</Descriptions.Item>
            <Descriptions.Item label="差异原因">{detail.diffReason}</Descriptions.Item>
            <Descriptions.Item label="处理结果">{detail.handleResult}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={RECON_STATUS_META[detail.status].color}>{RECON_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}

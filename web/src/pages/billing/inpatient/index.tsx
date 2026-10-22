/**
 * 健澜科技 jlmedaios - 住院结算管理（M724）
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
import { useInpatientBillM724Store } from '@/store/inpatientBillM724Store';
import {
  SETTLE_STATUS_META,
  type InpatientBill,
} from '@/services/api/inpatientBillM724';

const feeCatColumns: ColumnsType<{ name: string; amount: number }> = [
  { title: '费用分类', dataIndex: 'name' },
  { title: '金额', dataIndex: 'amount', align: 'right', render: (v: number) => `¥${v.toLocaleString()}` },
];

const depositColumns: ColumnsType<{ time: string; amount: number; method: string }> = [
  { title: '时间', dataIndex: 'time' },
  { title: '金额', dataIndex: 'amount', align: 'right', render: (v: number) => `¥${v.toLocaleString()}` },
  { title: '支付方式', dataIndex: 'method' },
];

const buildColumns = (setDetail: (r: InpatientBill) => void): ColumnsType<InpatientBill> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 120 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '押金总额', dataIndex: 'depositTotal', width: 120, align: 'right', render: (v: number) => `¥${v.toLocaleString()}` },
  { title: '总费用', dataIndex: 'totalFee', width: 120, align: 'right', render: (v: number) => `¥${v.toLocaleString()}` },
  { title: '自付金额', dataIndex: 'selfPay', width: 120, align: 'right', render: (v: number) => `¥${v.toLocaleString()}` },
  {
    title: '结算状态',
    dataIndex: 'status',
    width: 110,
    render: (v: InpatientBill['status']) => <Tag color={SETTLE_STATUS_META[v].color}>{SETTLE_STATUS_META[v].label}</Tag>,
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

export default function InpatientBillingM724Page() {
  usePageTitle('住院结算管理');
  const { items, loading, error, demo, load } = useInpatientBillM724Store();
  const [detail, setDetail] = useState<InpatientBill | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="住院结算管理"
      description="住院号 / 患者 / 押金总额 / 总费用 / 自付金额 / 结算状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`住院结算（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="住院结算详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
              <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
              <Descriptions.Item label="押金总额">¥{detail.depositTotal.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="总费用">¥{detail.totalFee.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="自付金额">¥{detail.selfPay.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={SETTLE_STATUS_META[detail.status].color}>{SETTLE_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="费用分类明细" style={{ marginBottom: 16 }}>
              <Table rowKey="name" dataSource={detail.feeCategories} columns={feeCatColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="押金记录">
              <Table rowKey="time" dataSource={detail.depositRecords} columns={depositColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}

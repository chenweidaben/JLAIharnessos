/**
 * 健澜科技 jlmedaios - 耗材采购申请管理（M732）
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
import { usePurchaseRequestM732Store } from '@/store/purchaseRequestM732Store';
import {
  PURCHASE_STATUS_META,
  type PurchaseRequest,
} from '@/services/api/purchaseRequestM732';

const itemColumns: ColumnsType<{ name: string; spec: string; qty: number }> = [
  { title: '耗材名称', dataIndex: 'name' },
  { title: '规格', dataIndex: 'spec' },
  { title: '数量', dataIndex: 'qty', align: 'right' },
];

const approvalColumns: ColumnsType<{ step: string; by: string; result: string }> = [
  { title: '审批环节', dataIndex: 'step' },
  { title: '审批人', dataIndex: 'by' },
  {
    title: '结果',
    dataIndex: 'result',
    render: (v: string) =>
      v === '同意' ? <Tag color="green">{v}</Tag> : v === '驳回' ? <Tag color="red">{v}</Tag> : <Tag color="orange">{v}</Tag>,
  },
];

const buildColumns = (setDetail: (r: PurchaseRequest) => void): ColumnsType<PurchaseRequest> => [
  { title: '申请单号', dataIndex: 'requestNo', width: 140 },
  { title: '申请科室', dataIndex: 'dept', width: 110 },
  { title: '耗材名称', dataIndex: 'materialName', ellipsis: true },
  { title: '数量', dataIndex: 'qty', width: 90, align: 'right' },
  { title: '预算金额', dataIndex: 'budget', width: 120, align: 'right', render: (v: number) => `¥${v.toLocaleString()}` },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: PurchaseRequest['status']) => <Tag color={PURCHASE_STATUS_META[v].color}>{PURCHASE_STATUS_META[v].label}</Tag>,
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

export default function MaterialPurchaseM732Page() {
  usePageTitle('耗材采购申请管理');
  const { items, loading, error, demo, load } = usePurchaseRequestM732Store();
  const [detail, setDetail] = useState<PurchaseRequest | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="耗材采购申请管理"
      description="申请单号 / 申请科室 / 耗材名称 / 数量 / 预算金额 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`采购申请（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="采购申请详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="申请单号">{detail.requestNo}</Descriptions.Item>
              <Descriptions.Item label="申请科室">{detail.dept}</Descriptions.Item>
              <Descriptions.Item label="预算金额">¥{detail.budget.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={PURCHASE_STATUS_META[detail.status].color}>{PURCHASE_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="申请明细" style={{ marginBottom: 16 }}>
              <Table rowKey="name" dataSource={detail.items} columns={itemColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="审批记录" style={{ marginBottom: 16 }}>
              <Table rowKey="step" dataSource={detail.approvals} columns={approvalColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="采购进度">{detail.progress}</Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}

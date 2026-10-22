/**
 * 健澜科技 jlmedaios - 门诊收费管理（M723）
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
import { useOutpatientBillM723Store } from '@/store/outpatientBillM723Store';
import {
  BILL_STATUS_META,
  PAY_METHOD_META,
  type OutpatientBill,
} from '@/services/api/outpatientBillM723';

const itemColumns: ColumnsType<{ name: string; qty: number; price: number }> = [
  { title: '项目', dataIndex: 'name' },
  { title: '数量', dataIndex: 'qty', align: 'right' },
  { title: '单价', dataIndex: 'price', align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
];

const buildColumns = (setDetail: (r: OutpatientBill) => void): ColumnsType<OutpatientBill> => [
  { title: '收费号', dataIndex: 'billNo', width: 150 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '科室', dataIndex: 'dept', width: 130 },
  { title: '金额', dataIndex: 'totalFee', width: 110, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
  {
    title: '支付方式',
    dataIndex: 'payMethod',
    width: 120,
    render: (v: OutpatientBill['payMethod']) => PAY_METHOD_META[v],
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: OutpatientBill['status']) => <Tag color={BILL_STATUS_META[v].color}>{BILL_STATUS_META[v].label}</Tag>,
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

export default function OutpatientBillingM723Page() {
  usePageTitle('门诊收费管理');
  const { items, loading, error, demo, load } = useOutpatientBillM723Store();
  const [detail, setDetail] = useState<OutpatientBill | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="门诊收费管理"
      description="收费号 / 患者 / 科室 / 金额 / 支付方式 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`门诊收费单（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="门诊收费详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="收费号">{detail.billNo}</Descriptions.Item>
              <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
              <Descriptions.Item label="科室">{detail.dept}</Descriptions.Item>
              <Descriptions.Item label="金额">¥{detail.totalFee.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="支付方式">{PAY_METHOD_META[detail.payMethod]}</Descriptions.Item>
              <Descriptions.Item label="发票号">{detail.invoiceNo}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="费用明细">
              <Table rowKey="name" dataSource={detail.items} columns={itemColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}

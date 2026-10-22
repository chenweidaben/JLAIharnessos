/**
 * 健澜科技 jlmedaios - 门诊药房发药管理（M713）
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
import { useOutpatientRxM713Store } from '@/store/outpatientPrescriptionM713Store';
import {
  RX_STATUS_META,
  type OutpatientPrescription,
} from '@/services/api/outpatientPrescriptionM713';

const itemColumns: ColumnsType<{ name: string; spec: string; dose: string; qty: number }> = [
  { title: '药品名称', dataIndex: 'name' },
  { title: '规格', dataIndex: 'spec' },
  { title: '用法用量', dataIndex: 'dose' },
  { title: '数量', dataIndex: 'qty', align: 'right' },
];

const buildColumns = (setDetail: (r: OutpatientPrescription) => void): ColumnsType<OutpatientPrescription> => [
  { title: '处方号', dataIndex: 'rxNo', width: 140 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '科室', dataIndex: 'dept', width: 130 },
  { title: '药品数', dataIndex: 'drugCount', width: 90, align: 'right' },
  { title: '金额', dataIndex: 'totalFee', width: 110, align: 'right', render: (v: number) => `¥${v.toFixed(2)}` },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: OutpatientPrescription['status']) => <Tag color={RX_STATUS_META[v].color}>{RX_STATUS_META[v].label}</Tag>,
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

export default function OutpatientDispensingM713Page() {
  usePageTitle('门诊药房发药管理');
  const { items, loading, error, demo, load } = useOutpatientRxM713Store();
  const [detail, setDetail] = useState<OutpatientPrescription | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="门诊药房发药管理"
      description="处方号 / 患者 / 科室 / 药品数 / 金额 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`门诊处方（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="门诊处方详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="处方号">{detail.rxNo}</Descriptions.Item>
              <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
              <Descriptions.Item label="科室">{detail.dept}</Descriptions.Item>
              <Descriptions.Item label="金额">¥{detail.totalFee.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="发药药师">{detail.dispenser}</Descriptions.Item>
              <Descriptions.Item label="核对药师">{detail.verifier}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="处方明细">
              <Table rowKey="name" dataSource={detail.items} columns={itemColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}

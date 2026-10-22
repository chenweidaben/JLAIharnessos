/**
 * 健澜科技 jlmedaios - 药剂科管理（M872）
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
import { usePharmacyWorkloadM872Store } from '@/store/pharmacyWorkloadM872Store';
import type { PharmacyWorkload } from '@/services/api/pharmacyWorkloadM872';

const reviewColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '处方点评结果', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: PharmacyWorkload) => void): ColumnsType<PharmacyWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊处方数', dataIndex: 'outpatientPrescriptions', width: 140, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '住院医嘱数', dataIndex: 'inpatientOrders', width: 130, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  {
    title: '抗菌药物使用强度',
    dataIndex: 'auc',
    width: 170,
    align: 'right',
    render: (v: number) => <Tag color={v > 40 ? 'orange' : 'green'}>{v} DDDs</Tag>,
  },
  { title: '处方点评数', dataIndex: 'prescriptionReviews', width: 130, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '状态', dataIndex: 'status', width: 110 },
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

export default function PharmacyManagementM872Page() {
  usePageTitle('药剂科管理');
  const { items, loading, error, demo, load } = usePharmacyWorkloadM872Store();
  const [detail, setDetail] = useState<PharmacyWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="药剂科管理"
      description="日期 / 门诊处方数 / 住院医嘱数 / 抗菌药物使用强度 / 处方点评数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`药剂科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="药剂科工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊处方数">{detail.outpatientPrescriptions}</Descriptions.Item>
              <Descriptions.Item label="住院医嘱数">{detail.inpatientOrders}</Descriptions.Item>
              <Descriptions.Item label="抗菌药物使用强度">{detail.auc} DDDs/100 人天</Descriptions.Item>
              <Descriptions.Item label="处方点评数">{detail.prescriptionReviews}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="抗菌药物使用强度（DDDs）" span={2}>{detail.aucDetail}</Descriptions.Item>
              <Descriptions.Item label="特殊药品管理（麻精药品）" span={2}>{detail.controlledDrugs}</Descriptions.Item>
              <Descriptions.Item label="药品不良反应（ADR）报告" span={2}>{detail.adr}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="处方点评结果（合理/不合理）">
              <Table rowKey="name" dataSource={detail.reviewResults} columns={reviewColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}

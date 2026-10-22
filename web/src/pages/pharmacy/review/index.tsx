/**
 * 健澜科技 jlmedaios - 药剂科处方审核（M691）
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
import { usePharmacyReviewM691Store } from '@/store/pharmacyReviewM691Store';
import {
  REVIEW_STATUS_META,
  type PharmacyReview,
} from '@/services/api/pharmacyReviewM691';

const yuan = (v: number) => `¥${v.toFixed(2)}`;

const buildColumns = (setDetail: (r: PharmacyReview) => void): ColumnsType<PharmacyReview> => [
  { title: '处方号', dataIndex: 'rxNo', width: 140 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '科室', dataIndex: 'dept', width: 110 },
  { title: '开方医师', dataIndex: 'doctor', width: 110 },
  { title: '药品数', dataIndex: 'itemCount', width: 90, align: 'right' },
  { title: '金额', dataIndex: 'totalAmount', width: 110, align: 'right', render: (v: number) => yuan(v) },
  {
    title: '审核状态',
    dataIndex: 'status',
    width: 110,
    render: (v: PharmacyReview['status']) => <Tag color={REVIEW_STATUS_META[v].color}>{REVIEW_STATUS_META[v].label}</Tag>,
  },
  { title: '审核药师', dataIndex: 'pharmacist', width: 130, render: (v: string) => v || '—' },
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

export default function PharmacyReviewM691Page() {
  usePageTitle('处方审核');
  const { items, loading, error, demo, load } = usePharmacyReviewM691Store();
  const [detail, setDetail] = useState<PharmacyReview | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="药剂科处方审核"
      description="处方号 / 患者 / 药品数 / 审核状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`处方审核（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="处方审核详情"
        width={680}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="处方号">{detail.rxNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="科室">{detail.dept}</Descriptions.Item>
            <Descriptions.Item label="开方医师">{detail.doctor}</Descriptions.Item>
            <Descriptions.Item label="药品项数">{detail.itemCount}</Descriptions.Item>
            <Descriptions.Item label="总金额">{yuan(detail.totalAmount)}</Descriptions.Item>
            <Descriptions.Item label="审核状态">
              <Tag color={REVIEW_STATUS_META[detail.status].color}>{REVIEW_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="审核意见">{detail.reviewNote || '—'}</Descriptions.Item>
            <Descriptions.Item label="审核药师">{detail.pharmacist || '—'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}

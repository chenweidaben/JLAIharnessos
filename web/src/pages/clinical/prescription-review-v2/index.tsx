/**
 * 健澜科技 jlmedaios - 处方点评（M661，配套 M552）
 *
 * 三甲流程：处方 Table（处方号/药品/结果 badge/不合理类型 badge）+ 详情 Modal。
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
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePrescriptionReviewV2M661Store } from '@/store/prescriptionReviewV2M661Store';
import {
  IRRATIONAL_TYPE_META,
  REVIEW_RESULT_META,
  type PrescriptionReview,
} from '@/services/api/prescriptionReviewV2M661';

const buildColumns = (setDetail: (row: PrescriptionReview) => void): ColumnsType<PrescriptionReview> => [
  { title: '处方号', dataIndex: 'prescriptionNo', width: 110 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  {
    title: '药品',
    dataIndex: 'drugs',
    ellipsis: true,
    render: (drugs: string[]) => (
      <Space size={[4, 4]} wrap>
        {drugs.map((d) => (
          <Tag key={d}>{d}</Tag>
        ))}
      </Space>
    ),
  },
  { title: '开方医师', dataIndex: 'prescriber', width: 100 },
  {
    title: '点评结果',
    dataIndex: 'reviewResult',
    width: 110,
    render: (v: PrescriptionReview['reviewResult']) => (
      <Tag color={REVIEW_RESULT_META[v].color}>{REVIEW_RESULT_META[v].label}</Tag>
    ),
  },
  {
    title: '不合理类型',
    dataIndex: 'irrationalType',
    width: 150,
    render: (v: PrescriptionReview['irrationalType']) => (
      <Tag color={IRRATIONAL_TYPE_META[v].color}>{IRRATIONAL_TYPE_META[v].label}</Tag>
    ),
  },
  {
    title: '点评时间',
    dataIndex: 'reviewedAt',
    width: 150,
    render: (v: string) => (v ? dayjs(v).format('MM-DD HH:mm') : '—'),
  },
  { title: '药师', dataIndex: 'reviewer', width: 100, render: (v: string) => v || '—' },
  {
    title: '操作',
    dataIndex: 'id',
    width: 90,
    render: (_v, row) => (
      <Button type="link" size="small" onClick={() => setDetail(row)}>
        详情
      </Button>
    ),
  },
];

export default function PrescriptionReviewV2M661Page() {
  usePageTitle('处方点评');

  const { items, loading, error, demo, load } = usePrescriptionReviewV2M661Store();

  const [detail, setDetail] = useState<PrescriptionReview | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="处方点评（v2）"
      description="处方号 / 点评结果 / 不合理类型"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`点评记录（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="处方点评详情"
        width={720}
        footer={
          <Space>
            <Button onClick={() => setDetail(null)}>关闭</Button>
          </Space>
        }
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="处方号">{detail.prescriptionNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="开方医师">{detail.prescriber}</Descriptions.Item>
            <Descriptions.Item label="药品清单">
              {detail.drugs.map((d) => (
                <Tag key={d} style={{ marginBottom: 4 }}>
                  {d}
                </Tag>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="点评结果">
              <Tag color={REVIEW_RESULT_META[detail.reviewResult].color}>
                {REVIEW_RESULT_META[detail.reviewResult].label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="不合理类型">
              <Tag color={IRRATIONAL_TYPE_META[detail.irrationalType].color}>
                {IRRATIONAL_TYPE_META[detail.irrationalType].label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="点评意见">{detail.comment || '—'}</Descriptions.Item>
            <Descriptions.Item label="点评药师">{detail.reviewer || '—'}</Descriptions.Item>
            <Descriptions.Item label="点评时间">
              {detail.reviewedAt ? dayjs(detail.reviewedAt).format('YYYY-MM-DD HH:mm') : '—'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}

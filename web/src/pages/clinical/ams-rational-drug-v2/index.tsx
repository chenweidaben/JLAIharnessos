/**
 * 健澜科技 jlmedaios - AMS 合理用药（M668，配套 M563）
 *
 * 三甲流程：抗菌药物点评 Table（药品/科室/DDD/结果 badge）+ 详情 Modal。
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
import { useAmsRationalDrugV2M668Store } from '@/store/amsRationalDrugV2M668Store';
import {
  AMS_RESULT_META,
  type AmsReview,
} from '@/services/api/amsRationalDrugV2M668';

const buildColumns = (setDetail: (row: AmsReview) => void): ColumnsType<AmsReview> => [
  { title: '点评号', dataIndex: 'id', width: 110 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '科室', dataIndex: 'dept', width: 120 },
  { title: '抗菌药物', dataIndex: 'drugName', ellipsis: true },
  { title: 'DDD', dataIndex: 'ddd', width: 90, align: 'right' },
  { title: '病原菌', dataIndex: 'pathogen', width: 220, render: (v?: string) => v ?? '—' },
  {
    title: '点评结果',
    dataIndex: 'result',
    width: 110,
    render: (v: AmsReview['result']) => <Tag color={AMS_RESULT_META[v].color}>{AMS_RESULT_META[v].label}</Tag>,
  },
  { title: '点评时间', dataIndex: 'reviewedAt', width: 150, render: (v: string) => (v ? dayjs(v).format('MM-DD HH:mm') : '—') },
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

export default function AmsRationalDrugV2M668Page() {
  usePageTitle('AMS 合理用药');

  const { items, loading, error, demo, load } = useAmsRationalDrugV2M668Store();

  const [detail, setDetail] = useState<AmsReview | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="AMS 抗菌药物点评（v2）"
      description="药品 / 科室 / DDD / 点评结果"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`抗菌药物点评（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="AMS 点评详情"
        footer={
          <Space>
            <Button onClick={() => setDetail(null)}>关闭</Button>
          </Space>
        }
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="点评号">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="科室">{detail.dept}</Descriptions.Item>
            <Descriptions.Item label="抗菌药物">{detail.drugName}</Descriptions.Item>
            <Descriptions.Item label="DDD">{detail.ddd}</Descriptions.Item>
            <Descriptions.Item label="病原菌">{detail.pathogen ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="点评结果">
              <Tag color={AMS_RESULT_META[detail.result].color}>{AMS_RESULT_META[detail.result].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="点评意见">{detail.comment || '—'}</Descriptions.Item>
            <Descriptions.Item label="点评药师">{detail.pharmacist || '—'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}

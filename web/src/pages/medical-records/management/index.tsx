/**
 * 健澜科技 jlmedaios - 病案管理（M877）
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
import { useMedicalRecordsWorkloadM877Store } from '@/store/medicalRecordsWorkloadM877Store';
import type { MedicalRecordsWorkload } from '@/services/api/medicalRecordsWorkloadM877';

const buildColumns = (setDetail: (r: MedicalRecordsWorkload) => void): ColumnsType<MedicalRecordsWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '出院病案数', dataIndex: 'discharged', width: 130, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '归档数', dataIndex: 'archived', width: 110, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '复印数', dataIndex: 'copies', width: 100, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '借阅数', dataIndex: 'borrowed', width: 100, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  {
    title: '编码合格率(%)',
    dataIndex: 'codingQualifiedRate',
    width: 150,
    align: 'right',
    render: (v: number) => <Tag color={v >= 98 ? 'green' : 'orange'}>{v}%</Tag>,
  },
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

export default function MedicalRecordsManagementM877Page() {
  usePageTitle('病案管理');
  const { items, loading, error, demo, load } = useMedicalRecordsWorkloadM877Store();
  const [detail, setDetail] = useState<MedicalRecordsWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="病案管理"
      description="日期 / 出院病案数 / 归档数 / 复印数 / 借阅数 / 编码合格率 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`病案工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1500 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="病案工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
            <Descriptions.Item label="出院病案数">{detail.discharged}</Descriptions.Item>
            <Descriptions.Item label="归档数">{detail.archived}</Descriptions.Item>
            <Descriptions.Item label="复印数">{detail.copies}</Descriptions.Item>
            <Descriptions.Item label="借阅数">{detail.borrowed}</Descriptions.Item>
            <Descriptions.Item label="编码合格率">{detail.codingQualifiedRate}%</Descriptions.Item>
            <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
            <Descriptions.Item label="病案归档率" span={2}>{detail.archiveRate}</Descriptions.Item>
            <Descriptions.Item label="病案首页合格率" span={2}>{detail.homepageQuality}</Descriptions.Item>
            <Descriptions.Item label="编码准确率（ICD-10/手术操作）" span={2}>{detail.codingAccuracy}</Descriptions.Item>
            <Descriptions.Item label="复印申请处理时间" span={2}>{detail.copyTime}</Descriptions.Item>
            <Descriptions.Item label="借阅记录" span={2}>{detail.borrowRecords}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}

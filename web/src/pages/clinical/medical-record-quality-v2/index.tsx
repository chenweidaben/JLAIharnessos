/**
 * 健澜科技 jlmedaios - 病历质控（M670，配套 M566）
 *
 * 三甲流程：质控 Table（病历号/科室/缺陷类型/扣分/得分/整改状态）+ 详情 Modal。
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
  Progress,
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useMedicalRecordQualityV2M670Store } from '@/store/medicalRecordQualityV2M670Store';
import {
  RECTIFY_META,
  type MedicalRecordQuality,
} from '@/services/api/medicalRecordQualityV2M670';

const buildColumns = (setDetail: (row: MedicalRecordQuality) => void): ColumnsType<MedicalRecordQuality> => [
  { title: '病历号', dataIndex: 'recordNo', width: 120 },
  { title: '科室', dataIndex: 'dept', width: 120 },
  { title: '经治医师', dataIndex: 'doctor', width: 110 },
  { title: '缺陷类型', dataIndex: 'defectType', ellipsis: true },
  { title: '扣分', dataIndex: 'deduction', width: 90, align: 'right', render: (v: number) => <span style={{ color: '#cf1322' }}>-{v}</span> },
  {
    title: '最终得分',
    dataIndex: 'finalScore',
    width: 200,
    sorter: (a, b) => a.finalScore - b.finalScore,
    render: (v: number) => (
      <Progress
        percent={v}
        size="small"
        strokeColor={v >= 95 ? '#3f8600' : v >= 90 ? '#faad14' : '#cf1322'}
      />
    ),
  },
  {
    title: '整改状态',
    dataIndex: 'status',
    width: 110,
    render: (v: MedicalRecordQuality['status']) => (
      <Tag color={RECTIFY_META[v].color}>{RECTIFY_META[v].label}</Tag>
    ),
  },
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

export default function MedicalRecordQualityV2M670Page() {
  usePageTitle('病历质控');

  const { items, loading, error, demo, load } = useMedicalRecordQualityV2M670Store();

  const [detail, setDetail] = useState<MedicalRecordQuality | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="病历质控（v2）"
      description="病历号 / 缺陷项 / 质控得分 / 整改状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`质控缺陷（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="质控详情"
        footer={
          <Space>
            <Button onClick={() => setDetail(null)}>关闭</Button>
          </Space>
        }
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="病历号">{detail.recordNo}</Descriptions.Item>
            <Descriptions.Item label="科室">{detail.dept}</Descriptions.Item>
            <Descriptions.Item label="经治医师">{detail.doctor}</Descriptions.Item>
            <Descriptions.Item label="缺陷类型">{detail.defectType}</Descriptions.Item>
            <Descriptions.Item label="扣分">-{detail.deduction}</Descriptions.Item>
            <Descriptions.Item label="最终得分">{detail.finalScore}</Descriptions.Item>
            <Descriptions.Item label="整改状态">
              <Tag color={RECTIFY_META[detail.status].color}>{RECTIFY_META[detail.status].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="质控意见">{detail.comment || '—'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}

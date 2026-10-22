/**
 * 健澜科技 jlmedaios - 患者随访管理（M669，配套 M564）
 *
 * 三甲流程：随访 Table（患者/类型 badge/计划日期/状态 badge）+ 记录 Modal。
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
import { usePatientFollowupV2M669Store } from '@/store/patientFollowupV2M669Store';
import {
  FOLLOWUP_STATUS_META,
  FOLLOWUP_TYPE_META,
  type PatientFollowup,
} from '@/services/api/patientFollowupV2M669';

const buildColumns = (setDetail: (row: PatientFollowup) => void): ColumnsType<PatientFollowup> => [
  { title: '随访号', dataIndex: 'id', width: 100 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  {
    title: '随访类型',
    dataIndex: 'type',
    width: 130,
    render: (v: PatientFollowup['type']) => (
      <Tag color={FOLLOWUP_TYPE_META[v].color}>{FOLLOWUP_TYPE_META[v].label}</Tag>
    ),
  },
  { title: '计划日期', dataIndex: 'plannedDate', width: 120 },
  {
    title: '完成状态',
    dataIndex: 'status',
    width: 110,
    render: (v: PatientFollowup['status']) => (
      <Tag color={FOLLOWUP_STATUS_META[v].color}>{FOLLOWUP_STATUS_META[v].label}</Tag>
    ),
  },
  { title: '完成时间', dataIndex: 'completedAt', width: 150, render: (v: string | null) => (v ? dayjs(v).format('MM-DD HH:mm') : '—') },
  { title: '随访人', dataIndex: 'followupBy', width: 110 },
  {
    title: '操作',
    dataIndex: 'id',
    width: 90,
    render: (_v, row) => (
      <Button type="link" size="small" onClick={() => setDetail(row)}>
        记录
      </Button>
    ),
  },
];

export default function PatientFollowupV2M669Page() {
  usePageTitle('患者随访管理');

  const { items, loading, error, demo, load } = usePatientFollowupV2M669Store();

  const [detail, setDetail] = useState<PatientFollowup | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="患者随访管理（v2）"
      description="随访类型 / 计划日期 / 完成状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`随访计划（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="随访记录详情"
        width={680}
        footer={
          <Space>
            <Button onClick={() => setDetail(null)}>关闭</Button>
          </Space>
        }
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="随访号">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="随访类型">
              <Tag color={FOLLOWUP_TYPE_META[detail.type].color}>{FOLLOWUP_TYPE_META[detail.type].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="计划日期">{detail.plannedDate}</Descriptions.Item>
            <Descriptions.Item label="完成状态">
              <Tag color={FOLLOWUP_STATUS_META[detail.status].color}>{FOLLOWUP_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="完成时间">
              {detail.completedAt ? dayjs(detail.completedAt).format('YYYY-MM-DD HH:mm') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="随访摘要">{detail.summary || '—'}</Descriptions.Item>
            <Descriptions.Item label="随访人">{detail.followupBy}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}

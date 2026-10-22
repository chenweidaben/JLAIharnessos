/**
 * 健澜科技 jlmedaios - 手术排程管理（M683）
 *
 * 列表 + 详情 Modal 视图，与既有 surgery/schedule 日/周看板并存，
 * 路由：surgery/schedule-list。
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
import { useSurgeryScheduleM683Store } from '@/store/surgeryScheduleM683Store';
import {
  SCHEDULE_STATUS_META,
  type SurgerySchedule,
} from '@/services/api/surgeryScheduleM683';

const buildColumns = (setDetail: (r: SurgerySchedule) => void): ColumnsType<SurgerySchedule> => [
  { title: '日期', dataIndex: 'date', width: 110 },
  { title: '手术间', dataIndex: 'orRoom', width: 120 },
  { title: '时段', dataIndex: 'timeSlot', width: 140 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '手术名称', dataIndex: 'surgeryName', ellipsis: true },
  { title: '术者', dataIndex: 'surgeon', width: 100 },
  { title: '麻醉', dataIndex: 'anesthesiaType', width: 120 },
  { title: '切口', dataIndex: 'incisionClass', width: 80 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: SurgerySchedule['status']) => <Tag color={SCHEDULE_STATUS_META[v].color}>{SCHEDULE_STATUS_META[v].label}</Tag>,
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

export default function SurgeryScheduleListM683Page() {
  usePageTitle('手术排程管理');
  const { items, loading, error, demo, load } = useSurgeryScheduleM683Store();
  const [detail, setDetail] = useState<SurgerySchedule | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="手术排程管理（列表视图）"
      description="日期 / 手术间 / 手术名称 / 术者 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`排程列表（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="手术排程详情"
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
            <Descriptions.Item label="手术间">{detail.orRoom}</Descriptions.Item>
            <Descriptions.Item label="时段">{detail.timeSlot}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="手术名称">{detail.surgeryName}</Descriptions.Item>
            <Descriptions.Item label="术者">{detail.surgeon}</Descriptions.Item>
            <Descriptions.Item label="麻醉方式">{detail.anesthesiaType}</Descriptions.Item>
            <Descriptions.Item label="切口等级">{detail.incisionClass}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={SCHEDULE_STATUS_META[detail.status].color}>{SCHEDULE_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}

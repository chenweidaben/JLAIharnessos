/**
 * 健澜科技 jlmedaios - 医疗不良事件上报（M706）
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
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useQualityAdverseEventM706Store } from '@/store/qualityAdverseEventM706Store';
import {
  EVENT_LEVEL_META,
  EVENT_STATUS_META,
  type AdverseEvent,
} from '@/services/api/qualityAdverseEventM706';

const buildColumns = (setDetail: (r: AdverseEvent) => void): ColumnsType<AdverseEvent> => [
  { title: '事件号', dataIndex: 'eventNo', width: 130 },
  { title: '事件类型', dataIndex: 'eventType', width: 130 },
  {
    title: '级别',
    dataIndex: 'level',
    width: 110,
    render: (v: AdverseEvent['level']) => <Tag color={EVENT_LEVEL_META[v].color}>{EVENT_LEVEL_META[v].label}</Tag>,
  },
  { title: '发生时间', dataIndex: 'occurredAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  {
    title: '上报状态',
    dataIndex: 'status',
    width: 120,
    render: (v: AdverseEvent['status']) => <Tag color={EVENT_STATUS_META[v].color}>{EVENT_STATUS_META[v].label}</Tag>,
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

export default function QualityAdverseEventM706Page() {
  usePageTitle('医疗不良事件上报');
  const { items, loading, error, demo, load } = useQualityAdverseEventM706Store();
  const [detail, setDetail] = useState<AdverseEvent | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="医疗不良事件上报"
      description="事件号 / 事件类型 / 级别 / 发生时间 / 上报状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`不良事件（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="不良事件详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="事件号">{detail.eventNo}</Descriptions.Item>
            <Descriptions.Item label="事件类型">{detail.eventType}</Descriptions.Item>
            <Descriptions.Item label="级别">
              <Tag color={EVENT_LEVEL_META[detail.level].color}>{EVENT_LEVEL_META[detail.level].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="发生时间">{dayjs(detail.occurredAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="事件经过">{detail.description}</Descriptions.Item>
            <Descriptions.Item label="原因分析">{detail.rootCause}</Descriptions.Item>
            <Descriptions.Item label="整改措施">{detail.correctiveAction}</Descriptions.Item>
            <Descriptions.Item label="追踪结果">{detail.followUp}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={EVENT_STATUS_META[detail.status].color}>{EVENT_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}

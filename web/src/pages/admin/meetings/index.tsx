/**
 * 健澜科技 jlmedaios - 会议管理（M748）
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
import { useMeetingM748Store } from '@/store/meetingM748Store';
import {
  MEETING_STATUS_META,
  type Meeting,
} from '@/services/api/meetingM748';

const buildColumns = (setDetail: (r: Meeting) => void): ColumnsType<Meeting> => [
  { title: '会议主题', dataIndex: 'topic', ellipsis: true },
  {
    title: '会议时间',
    dataIndex: 'heldAt',
    width: 150,
    render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
  },
  { title: '会议室', dataIndex: 'room', width: 200, ellipsis: true },
  { title: '参会人数', dataIndex: 'participantCount', width: 100, align: 'right' },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (v: Meeting['status']) => <Tag color={MEETING_STATUS_META[v].color}>{MEETING_STATUS_META[v].label}</Tag>,
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

export default function MeetingsM748Page() {
  usePageTitle('会议管理');
  const { items, loading, error, demo, load } = useMeetingM748Store();
  const [detail, setDetail] = useState<Meeting | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="会议管理"
      description="会议主题 / 会议时间 / 会议室 / 参会人数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`会议列表（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="会议详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="会议主题" span={2}>{detail.topic}</Descriptions.Item>
              <Descriptions.Item label="会议时间">{dayjs(detail.heldAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="会议室">{detail.room}</Descriptions.Item>
              <Descriptions.Item label="参会人数">{detail.participantCount}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={MEETING_STATUS_META[detail.status].color}>{MEETING_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="会议议程" span={2}>{detail.agenda}</Descriptions.Item>
              <Descriptions.Item label="会议纪要" span={2}>{detail.minutes}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="参会人员">
              {detail.attendees.map((a) => <Tag key={a} color="blue" style={{ marginBottom: 4 }}>{a}</Tag>)}
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}

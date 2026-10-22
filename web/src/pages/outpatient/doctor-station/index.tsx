/**
 * 健澜科技 jlmedaios - 门诊医生站（M675）
 *
 * 三甲流程：候诊队列 Table（序号/患者/类型 badge/状态 badge/主诉）+ 快捷叫号/问诊操作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Space, Spin, Table, Tabs, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useOutpatientDoctorStationM675Store } from '@/store/outpatientDoctorStationM675Store';
import {
  QUEUE_STATUS_META,
  VISIT_TYPE_META,
  type QueueEntry,
} from '@/services/api/outpatientQueueM675';

const columns: ColumnsType<QueueEntry> = [
  { title: '序号', dataIndex: 'seq', width: 80 },
  { title: '患者', dataIndex: 'name', width: 110 },
  {
    title: '类型',
    dataIndex: 'visitType',
    width: 100,
    render: (v: QueueEntry['visitType']) => <Tag color={VISIT_TYPE_META[v].color}>{VISIT_TYPE_META[v].label}</Tag>,
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: QueueEntry['status']) => <Tag color={QUEUE_STATUS_META[v].color}>{QUEUE_STATUS_META[v].label}</Tag>,
  },
  { title: '主诉', dataIndex: 'chiefComplaint', ellipsis: true },
  {
    title: '操作',
    width: 160,
    render: (_v, row) => (
      <Space size={0}>
        {row.status === 'waiting' && <Button type="link" size="small">叫号</Button>}
        {row.status === 'in_visit' && <Button type="link" size="small">问诊</Button>}
        {row.status === 'visited' && <Button type="link" size="small">复诊</Button>}
      </Space>
    ),
  },
];

export default function OutpatientDoctorStationM675Page() {
  usePageTitle('门诊医生站');

  const { items, loading, error, demo, load } = useOutpatientDoctorStationM675Store();

  useEffect(() => {
    void load();
  }, [load]);

  const waiting = items.filter((i) => i.status === 'waiting' || i.status === 'called');
  const visited = items.filter((i) => i.status === 'visited' || i.status === 'in_visit');

  return (
    <PageContainer
      title="门诊医生站"
      description="候诊队列 / 已诊列表"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small">
        <Spin spinning={loading}>
          <Tabs
            items={[
              { key: 'w', label: `候诊（${waiting.length}）`, children: <Table rowKey="seq" dataSource={waiting} columns={columns} size="small" pagination={false} /> },
              { key: 'v', label: `已诊 / 就诊中（${visited.length}）`, children: <Table rowKey="seq" dataSource={visited} columns={columns} size="small" pagination={false} /> },
            ]}
          />
        </Spin>
      </Card>
    </PageContainer>
  );
}

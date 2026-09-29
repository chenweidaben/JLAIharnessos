/**
 * 健澜科技 jlmedaios - 病案首页队列组件（M3-A）
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { Button, Card, Table, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useFrontPageStore } from '@/store/frontPageStore';
import type { FrontPageQueueItem } from '@/types/frontPage';

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  coding: 'blue',
  qc: 'gold',
  archived: 'green',
};
const STATUS_LABEL: Record<string, string> = {
  draft: '待编码',
  coding: '待质控',
  qc: '待归档',
  archived: '已归档',
};

export default function FrontPageQueue() {
  const { queue, loading, currentId, loadQueue, openPage } = useFrontPageStore();

  const columns = [
    {
      title: '患者',
      key: 'patient',
      render: (_: unknown, row: FrontPageQueueItem) => `${row.patientName}（${row.mrn}）`,
    },
    { title: '就诊号', dataIndex: 'visitNo', key: 'visitNo' },
    { title: '科室', dataIndex: 'department', key: 'department' },
    {
      title: '主诊断',
      dataIndex: 'primaryDiagnosis',
      key: 'primaryDiagnosis',
      render: (v: string | null) => v ?? '—',
    },
    {
      title: '状态',
      key: 'status',
      render: (_: unknown, row: FrontPageQueueItem) => (
        <Tag color={STATUS_COLOR[row.status] ?? 'default'}>
          {STATUS_LABEL[row.status] ?? row.status}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, row: FrontPageQueueItem) => (
        <Button type="link" size="small" onClick={() => void openPage(row.pageId)}>
          处理
        </Button>
      ),
    },
  ];

  return (
    <Card
      className="mb-4"
      title={`病案首页队列（${queue.length}）`}
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => void loadQueue()}>
          刷 新
        </Button>
      }
    >
      <Table<FrontPageQueueItem>
        rowKey="pageId"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={queue}
        pagination={{ pageSize: 10 }}
        rowClassName={(row) => (row.pageId === currentId ? 'ant-table-row-selected' : '')}
        onRow={(row) => ({ onClick: () => void openPage(row.pageId) })}
      />
    </Card>
  );
}

/**
 * 健澜科技 jlmedaios - 病历质控队列组件（M2-B）
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { Button, Card, Space, Table, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useMedicalQcStore } from '@/store/medicalQcStore';
import type { QcQueueItem } from '@/types/medicalQc';

const STATUS_COLOR: Record<string, string> = {
  submitted: 'blue',
  returned: 'volcano',
  reviewed: 'cyan',
  signed: 'gold',
};
const STATUS_LABEL: Record<string, string> = {
  submitted: '待质控',
  returned: '退回整改',
  reviewed: '待二级质控',
  signed: '待三级质控',
};

export default function QcQueue() {
  const { queue, loading, currentId, loadQueue, openRecord } = useMedicalQcStore();

  const columns = [
    { title: '病历标题', dataIndex: 'title', key: 'title' },
    { title: '类型', dataIndex: 'recordType', key: 'recordType' },
    {
      title: '患者',
      key: 'patient',
      render: (_: unknown, row: QcQueueItem) => `${row.patientName}（${row.mrn}）`,
    },
    { title: '科室', dataIndex: 'department', key: 'department' },
    {
      title: '状态',
      key: 'status',
      render: (_: unknown, row: QcQueueItem) => (
        <Space direction="vertical" size={0}>
          <Tag color={STATUS_COLOR[row.status] ?? 'default'}>
            {STATUS_LABEL[row.status] ?? row.status}
          </Tag>
          {row.nextLevel ? <span className="text-xs text-ink-secondary">下一级：{row.nextLevel} 级</span> : null}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, row: QcQueueItem) => (
        <Button
          type="link"
          size="small"
          onClick={() => void openRecord(row.recordId)}
        >
          质控处理
        </Button>
      ),
    },
  ];

  return (
    <Card
      className="mb-4"
      title={`待质控病历（${queue.length}）`}
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => void loadQueue()}>
          刷 新
        </Button>
      }
    >
      <Table<QcQueueItem>
        rowKey="recordId"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={queue}
        pagination={{ pageSize: 10 }}
        rowClassName={(row) => (row.recordId === currentId ? 'ant-table-row-selected' : '')}
        onRow={(row) => ({ onClick: () => void openRecord(row.recordId) })}
      />
    </Card>
  );
}
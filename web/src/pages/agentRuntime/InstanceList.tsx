/**
 * 健澜科技 jlmedaios - 运行实例列表（M4-C）
 *
 * 展示已执行的智能体实例，按开始时间倒序；点击查看详情（节点记录/结果回放）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { Card, Empty, Table, Tag, Typography } from 'antd';
import { useAgentRuntimeStore } from '@/store/agentRuntimeStore';
import type { WorkflowInstanceView } from '@/types/agentRuntime';

const STATE_COLOR: Record<string, string> = {
  completed: 'green',
  running: 'processing',
  failed: 'red',
  cancelled: 'default',
  paused: 'orange',
  waiting_human: 'gold',
  timed_out: 'magenta',
};

function fmtDuration(ms: number | null): string {
  if (ms == null) return '-';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

export default function InstanceList() {
  const { instances, loading, currentId, openInstance } = useAgentRuntimeStore();

  const columns = [
    {
      title: '实例号',
      dataIndex: 'instanceNo',
      key: 'instanceNo',
      render: (v: string) => <Typography.Text code style={{ fontSize: 12 }}>{v}</Typography.Text>,
    },
    { title: '智能体', dataIndex: 'agentId', key: 'agentId', render: (v: string) => v },
    {
      title: '版本',
      dataIndex: 'agentVersion',
      key: 'agentVersion',
      render: (v: string | null) => (v ? `v${v}` : '-'),
    },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      render: (s: string) => <Tag color={STATE_COLOR[s] ?? 'default'}>{s}</Tag>,
    },
    {
      title: 'Token(入/出)',
      key: 'tokens',
      render: (_: unknown, r: WorkflowInstanceView) => `${r.tokensIn}/${r.tokensOut}`,
    },
    {
      title: '耗时',
      dataIndex: 'durationMs',
      key: 'durationMs',
      render: (v: number | null) => fmtDuration(v),
    },
  ];

  return (
    <Card size="small" title="运行实例" data-testid="instance-list-card">
      <Table<WorkflowInstanceView>
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={instances}
        loading={loading}
        pagination={{ pageSize: 6 }}
        locale={{ emptyText: <Empty description="暂无运行实例" /> }}
        onRow={(r) => ({
          onClick: () => {
            if (r.id !== currentId) void openInstance(r.id);
          },
          style: { cursor: 'pointer' },
        })}
      />
    </Card>
  );
}

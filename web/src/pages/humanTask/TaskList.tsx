/**
 * 健澜科技 jlmedaios - 人工工单列表（M4-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { Button, Empty, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useHumanTaskStore } from '@/store/humanTaskStore';
import type { HumanTaskView } from '@/types/humanTask';

const statusMeta: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待处理' },
  claimed: { color: 'blue', label: '已认领' },
  resolved: { color: 'green', label: '已处理' },
  timeout: { color: 'default', label: '已超时' },
  cancelled: { color: 'default', label: '已取消' },
};

export default function TaskList() {
  const { tasks, loading, currentId, openTask } = useHumanTaskStore();

  const columns: ColumnsType<HumanTaskView> = [
    {
      title: '工单号',
      dataIndex: 'taskNo',
      key: 'taskNo',
      width: 170,
    },
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '审核角色',
      dataIndex: 'assigneeRoles',
      key: 'assigneeRoles',
      width: 160,
      render: (roles: string[]) => (
        <span>
          {roles.length ? roles.map((r) => <Tag key={r}>{r}</Tag>) : <Typography.Text type="secondary">—</Typography.Text>}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const meta = statusMeta[status] ?? { color: 'default', label: status };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v: string) => new Date(v).toLocaleString('zh-CN', { hour12: false }),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          data-testid={`open-task-${record.id}`}
          onClick={() => void openTask(record.id)}
        >
          {currentId === record.id ? '查看中' : '处理'}
        </Button>
      ),
    },
  ];

  return (
    <div data-testid="ht-task-list">
      <Table<HumanTaskView>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={tasks}
        loading={loading}
        scroll={{ x: 820 }}
        pagination={{ pageSize: 8, showSizeChanger: false }}
        locale={{ emptyText: <Empty description="暂无待处理工单" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
      />
    </div>
  );
}

/**
 * 健澜科技 jlmedaios - 预约队列组件（M3-I）
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { Button, Card, Popconfirm, Space, Table, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useApptStore } from '@/store/apptStore';
import type { Appointment } from '@/types/appt';

const STATUS_COLOR: Record<string, string> = {
  scheduled: 'gold',
  confirmed: 'blue',
  completed: 'green',
  absent: 'default',
  cancelled: 'default',
};
const STATUS_LABEL: Record<string, string> = {
  scheduled: '待确认',
  confirmed: '已确认',
  completed: '已完成',
  absent: '缺席',
  cancelled: '已取消',
};

export default function ApptQueue() {
  const { list, loading, load, confirm, complete, cancel } = useApptStore();

  const columns = [
    { title: '预约号', dataIndex: 'appointmentNo', key: 'appointmentNo' },
    {
      title: '预约时间',
      dataIndex: 'scheduledAt',
      key: 'scheduledAt',
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    { title: '科室', dataIndex: 'department', key: 'department' },
    { title: '就诊目的', dataIndex: 'purpose', key: 'purpose' },
    {
      title: '状态',
      key: 'status',
      render: (_: unknown, row: Appointment) => (
        <Tag color={STATUS_COLOR[row.status] ?? 'default'}>
          {STATUS_LABEL[row.status] ?? row.status}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, row: Appointment) => {
        if (row.status === 'scheduled') {
          return (
            <Space size="small">
              <Button type="link" size="small" onClick={() => void confirm(row.id)}>
                确 认
              </Button>
              <Popconfirm
                title="取消预约"
                description="请确认取消该预约"
                okText="确认取消"
                cancelText="再想想"
                onConfirm={() => void cancel(row.id, '患者主动取消')}
              >
                <Button type="link" size="small" danger>
                  取 消
                </Button>
              </Popconfirm>
            </Space>
          );
        }
        if (row.status === 'confirmed') {
          return (
            <Space size="small">
              <Button type="link" size="small" onClick={() => void complete(row.id, 'completed')}>
                完成就诊
              </Button>
              <Button type="link" size="small" danger onClick={() => void complete(row.id, 'absent')}>
                标缺席
              </Button>
            </Space>
          );
        }
        return <span className="text-gray-400">—</span>;
      },
    },
  ];

  return (
    <Card
      className="mb-4"
      title={`预约队列（${list.length}）`}
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>
          刷 新
        </Button>
      }
    >
      <Table<Appointment>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={list}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
}

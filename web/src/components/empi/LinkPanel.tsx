/* ============================================================================
 * 健澜科技杠OS - EMPI 患者主索引链接面板（M5-C）
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { Card, Table, Tag } from 'antd';
import { useEmpiStore } from '@/store/empiStore';
import type { EmpiLink } from '@/types/empi';

export default function LinkPanel() {
  const { links, loading } = useEmpiStore();

  const columns = [
    {
      title: '主记录（master）',
      dataIndex: 'masterPatientId',
      key: 'master',
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: '关联记录（linked）',
      dataIndex: 'linkedPatientId',
      key: 'linked',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '建立时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
  ];

  return (
    <Card title={`已建立主索引链接（${links.length}）`}>
      <Table<EmpiLink>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={links}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
}

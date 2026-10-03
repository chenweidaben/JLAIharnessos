/* ============================================================================
 * 健澜科技杠OS - EMPI 匹配候选审核面板（M5-C）
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { Button, Card, Popconfirm, Space, Table, Tag, Tooltip } from 'antd';
import { CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { useEmpiStore } from '@/store/empiStore';
import type { MatchCandidate } from '@/types/empi';

const STATUS_COLOR: Record<string, string> = {
  pending: 'orange',
  confirmed: 'green',
  rejected: 'default',
};
const STATUS_LABEL: Record<string, string> = {
  pending: '待审核',
  confirmed: '已确认',
  rejected: '已拒绝',
};

function scoreColor(score: number): string {
  if (score >= 90) return 'red';
  if (score >= 80) return 'volcano';
  return 'gold';
}

export default function CandidatePanel() {
  const { candidates, loading, loadAll, confirm, reject } = useEmpiStore();

  const columns = [
    { title: '患者 A', dataIndex: 'patientAId', key: 'a' },
    { title: '患者 B', dataIndex: 'patientBId', key: 'b' },
    {
      title: '匹配分',
      dataIndex: 'matchScore',
      key: 'score',
      render: (v: number) => <Tag color={scoreColor(v)}>{v}</Tag>,
      sorter: (a: MatchCandidate, b: MatchCandidate) =>
        b.matchScore - a.matchScore,
    },
    {
      title: '匹配理由',
      dataIndex: 'matchReasons',
      key: 'reasons',
      render: (reasons: string[]) => (
        <Space size={[0, 4]} wrap>
          {reasons.map((r) => (
            <Tag key={r}>{r}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => (
        <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] ?? v}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, row: MatchCandidate) =>
        row.status === 'pending' ? (
          <Space>
            <Tooltip title="确认同一人，建立逻辑链接（不物理合并）">
              <Popconfirm
                title="确认这两个记录属于同一患者？"
                description="将建立主从逻辑链接，不迁移或合并原始记录。"
                okText="确认"
                cancelText="取消"
                onConfirm={() => void confirm(row.id)}
              >
                <Button type="primary" size="small" icon={<CheckOutlined />}>
                  确认
                </Button>
              </Popconfirm>
            </Tooltip>
            <Popconfirm
              title="拒绝该匹配？"
              okText="拒绝"
              cancelText="取消"
              onConfirm={() => void reject(row.id)}
            >
              <Button size="small" danger icon={<CloseOutlined />}>
                拒绝
              </Button>
            </Popconfirm>
          </Space>
        ) : (
          <span className="text-gray-400">已处理</span>
        ),
    },
  ];

  return (
    <Card
      title={`匹配候选（${candidates.length}）`}
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => void loadAll()}>
          刷新
        </Button>
      }
    >
      <Table<MatchCandidate>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={candidates}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
}

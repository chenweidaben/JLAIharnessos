/**
 * 健澜科技 jlmedaios - 转诊队列组件（M3-R）
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { Button, Card, Radio, Table, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useReferralStore } from '@/store/referralStore';
import type { ReferralOrder } from '@/types/referral';

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  submitted: 'blue',
  accepted: 'gold',
  rejected: 'red',
  completed: 'green',
  cancelled: 'default',
};
const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  submitted: '待处理',
  accepted: '已接收',
  rejected: '已拒绝',
  completed: '已完成',
  cancelled: '已取消',
};

export default function ReferralQueue() {
  const {
    queue,
    loading,
    currentId,
    directionFilter,
    loadQueue,
    openDetail,
    setDirectionFilter,
  } = useReferralStore();

  const columns = [
    {
      title: '转诊单号',
      dataIndex: 'referralNo',
      key: 'referralNo',
    },
    {
      title: '方向',
      key: 'direction',
      render: (_: unknown, row: ReferralOrder) => (
        <Tag color={row.direction === 'incoming' ? 'cyan' : 'purple'}>
          {row.direction === 'incoming' ? '转入' : '转出'}
        </Tag>
      ),
    },
    {
      title: '患者',
      key: 'patient',
      render: (_: unknown, row: ReferralOrder) =>
        row.patientName ?? '（未登记）',
    },
    {
      title: '源机构 → 目标机构',
      key: 'orgs',
      render: (_: unknown, row: ReferralOrder) => (
        <span>
          {row.sourceOrg}
          {row.targetDept ? `（${row.sourceDept}）` : ''} → {row.targetOrg}
          {row.targetDept ? `（${row.targetDept}）` : ''}
        </span>
      ),
    },
    {
      title: '紧急',
      key: 'urgency',
      render: (_: unknown, row: ReferralOrder) =>
        row.urgency === 'urgent' ? <Tag color="red">急诊</Tag> : '普通',
    },
    {
      title: '状态',
      key: 'status',
      render: (_: unknown, row: ReferralOrder) => (
        <Tag color={STATUS_COLOR[row.status] ?? 'default'}>
          {STATUS_LABEL[row.status] ?? row.status}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, row: ReferralOrder) => (
        <Button type="link" size="small" onClick={() => void openDetail(row.id)}>
          处理
        </Button>
      ),
    },
  ];

  return (
    <Card
      className="mb-4"
      title={`转诊队列（${queue.length}）`}
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => void loadQueue()}>
          刷 新
        </Button>
      }
    >
      <Radio.Group
        className="mb-3"
        value={directionFilter}
        onChange={(e) => void setDirectionFilter(e.target.value)}
        optionType="button"
        buttonStyle="solid"
        options={[
          { label: '全部', value: 'all' },
          { label: '转入', value: 'incoming' },
          { label: '转出', value: 'outgoing' },
        ]}
      />
      <Table<ReferralOrder>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={queue}
        pagination={{ pageSize: 10 }}
        rowClassName={(row) =>
          row.id === currentId ? 'ant-table-row-selected' : ''
        }
        onRow={(row) => ({ onClick: () => void openDetail(row.id) })}
      />
    </Card>
  );
}

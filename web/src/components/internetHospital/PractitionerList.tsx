/**
 * 健澜科技 jlmedaios - 医护线上资质列表组件（M3-J）
 *
 * 列出线上执业资质，支持按状态过滤、审核（仅 pending 可审核）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { Button, Card, Segmented, Space, Table, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useInternetHospitalStore } from '@/store/internetHospitalStore';
import type { InternetPractitionerView } from '@/types/internetHospital';
import PractitionerAuditModal from './PractitionerAuditModal';

const STATUS_COLOR: Record<string, string> = {
  pending: 'gold',
  approved: 'green',
  rejected: 'red',
};
const STATUS_LABEL: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};
const TYPE_LABEL: Record<string, string> = {
  doctor: '医师',
  pharmacist: '药师',
  nurse: '护士',
};

export default function PractitionerList() {
  const { list, loading, load, statusFilter, setStatusFilter, audit, auditing } =
    useInternetHospitalStore();
  const [current, setCurrent] = useState<InternetPractitionerView | null>(null);

  const columns = [
    { title: '类型', dataIndex: 'practitionerType', key: 'type', render: (v: string) => TYPE_LABEL[v] ?? v },
    { title: '执业证书号', dataIndex: 'practitionerNo', key: 'no', render: (v: string | null) => v ?? '—' },
    { title: '执业范围', dataIndex: 'practiceScope', key: 'scope', render: (v: string | null) => v ?? '—' },
    { title: '年限', dataIndex: 'practiceYears', key: 'years', render: (v: number | null) => (v != null ? `${v} 年` : '—') },
    {
      title: '状态',
      dataIndex: 'auditStatus',
      key: 'status',
      render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{STATUS_LABEL[v] ?? v}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, row: InternetPractitionerView) =>
        row.auditStatus === 'pending' ? (
          <Button type="link" size="small" onClick={() => setCurrent(row)}>
            审 核
          </Button>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
  ];

  return (
    <Card
      className="mb-4"
      title={`线上执业资质（${list.length}）`}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            刷 新
          </Button>
        </Space>
      }
    >
      <Space className="mb-3" direction="vertical">
        <Segmented
          value={statusFilter ?? 'all'}
          options={[
            { label: '全部', value: 'all' },
            { label: '待审核', value: 'pending' },
            { label: '已通过', value: 'approved' },
            { label: '已驳回', value: 'rejected' },
          ]}
          onChange={(v) => setStatusFilter(v === 'all' ? undefined : String(v))}
        />
      </Space>
      <Table<InternetPractitionerView>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={list}
        pagination={{ pageSize: 10 }}
      />
      <PractitionerAuditModal
        open={current !== null}
        practitioner={current}
        auditing={auditing}
        onClose={() => setCurrent(null)}
        onSubmit={async (decision, reason) => {
          if (current) {
            const ok = await audit(current.id, decision, reason);
            if (ok) setCurrent(null);
          }
        }}
      />
    </Card>
  );
}

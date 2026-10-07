/**
 * 健澜科技 jlmedaios - 手术麻醉队列组件（M9-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useMemo, useState } from 'react';
import { Card, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { SurgeryRequest, SurgeryStatus } from '@/types/surgery';
import { useSurgeryStore, SURGERY_STATUS_META } from '@/store/surgeryStore';

type TabKey = SurgeryStatus | 'all';

const TAB_KEYS: Array<{ key: TabKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'requested', label: '待排程' },
  { key: 'scheduled', label: '已排程' },
  { key: 'prechecked', label: '已核对' },
  { key: 'induction', label: '麻醉中' },
  { key: 'maintenance', label: '手术中' },
  { key: 'recovery', label: '复苏中' },
  { key: 'pacu', label: 'PACU' },
  { key: 'discharged', label: '已离室' },
  { key: 'cancelled', label: '已取消' },
];

export default function SurgeryQueue() {
  const { list, loading, loadDetail } = useSurgeryStore();
  const [tab, setTab] = useState<TabKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => list.filter((r) => (tab === 'all' ? true : r.status === tab)),
    [list, tab],
  );

  const openDetail = (id: string) => {
    setSelectedId(id);
    void loadDetail(id);
  };

  const columns: ColumnsType<SurgeryRequest> = [
    { title: '申请单号', dataIndex: 'requestNo', width: 120 },
    { title: '术式', dataIndex: 'plannedProcedure', ellipsis: true },
    { title: '类型', dataIndex: 'surgeryType', width: 80, render: (v: string) => (v === 'emergency' ? <Tag color="red">急诊</Tag> : <Tag color="blue">择期</Tag>) },
    { title: '科室', dataIndex: 'department', width: 100 },
    { title: '麻醉方式', dataIndex: 'anesthesiaMethod', width: 110, render: (v: string | null) => v ?? '—' },
    { title: '计划日期', dataIndex: 'plannedDate', width: 110, render: (v: string | null) => v ?? '—' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: SurgeryStatus) => (
        <Tag color={SURGERY_STATUS_META[s].color} data-testid={`status-${s}`}>
          {SURGERY_STATUS_META[s].label}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, r) => (
        <Typography.Link onClick={() => openDetail(r.id)} data-testid={`open-${r.id.slice(0, 8)}`}>
          查看/处理
        </Typography.Link>
      ),
    },
  ];

  const count = (k: TabKey) => (k === 'all' ? list.length : list.filter((r) => r.status === k).length);

  return (
    <Card className="shadow-card">
      <Tabs
        size="small"
        activeKey={tab}
        onChange={(k) => setTab(k as TabKey)}
        items={TAB_KEYS.map((t) => ({ key: t.key, label: `${t.label} (${count(t.key)})` }))}
      />
      <Table<SurgeryRequest>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        rowClassName={(r) => (r.id === selectedId ? 'bg-jl-primary/5' : '')}
        scroll={{ x: 900 }}
        pagination={{ pageSize: 10, showSizeChanger: false }}
      />
    </Card>
  );
}

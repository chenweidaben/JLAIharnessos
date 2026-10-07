/**
 * 健澜科技 jlmedaios - 输血管理队列（M10-A）
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTransfusionStore } from '@/store/transfusionStore';
import {
  TRANSFUSION_STATUS_META,
  BLOOD_COMPONENT_LABEL,
  type TransfusionRequest,
} from '@/types/transfusion';

const URGENCY_COLOR: Record<string, string> = {
  routine: 'blue',
  urgent: 'orange',
  emergency: 'red',
};

const columns: ColumnsType<TransfusionRequest> = [
  { title: '申请单号', dataIndex: 'requestNo', width: 150 },
  { title: '科室', dataIndex: 'department', width: 110 },
  {
    title: '成分',
    dataIndex: 'component',
    width: 90,
    render: (v: string) => BLOOD_COMPONENT_LABEL[v] ?? v,
  },
  {
    title: '血型',
    dataIndex: 'bloodType',
    width: 70,
    render: (v: string) => <Tag>{v}型</Tag>,
  },
  { title: '剂量(U)', dataIndex: 'unitCount', width: 90 },
  {
    title: '紧急度',
    dataIndex: 'urgency',
    width: 90,
    render: (v: string) => (
      <Tag color={URGENCY_COLOR[v] ?? 'default'}>
        {v === 'emergency' ? '特急' : v === 'urgent' ? '紧急' : '常规'}
      </Tag>
    ),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: keyof typeof TRANSFUSION_STATUS_META) => {
      const meta = TRANSFUSION_STATUS_META[v];
      return meta ? <Tag color={meta.color}>{meta.label}</Tag> : v;
    },
  },
  {
    title: '申请时间',
    dataIndex: 'createdAt',
    width: 170,
    render: (v: string) => new Date(v).toLocaleString('zh-CN', { hour12: false }),
  },
];

export default function TransfusionQueue() {
  const { list, loading, loadDetail, detail } = useTransfusionStore();
  return (
    <Table<TransfusionRequest>
      rowKey="id"
      size="small"
      loading={loading}
      columns={columns}
      dataSource={list}
      rowClassName={(r) => (detail?.req.id === r.id ? 'bg-jl-soft' : '')}
      onRow={(r) => ({
        onClick: () => void loadDetail(r.id),
      })}
      pagination={{ pageSize: 8 }}
    />
  );
}

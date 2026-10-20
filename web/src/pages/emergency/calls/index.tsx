/** 健澜科技 jlmedaios - 急救呼叫（M351 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; callNo: string; patient: string; location: string; callTime: string }
export default function EmergencyCallsPage() {
  usePageTitle('急救呼叫');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/emergency/calls').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '呼叫号', dataIndex: 'callNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '患者', dataIndex: 'patient' },
    { title: '位置', dataIndex: 'location' },
    { title: '呼叫时间', dataIndex: 'callTime', render: (v: string) => <Tag color="red">{v}</Tag> },
  ];
  return (<PageContainer title="急救呼叫"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无呼叫" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
/** 健澜科技 jlmedaios - 事件总线概览（M342 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; busName: string; eventCount: string; subscribers: string; status: string; throughput: string }
export default function EventsBusOverviewPage() {
  usePageTitle('事件总线概览');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/events/bus-overview').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '总线名', dataIndex: 'busName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '事件量', dataIndex: 'eventCount', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '订阅者', dataIndex: 'subscribers' },
    { title: '吞吐', dataIndex: 'throughput' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v.includes('正常') ? 'green' : 'red'}>{v}</Tag> },
  ];
  return (<PageContainer title="事件总线概览"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无总线" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
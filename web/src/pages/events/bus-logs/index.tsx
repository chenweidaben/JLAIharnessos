/** 健澜科技 jlmedaios - 事件日志（M342 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; eventId: string; type: string; time: string; status: string; cost: string }
export default function EventsBusLogsPage() {
  usePageTitle('事件日志');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/events/bus-logs').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '事件号', dataIndex: 'eventId', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '类型', dataIndex: 'type', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '时间', dataIndex: 'time' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '耗时', dataIndex: 'cost' },
  ];
  return (<PageContainer title="事件日志"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无日志" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
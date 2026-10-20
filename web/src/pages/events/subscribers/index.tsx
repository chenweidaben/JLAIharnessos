/** 健澜科技 jlmedaios - 事件订阅者（M374 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; subscriberName: string; subscribedEvents: string }
export default function EventsSubscribersPage() {
  usePageTitle('事件订阅者');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/events/subscribers').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '订阅者', dataIndex: 'subscriberName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '订阅事件', dataIndex: 'subscribedEvents', ellipsis: true },
  ];
  return (<PageContainer title="事件订阅者"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无订阅者" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
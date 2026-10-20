/** 健澜科技 jlmedaios - 事件消费者（M374 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; consumerName: string; consumedEvents: string }
export default function EventsConsumersPage() {
  usePageTitle('事件消费者');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/events/consumers').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '消费者', dataIndex: 'consumerName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '消费事件', dataIndex: 'consumedEvents', ellipsis: true },
  ];
  return (<PageContainer title="事件消费者"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无消费者" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
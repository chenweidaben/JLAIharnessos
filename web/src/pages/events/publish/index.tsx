/** 健澜科技 jlmedaios - 事件发布（M374 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; publisherName: string; publishedEvents: string }
export default function EventsPublishPage() {
  usePageTitle('事件发布');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/events/publish').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '发布者', dataIndex: 'publisherName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '发布事件', dataIndex: 'publishedEvents', ellipsis: true },
  ];
  return (<PageContainer title="事件发布"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无发布" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
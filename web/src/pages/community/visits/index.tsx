/** 健澜科技 jlmedaios - 社区随访（M350 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; resident: string; visitDoctor: string; visitTime: string; content: string }
export default function CommunityVisitsPage() {
  usePageTitle('社区随访');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/community/visits').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '居民', dataIndex: 'resident', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '随访医生', dataIndex: 'visitDoctor' },
    { title: '随访时间', dataIndex: 'visitTime', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '内容', dataIndex: 'content', ellipsis: true },
  ];
  return (<PageContainer title="社区随访"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无随访" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
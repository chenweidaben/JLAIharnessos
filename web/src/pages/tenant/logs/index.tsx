/** 健澜科技 jlmedaios - 租户日志（M365 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; tenantName: string; operator: string; operation: string; time: string }
export default function TenantLogsPage() {
  usePageTitle('租户日志');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/tenant/logs').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '租户', dataIndex: 'tenantName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '操作人', dataIndex: 'operator' },
    { title: '操作', dataIndex: 'operation', ellipsis: true },
    { title: '时间', dataIndex: 'time', render: (v: string) => <Tag color="blue">{v}</Tag> },
  ];
  return (<PageContainer title="租户日志"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无日志" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
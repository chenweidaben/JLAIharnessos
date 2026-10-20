/** 健澜科技 jlmedaios - 租户配额（M347 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; tenantId: string; apiPerDay: string; storageGB: number; concurrent: number; used: { apiUsed: string; storageUsed: number } }
export default function TenantsQuotaPage() {
  usePageTitle('租户配额');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/tenants/quota').then((r) => r.json()).then((j) => { if (alive) setList((j.data?.quotas ?? []).map((q: any, i: number) => ({ ...q, id: q.tenantId ?? `Q-${i}` })) as Row[]); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '租户ID', dataIndex: 'tenantId', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: 'API/日', dataIndex: 'apiPerDay', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '存储GB', dataIndex: 'storageGB' },
    { title: '并发', dataIndex: 'concurrent' },
    { title: '已用API', dataIndex: ['used', 'apiUsed'], render: (v: string) => <Tag color="orange">{v}</Tag> },
  ];
  return (<PageContainer title="租户配额"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无配额" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
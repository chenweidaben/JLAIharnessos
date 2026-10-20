/** 健澜科技 jlmedaios - 租户配额（M365 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; tenantName: string; resourceType: string; used: string; limit: string; usageRate: string }
export default function TenantQuotaPage() {
  usePageTitle('租户配额');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/tenant/quota').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '租户', dataIndex: 'tenantName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '资源类型', dataIndex: 'resourceType', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '已用', dataIndex: 'used' },
    { title: '限额', dataIndex: 'limit' },
    { title: '使用率', dataIndex: 'usageRate', render: (v: string) => <Tag color={v.includes('100%') ? 'red' : v.includes('80%') ? 'orange' : 'green'}>{v}</Tag> },
  ];
  return (<PageContainer title="租户配额"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无配额" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
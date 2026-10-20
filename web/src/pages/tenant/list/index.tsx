/** 健澜科技 jlmedaios - 租户列表（M365 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; tenantName: string; domain: string; plan: string; userCount: string }
export default function TenantListPage() {
  usePageTitle('租户列表');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/tenant/list').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '租户名', dataIndex: 'tenantName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '域名', dataIndex: 'domain', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '套餐', dataIndex: 'plan' },
    { title: '用户数', dataIndex: 'userCount' },
  ];
  return (<PageContainer title="租户列表"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无租户" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
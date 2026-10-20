/** 健澜科技 jlmedaios - 数据隔离策略（M365 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; policyName: string; isolationLevel: string; resource: string; rule: string }
export default function TenantDataIsolationPage() {
  usePageTitle('数据隔离策略');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/tenant/data-isolation').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '策略名', dataIndex: 'policyName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '隔离级别', dataIndex: 'isolationLevel', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '资源', dataIndex: 'resource' },
    { title: '规则', dataIndex: 'rule', ellipsis: true },
  ];
  return (<PageContainer title="数据隔离策略"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无策略" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
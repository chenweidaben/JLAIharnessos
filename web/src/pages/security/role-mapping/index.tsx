/** 健澜科技 jlmedaios - 角色映射（M346 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; user: string; role: string; department: string; effectiveTime: string; status: string }
export default function SecurityRoleMappingPage() {
  usePageTitle('角色映射');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/security/role-mapping').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '用户', dataIndex: 'user' },
    { title: '角色', dataIndex: 'role', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '科室', dataIndex: 'department' },
    { title: '生效时间', dataIndex: 'effectiveTime' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '在职' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (<PageContainer title="角色映射"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无映射" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
/** 健澜科技 jlmedaios - 角色管理（M364 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; roleName: string; description: string; userCount: string }
export default function SecurityRolesPage() {
  usePageTitle('角色管理');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/security/roles').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '角色名', dataIndex: 'roleName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '用户数', dataIndex: 'userCount', render: (v: string) => <Tag color="blue">{v}</Tag> },
  ];
  return (<PageContainer title="角色管理"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无角色" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
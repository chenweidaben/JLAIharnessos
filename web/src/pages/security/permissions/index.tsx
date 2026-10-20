/** 健澜科技 jlmedaios - 权限管理（M364 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; permissionName: string; type: string; resource: string; action: string }
export default function SecurityPermissionsPage() {
  usePageTitle('权限管理');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/security/permissions').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '权限名', dataIndex: 'permissionName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '类型', dataIndex: 'type', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '资源', dataIndex: 'resource' },
    { title: '操作', dataIndex: 'action' },
  ];
  return (<PageContainer title="权限管理"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无权限" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
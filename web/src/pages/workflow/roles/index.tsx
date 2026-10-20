/** 健澜科技 jlmedaios - 角色工作流（M372 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; roleName: string; workflow: string; node: string; permission: string }
export default function WorkflowRolesPage() {
  usePageTitle('角色工作流');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/workflow/roles').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '角色', dataIndex: 'roleName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '工作流', dataIndex: 'workflow', ellipsis: true },
    { title: '节点', dataIndex: 'node', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '权限', dataIndex: 'permission', ellipsis: true },
  ];
  return (<PageContainer title="角色工作流"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无工作流" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
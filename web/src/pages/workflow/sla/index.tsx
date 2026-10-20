/** 健澜科技 jlmedaios - 工作流SLA（M372 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; workflow: string; node: string; timeLimit: string; status: string }
export default function WorkflowSlaPage() {
  usePageTitle('工作流SLA');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/workflow/sla').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '工作流', dataIndex: 'workflow', ellipsis: true },
    { title: '节点', dataIndex: 'node', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '时限', dataIndex: 'timeLimit', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v.includes('正常') ? 'green' : 'red'}>{v}</Tag> },
  ];
  return (<PageContainer title="工作流SLA"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无SLA" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
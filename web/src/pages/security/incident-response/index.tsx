/** 健澜科技 jlmedaios - 事件响应（M385 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; responseName: string; incident: string; action: string; result: string }
export default function SecurityIncidentResponsePage() {
  usePageTitle('事件响应');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/security/incident-response').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '响应', dataIndex: 'responseName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '事件', dataIndex: 'incident', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '动作', dataIndex: 'action' },
    { title: '结果', dataIndex: 'result' },
  ];
  return (<PageContainer title="事件响应"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无数据" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
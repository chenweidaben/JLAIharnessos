/** 健澜科技 jlmedaios - FHIR Communication 通信（M368 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; resourceType: string; status: string; category?: string }
export default function FhirCommunicationPage() {
  usePageTitle('FHIR Communication 通信');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/fhir/communication').then((r) => r.json()).then((j) => { if (alive) setList((j.data?.entry ?? []).map((e: any) => e.resource).filter(Boolean)); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '资源ID', dataIndex: 'id', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '资源类型', dataIndex: 'resourceType', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'completed' ? 'green' : 'orange'}>{v}</Tag> },
    { title: '分类', dataIndex: 'category', render: (v?: string) => v ?? '-' },
  ];
  return (<PageContainer title="FHIR Communication 通信"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无 Communication" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
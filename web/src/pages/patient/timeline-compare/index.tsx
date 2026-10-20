/** 健澜科技 jlmedaios - 时间线对比（M375 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patientA: string; patientB: string; similarity: string }
export default function PatientTimelineComparePage() {
  usePageTitle('时间线对比');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/patient/timeline-compare').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者A', dataIndex: 'patientA', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '患者B', dataIndex: 'patientB', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '相似度', dataIndex: 'similarity' },
  ];
  return (<PageContainer title="时间线对比"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无对比" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
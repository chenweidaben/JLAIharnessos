/** 健澜科技 jlmedaios - 时间线汇总（M375 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patientName: string; totalEvents: string; visitCount: string }
export default function PatientTimelineSummaryPage() {
  usePageTitle('时间线汇总');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/patient/timeline-summary').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patientName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '总事件', dataIndex: 'totalEvents' },
    { title: '就诊数', dataIndex: 'visitCount', render: (v: string) => <Tag color="blue">{v}</Tag> },
  ];
  return (<PageContainer title="时间线汇总"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无汇总" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
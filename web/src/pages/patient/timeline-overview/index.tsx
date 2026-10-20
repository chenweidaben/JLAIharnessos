/** 健澜科技 jlmedaios - 时间线概览（M340 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; totalEvents: string; visits: string; medications: string; lastUpdate: string }
export default function PatientTimelineOverviewPage() {
  usePageTitle('时间线概览');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/patient/timeline-overview').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '总事件数', dataIndex: 'totalEvents', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '就诊记录', dataIndex: 'visits' },
    { title: '用药累计', dataIndex: 'medications' },
    { title: '最后更新', dataIndex: 'lastUpdate', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (<PageContainer title="时间线概览"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无概览" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
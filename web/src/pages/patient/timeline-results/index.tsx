/** 健澜科技 jlmedaios - 检验检查时间线（M340 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; item: string; time: string; result: string }
export default function PatientTimelineResultsPage() {
  usePageTitle('检验检查时间线');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/patient/timeline-results').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '项目', dataIndex: 'item', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '时间', dataIndex: 'time', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '结果', dataIndex: 'result', ellipsis: true, render: (v: string) => <Tag color="red">{v}</Tag> },
  ];
  return (<PageContainer title="检验检查时间线"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无结果" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
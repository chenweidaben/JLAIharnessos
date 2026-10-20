/** 健澜科技 jlmedaios - 对标分析（M348 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; metric: string; ourValue: string; peerAvg: string; rank: string; diff: string }
export default function OperationBenchmarkPage() {
  usePageTitle('对标分析');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/operation/benchmark').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '指标', dataIndex: 'metric', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '本院', dataIndex: 'ourValue', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '同级均值', dataIndex: 'peerAvg' },
    { title: '排名', dataIndex: 'rank', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '差异', dataIndex: 'diff' },
  ];
  return (<PageContainer title="对标分析"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无对标" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
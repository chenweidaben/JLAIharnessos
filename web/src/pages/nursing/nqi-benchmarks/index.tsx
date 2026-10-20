/** 健澜科技 jlmedaios - NQI基准（M378 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; indicatorName: string; ourHospital: string; peerAverage: string; rank: string }
export default function NursingNqiBenchmarksPage() {
  usePageTitle('NQI基准');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/nursing/nqi-benchmarks').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '指标', dataIndex: 'indicatorName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '本院', dataIndex: 'ourHospital', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '同级平均', dataIndex: 'peerAverage' },
    { title: '排名', dataIndex: 'rank' },
  ];
  return (<PageContainer title="NQI基准"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无基准" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
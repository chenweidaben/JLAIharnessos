/** 健澜科技 jlmedaios - 护理NQI对比（M340 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; indicator: string; ours: string; peer: string; diff: string; evaluation: string }
export default function NursingNqiComparisonPage() {
  usePageTitle('护理NQI对比');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/nursing/nqi-comparison').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '指标', dataIndex: 'indicator', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '本院', dataIndex: 'ours', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '同级医院', dataIndex: 'peer' },
    { title: '差异', dataIndex: 'diff', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '评价', dataIndex: 'evaluation', render: (v: string) => <Tag color={v === '优秀' ? 'green' : v === '良好' ? 'blue' : 'orange'}>{v}</Tag> },
  ];
  return (<PageContainer title="护理NQI对比"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无对比" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
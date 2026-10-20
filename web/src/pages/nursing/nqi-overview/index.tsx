/** 健澜科技 jlmedaios - 护理NQI总览（M340 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; indicator: string; target: string; actual: string; rate: string; trend: string }
export default function NursingNqiOverviewPage() {
  usePageTitle('护理NQI总览');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/nursing/nqi-overview').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '指标', dataIndex: 'indicator', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '目标值', dataIndex: 'target' },
    { title: '实际值', dataIndex: 'actual', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '达标率', dataIndex: 'rate', render: (v: string) => <Tag color={v.includes('达标') ? 'green' : 'orange'}>{v}</Tag> },
    { title: '趋势', dataIndex: 'trend' },
  ];
  return (<PageContainer title="护理NQI总览"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无指标" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
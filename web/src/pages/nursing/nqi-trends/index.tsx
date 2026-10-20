/** 健澜科技 jlmedaios - NQI趋势（M378 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; indicatorName: string; month: string; value: string; target: string; change: string }
export default function NursingNqiTrendsPage() {
  usePageTitle('NQI趋势');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/nursing/nqi-trends').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '指标', dataIndex: 'indicatorName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '月份', dataIndex: 'month', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '实际值', dataIndex: 'value' },
    { title: '目标', dataIndex: 'target' },
    { title: '变化', dataIndex: 'change' },
  ];
  return (<PageContainer title="NQI趋势"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无趋势" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
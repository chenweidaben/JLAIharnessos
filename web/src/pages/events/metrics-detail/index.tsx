/** 健澜科技 jlmedaios - 事件指标详情（M374 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; metricName: string; value: string; unit: string; trend: string; time: string }
export default function EventsMetricsDetailPage() {
  usePageTitle('事件指标详情');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/events/metrics-detail').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '指标', dataIndex: 'metricName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '值', dataIndex: 'value', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '单位', dataIndex: 'unit' },
    { title: '趋势', dataIndex: 'trend' },
    { title: '时间', dataIndex: 'time' },
  ];
  return (<PageContainer title="事件指标详情"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无指标" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
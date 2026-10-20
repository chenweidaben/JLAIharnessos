/** 健澜科技 jlmedaios - NQI预警（M378 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; alertName: string; indicator: string; threshold: string; currentValue: string }
export default function NursingNqiAlertsPage() {
  usePageTitle('NQI预警');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/nursing/nqi-alerts').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '预警', dataIndex: 'alertName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '指标', dataIndex: 'indicator', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '阈值', dataIndex: 'threshold' },
    { title: '当前值', dataIndex: 'currentValue', render: (v: string) => <Tag color="red">{v}</Tag> },
  ];
  return (<PageContainer title="NQI预警"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无预警" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
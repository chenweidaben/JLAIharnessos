/** 健澜科技 jlmedaios - 护理NQI明细（M340 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; indicator: string; department: string; value: string; rank: string; time: string }
export default function NursingNqiDetailPage() {
  usePageTitle('护理NQI明细');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/nursing/nqi-detail').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '指标', dataIndex: 'indicator', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '科室', dataIndex: 'department' },
    { title: '数值', dataIndex: 'value', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '排名', dataIndex: 'rank' },
    { title: '时间', dataIndex: 'time', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (<PageContainer title="护理NQI明细"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无明细" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
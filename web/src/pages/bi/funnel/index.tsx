/** 健澜科技 jlmedaios - 就诊漏斗（M348 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; stage: string; count: string; conversionRate: string; churnRate: string; mom: string }
export default function BiFunnelPage() {
  usePageTitle('就诊漏斗');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/bi/funnel').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '阶段', dataIndex: 'stage', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '人数', dataIndex: 'count', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '转化率', dataIndex: 'conversionRate', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '流失率', dataIndex: 'churnRate', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '环比', dataIndex: 'mom' },
  ];
  return (<PageContainer title="就诊漏斗"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无漏斗" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
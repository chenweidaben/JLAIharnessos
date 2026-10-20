/** 健澜科技 jlmedaios - 质量指标（M353 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; indicatorName: string; targetValue: string; actualValue: string; rate: string; trend: string }
export default function QcIndicatorsPage() {
  usePageTitle('质量指标');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/qc/indicators').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '指标名', dataIndex: 'indicatorName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '目标值', dataIndex: 'targetValue' },
    { title: '实际值', dataIndex: 'actualValue', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '达标率', dataIndex: 'rate', render: (v: string) => <Tag color={v.includes('达标') ? 'green' : 'orange'}>{v}</Tag> },
    { title: '趋势', dataIndex: 'trend' },
  ];
  return (<PageContainer title="质量指标"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无指标" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
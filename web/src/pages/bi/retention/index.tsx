/** 健澜科技 jlmedaios - 患者留存（M348 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; cohort: string; month1: string; month3: string; month6: string; month12: string }
export default function BiRetentionPage() {
  usePageTitle('患者留存');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/bi/retention').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '队列', dataIndex: 'cohort', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '1月', dataIndex: 'month1', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '3月', dataIndex: 'month3', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '6月', dataIndex: 'month6', render: (v: string) => <Tag color="orange">{v}</Tag> },
    { title: '12月', dataIndex: 'month12', render: (v: string) => <Tag color="red">{v}</Tag> },
  ];
  return (<PageContainer title="患者留存"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无留存" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
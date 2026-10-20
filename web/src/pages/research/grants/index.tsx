/** 健澜科技 jlmedaios - 科研经费（M349 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; projectName: string; fundingSource: string; amount: string; arrivalTime: string; usageStatus: string }
export default function ResearchGrantsPage() {
  usePageTitle('科研经费');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/research/grants').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '项目', dataIndex: 'projectName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '来源', dataIndex: 'fundingSource' },
    { title: '金额', dataIndex: 'amount', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '到账时间', dataIndex: 'arrivalTime' },
    { title: '使用状态', dataIndex: 'usageStatus', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (<PageContainer title="科研经费"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无经费" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
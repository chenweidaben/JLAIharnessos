/** 健澜科技 jlmedaios - 药物相互作用（M362 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; drugA: string; drugB: string; interaction: string; severity: string }
export default function CdsDrugsInteractionPage() {
  usePageTitle('药物相互作用');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/cds/drugs-interaction').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '药物A', dataIndex: 'drugA', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '药物B', dataIndex: 'drugB', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '相互作用', dataIndex: 'interaction', ellipsis: true },
    { title: '严重度', dataIndex: 'severity', render: (v: string) => <Tag color={v.includes('严重') ? 'red' : v.includes('中度') ? 'orange' : 'green'}>{v}</Tag> },
  ];
  return (<PageContainer title="药物相互作用"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无相互作用" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
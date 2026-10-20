/** 健澜科技 jlmedaios - 质量整改（M353 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; problem: string; rootCause: string; measures: string }
export default function QcCorrectivePage() {
  usePageTitle('质量整改');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/qc/corrective').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '问题', dataIndex: 'problem', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '根因', dataIndex: 'rootCause', ellipsis: true },
    { title: '措施', dataIndex: 'measures', ellipsis: true, render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (<PageContainer title="质量整改"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无整改" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
/** 健澜科技 jlmedaios - 质量审核（M353 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; auditNo: string; item: string; result: string; auditor: string; time: string }
export default function QcAuditsPage() {
  usePageTitle('质量审核');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/qc/audits').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '审核号', dataIndex: 'auditNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '审核项', dataIndex: 'item' },
    { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '审核人', dataIndex: 'auditor' },
    { title: '时间', dataIndex: 'time' },
  ];
  return (<PageContainer title="质量审核"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无审核" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
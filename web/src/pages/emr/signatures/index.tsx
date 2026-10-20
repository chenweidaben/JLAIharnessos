/** 健澜科技 jlmedaios - 电子签名（M354 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; signer: string; idNumber: string; signTime: string; status: string; purpose: string }
export default function EmrSignaturesPage() {
  usePageTitle('电子签名');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/emr/signatures').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '签名人', dataIndex: 'signer', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '证件号', dataIndex: 'idNumber' },
    { title: '签名时间', dataIndex: 'signTime', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '用途', dataIndex: 'purpose' },
  ];
  return (<PageContainer title="电子签名"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无签名" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
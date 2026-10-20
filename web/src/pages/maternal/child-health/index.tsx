/** 健澜科技 jlmedaios - 儿童保健（M351 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; child: string; age: string; checkItems: string; result: string }
export default function MaternalChildHealthPage() {
  usePageTitle('儿童保健');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/maternal/child-health').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '儿童', dataIndex: 'child', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '月龄', dataIndex: 'age', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '检查项目', dataIndex: 'checkItems', ellipsis: true },
    { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (<PageContainer title="儿童保健"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无保健" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
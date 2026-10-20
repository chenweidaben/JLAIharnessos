/** 健澜科技 jlmedaios - 儿童预防接种（M396 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; }
export default function MaternityChildVaccinationPage() {
  usePageTitle('儿童预防接种');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/maternity/child-vaccination').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '名称', dataIndex: 'vaccineName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '维度', dataIndex: 'baby', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '值', dataIndex: 'date' },
    { title: '状态', dataIndex: 'status' },
  ];
  return (<PageContainer title="儿童预防接种"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无数据" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
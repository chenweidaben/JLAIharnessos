/** 健澜科技 jlmedaios - 病种编码详情（M430 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; }
export default function InsuranceDiseaseCodesDetailPage() {
  usePageTitle('病种编码详情');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/insurance/disease-codes-detail').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '名称', dataIndex: 'codeName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '维度', dataIndex: 'icd', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '值', dataIndex: 'version' },
    { title: '状态', dataIndex: 'status' },
  ];
  return (<PageContainer title="病种编码详情"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无数据" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
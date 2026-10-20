/** 健澜科技 jlmedaios - 资产管理（M356 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; assetName: string; category: string; originalValue: string; netValue: string; status: string }
export default function FinanceAssetsPage() {
  usePageTitle('资产管理');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/finance/assets').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '资产名', dataIndex: 'assetName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '类别', dataIndex: 'category', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '原值', dataIndex: 'originalValue' },
    { title: '净值', dataIndex: 'netValue', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v.includes('在用') ? 'green' : v.includes('维修') ? 'orange' : 'red'}>{v}</Tag> },
  ];
  return (<PageContainer title="资产管理"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无资产" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
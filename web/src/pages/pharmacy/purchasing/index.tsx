/** 健澜科技 jlmedaios - 药品采购（M355 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; drugName: string; quantity: string; unitPrice: string; supplier: string; time: string }
export default function PharmacyPurchasingPage() {
  usePageTitle('药品采购');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/pharmacy/purchasing').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '药品名', dataIndex: 'drugName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '数量', dataIndex: 'quantity' },
    { title: '单价', dataIndex: 'unitPrice', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '供应商', dataIndex: 'supplier' },
    { title: '采购时间', dataIndex: 'time' },
  ];
  return (<PageContainer title="药品采购"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无采购" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
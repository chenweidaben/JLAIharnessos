/** 健澜科技 jlmedaios - 药品发药（M355 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; prescriptionNo: string; drug: string; quantity: string; dispenser: string; time: string }
export default function PharmacyDispensingPage() {
  usePageTitle('药品发药');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/pharmacy/dispensing').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '处方号', dataIndex: 'prescriptionNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '药品', dataIndex: 'drug', ellipsis: true },
    { title: '数量', dataIndex: 'quantity' },
    { title: '发药师', dataIndex: 'dispenser' },
    { title: '时间', dataIndex: 'time', render: (v: string) => <Tag color="blue">{v}</Tag> },
  ];
  return (<PageContainer title="药品发药"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无发药" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
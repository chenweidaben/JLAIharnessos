/** 健澜科技 jlmedaios - 手术医嘱（M357 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; orderNo: string; patient: string; surgeon: string; incision: string; result: string }
export default function SurgeryOrdersPage() {
  usePageTitle('手术医嘱');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/surgery/orders').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '医嘱号', dataIndex: 'orderNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '患者', dataIndex: 'patient' },
    { title: '术者', dataIndex: 'surgeon' },
    { title: '切口', dataIndex: 'incision' },
    { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (<PageContainer title="手术医嘱"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无医嘱" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
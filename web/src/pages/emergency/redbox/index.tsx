/** 健澜科技 jlmedaios - 急诊红箱（M351 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; redboxNo: string; location: string; items: string; status: string }
export default function EmergencyRedboxPage() {
  usePageTitle('急诊红箱');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/emergency/redbox').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '红箱号', dataIndex: 'redboxNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '位置', dataIndex: 'location' },
    { title: '物品', dataIndex: 'items', ellipsis: true },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v.includes('完好') ? 'green' : 'red'}>{v}</Tag> },
  ];
  return (<PageContainer title="急诊红箱"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无红箱" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
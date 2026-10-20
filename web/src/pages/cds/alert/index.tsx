/** 健澜科技 jlmedaios - CDS预警（M340 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; alertNo: string; type: string; patient: string; content: string; level: string }
export default function CdsAlertPage() {
  usePageTitle('CDS预警');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/cds/alert').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '预警号', dataIndex: 'alertNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '类型', dataIndex: 'type' },
    { title: '患者', dataIndex: 'patient' },
    { title: '内容', dataIndex: 'content', ellipsis: true },
    { title: '级别', dataIndex: 'level', render: (v: string) => <Tag color={v.includes('高') ? 'red' : v.includes('中') ? 'orange' : 'blue'}>{v}</Tag> },
  ];
  return (<PageContainer title="CDS预警"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无预警" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
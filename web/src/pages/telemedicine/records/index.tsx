/** 健澜科技 jlmedaios - 远程诊疗记录（M350 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; consultNo: string; patient: string; diagnosis: string; suggestion: string }
export default function TelemedicineRecordsPage() {
  usePageTitle('远程诊疗记录');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/telemedicine/records').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '会诊号', dataIndex: 'consultNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '患者', dataIndex: 'patient' },
    { title: '诊断', dataIndex: 'diagnosis', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '建议', dataIndex: 'suggestion', ellipsis: true },
  ];
  return (<PageContainer title="远程诊疗记录"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无记录" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
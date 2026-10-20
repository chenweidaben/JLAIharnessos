/** 健澜科技 jlmedaios - 过敏史（M361 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; allergen: string; reaction: string; severity: string; diagnosisTime: string }
export default function PatientAllergiesPage() {
  usePageTitle('过敏史');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/patient/allergies').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '过敏原', dataIndex: 'allergen', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '反应', dataIndex: 'reaction' },
    { title: '严重度', dataIndex: 'severity', render: (v: string) => <Tag color={v.includes('重度') ? 'red' : v.includes('中度') ? 'orange' : 'green'}>{v}</Tag> },
    { title: '诊断时间', dataIndex: 'diagnosisTime' },
  ];
  return (<PageContainer title="过敏史"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无过敏史" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
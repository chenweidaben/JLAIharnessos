/** 健澜科技 jlmedaios - 家族史（M361 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; relative: string; disease: string; relation: string; onsetAge: string }
export default function PatientFamilyPage() {
  usePageTitle('家族史');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/patient/family').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '亲属', dataIndex: 'relative', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '疾病', dataIndex: 'disease', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '关系', dataIndex: 'relation' },
    { title: '发病年龄', dataIndex: 'onsetAge' },
  ];
  return (<PageContainer title="家族史"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无家族史" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
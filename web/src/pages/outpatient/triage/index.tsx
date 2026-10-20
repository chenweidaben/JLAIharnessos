/** 健澜科技 jlmedaios - 门诊分诊（M359 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; department: string; triageLevel: string; nurse: string; time: string }
export default function OutpatientTriagePage() {
  usePageTitle('门诊分诊');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/outpatient/triage').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '科室', dataIndex: 'department', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '分诊等级', dataIndex: 'triageLevel', render: (v: string) => <Tag color={v.includes('普通') ? 'green' : v.includes('紧急') ? 'red' : 'orange'}>{v}</Tag> },
    { title: '分诊护士', dataIndex: 'nurse' },
    { title: '时间', dataIndex: 'time' },
  ];
  return (<PageContainer title="门诊分诊"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无分诊" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
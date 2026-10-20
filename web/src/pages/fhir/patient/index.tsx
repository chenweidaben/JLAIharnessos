/** 健澜科技 jlmedaios - FHIR Patient（M343 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; gender: string; birthDate: string; address: string }
export default function FhirPatientPage() {
  usePageTitle('FHIR Patient');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/fhir/patient').then((r) => r.json()).then((j) => { if (alive) setList((j.data?.entry ?? []) as Row[]); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: 'ID', dataIndex: 'id', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '姓名', dataIndex: 'name' },
    { title: '性别', dataIndex: 'gender', render: (v: string) => <Tag color={v === 'male' ? 'blue' : 'pink'}>{v === 'male' ? '男' : '女'}</Tag> },
    { title: '出生日期', dataIndex: 'birthDate' },
    { title: '地址', dataIndex: 'address', ellipsis: true },
  ];
  return (<PageContainer title="FHIR Patient"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无 Patient" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
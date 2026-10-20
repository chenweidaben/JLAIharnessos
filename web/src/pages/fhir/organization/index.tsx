/** 健澜科技 jlmedaios - FHIR Organization（M344 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; hospital: string; department: string; type: string }
export default function FhirOrganizationPage() {
  usePageTitle('FHIR Organization');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/fhir/organization').then((r) => r.json()).then((j) => { if (alive) setList((j.data?.entry ?? []) as Row[]); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: 'ID', dataIndex: 'id', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '医院', dataIndex: 'hospital' },
    { title: '科室', dataIndex: 'department' },
    { title: '等级', dataIndex: 'type', render: (v: string) => <Tag color="blue">{v}</Tag> },
  ];
  return (<PageContainer title="FHIR Organization"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无 Organization" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
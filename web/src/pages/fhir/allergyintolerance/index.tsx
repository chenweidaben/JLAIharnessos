/** 健澜科技 jlmedaios - FHIR AllergyIntolerance（M344 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patientId: string; code: { rxnorm: string; display: string } }
export default function FhirAllergyIntolerancePage() {
  usePageTitle('FHIR AllergyIntolerance');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/fhir/allergyintolerance').then((r) => r.json()).then((j) => { if (alive) setList((j.data?.entry ?? []) as Row[]); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: 'ID', dataIndex: 'id', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '患者', dataIndex: 'patientId', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'RxNorm', dataIndex: ['code', 'rxnorm'] },
    { title: '过敏原', dataIndex: ['code', 'display'], render: (v: string) => <Tag color="red">{v}</Tag> },
  ];
  return (<PageContainer title="FHIR AllergyIntolerance"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无 AllergyIntolerance" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
/** 健澜科技 jlmedaios - 住院处方（M360 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; prescriptionNo: string; patient: string; drugs: string; dosage: string }
export default function PrescriptionsInpatientPage() {
  usePageTitle('住院处方');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/prescriptions/inpatient').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '处方号', dataIndex: 'prescriptionNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '患者', dataIndex: 'patient' },
    { title: '药品', dataIndex: 'drugs' },
    { title: '剂量', dataIndex: 'dosage', render: (v: string) => <Tag color="blue">{v}</Tag> },
  ];
  return (<PageContainer title="住院处方"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无处方" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
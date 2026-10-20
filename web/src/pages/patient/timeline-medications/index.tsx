/** 健澜科技 jlmedaios - 用药时间线（M340 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; drug: string; startTime: string; endTime: string; dose: string }
export default function PatientTimelineMedicationsPage() {
  usePageTitle('用药时间线');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/patient/timeline-medications').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '药品', dataIndex: 'drug', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '开始时间', dataIndex: 'startTime', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '结束时间', dataIndex: 'endTime' },
    { title: '剂量', dataIndex: 'dose' },
  ];
  return (<PageContainer title="用药时间线"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无用药" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
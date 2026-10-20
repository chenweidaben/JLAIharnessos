/** 健澜科技 jlmedaios - 康复记录（M352 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; therapyItem: string; sessions: string; efficacy: string }
export default function RehabRecordsPage() {
  usePageTitle('康复记录');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/rehab/records').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '治疗项', dataIndex: 'therapyItem' },
    { title: '次数', dataIndex: 'sessions', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '疗效', dataIndex: 'efficacy', ellipsis: true, render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (<PageContainer title="康复记录"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无记录" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
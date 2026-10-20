/** 健澜科技 jlmedaios - 培训记录（M349 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; trainingName: string; participant: string; hours: string; score: string; time: string }
export default function TeachingTrainingPage() {
  usePageTitle('培训记录');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/teaching/training').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '培训名', dataIndex: 'trainingName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '参训人员', dataIndex: 'participant' },
    { title: '学时', dataIndex: 'hours', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '成绩', dataIndex: 'score', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '时间', dataIndex: 'time' },
  ];
  return (<PageContainer title="培训记录"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无培训" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}
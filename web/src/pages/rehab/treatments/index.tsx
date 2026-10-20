/** 健澜科技 jlmedaios - 康复治疗（M335 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; item: string; sessions: string; efficacy: string; therapist: string }
export default function RehabTreatmentsPage() {
  usePageTitle('康复治疗');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/rehab/treatments').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '治疗项目', dataIndex: 'item', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '已完成', dataIndex: 'sessions', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '疗效', dataIndex: 'efficacy', ellipsis: true, render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '治疗师', dataIndex: 'therapist' },
  ];
  return (
    <PageContainer title="康复治疗">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无康复治疗" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
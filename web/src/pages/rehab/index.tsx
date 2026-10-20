/** 健澜科技 jlmedaios - 康复计划（M237 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; diagnosis: string; goal: string; therapist: string; items: string; progress: string }
export default function RehabPage() {
  usePageTitle('康复计划');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/rehab/plans').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.plans ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '诊断', dataIndex: 'diagnosis' },
    { title: '康复目标', dataIndex: 'goal' },
    { title: '治疗师', dataIndex: 'therapist' },
    { title: '项目', dataIndex: 'items', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '进度', dataIndex: 'progress', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (
    <PageContainer title="康复计划">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无计划" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}

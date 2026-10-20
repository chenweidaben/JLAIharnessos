/** 健澜科技 jlmedaios - 康复进度（M335 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; stage: string; progress: string; goal: string; assessment: string }
export default function RehabProgressPage() {
  usePageTitle('康复进度');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/rehab/progress').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '当前阶段', dataIndex: 'stage', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '当前进展', dataIndex: 'progress', ellipsis: true, render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '阶段目标', dataIndex: 'goal', ellipsis: true },
    { title: '评估总结', dataIndex: 'assessment', ellipsis: true },
  ];
  return (
    <PageContainer title="康复进度">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无进度" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
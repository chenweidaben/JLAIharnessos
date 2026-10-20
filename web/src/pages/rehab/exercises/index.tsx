/** 健澜科技 jlmedaios - 康复训练（M335 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; action: string; sets: string; reps: string; notes: string }
export default function RehabExercisesPage() {
  usePageTitle('康复训练');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/rehab/exercises').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '训练名', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '动作', dataIndex: 'action', ellipsis: true },
    { title: '组数', dataIndex: 'sets', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '次数', dataIndex: 'reps' },
    { title: '注意事项', dataIndex: 'notes', ellipsis: true },
  ];
  return (
    <PageContainer title="康复训练">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无训练动作" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
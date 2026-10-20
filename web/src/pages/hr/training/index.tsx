/** 健澜科技 jlmedaios - 培训记录（M324 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; participants: number; lecturer: string; time: string; passRate: number; excellentRate: number }
export default function HrTrainingPage() {
  usePageTitle('培训记录');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/hr/training').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.training ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '培训名', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '讲师', dataIndex: 'lecturer' },
    { title: '参训人数', dataIndex: 'participants', render: (v: number) => <Tag color="blue">{v}</Tag> },
    { title: '时间', dataIndex: 'time' },
    { title: '通过率', dataIndex: 'passRate', render: (v: number) => <Tag color={v >= 90 ? 'green' : v >= 80 ? 'orange' : 'red'}>{v}%</Tag> },
    { title: '优秀率', dataIndex: 'excellentRate', render: (v: number) => <Tag color="green">{v}%</Tag> },
  ];
  return (
    <PageContainer title="培训记录">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无培训" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
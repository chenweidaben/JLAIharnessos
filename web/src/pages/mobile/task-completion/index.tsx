/** 健澜科技 jlmedaios - 移动任务完成率（M276 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { nurse: string; totalTasks: number; completed: number; overdue: number; rate: string }
export default function MobileTaskCompletionPage() {
  usePageTitle('移动任务完成率');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/mobile/task-completion').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.completion ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '护士', dataIndex: 'nurse', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '总任务', dataIndex: 'totalTasks' },
    { title: '已完成', dataIndex: 'completed' },
    { title: '超时', dataIndex: 'overdue', render: (v: number) => v > 0 ? <Tag color="red">{v}</Tag> : v },
    { title: '完成率', dataIndex: 'rate', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (
    <PageContainer title="移动护理任务完成率">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="nurse" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}

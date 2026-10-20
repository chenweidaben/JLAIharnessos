/** 健澜科技 jlmedaios - 护士工作台任务（M338 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; taskNo: string; type: string; patient: string; priority: string; status: string }
export default function WorkflowNurseTasksPage() {
  usePageTitle('护士工作台任务');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/workflow/nurse-tasks').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '任务号', dataIndex: 'taskNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '类型', dataIndex: 'type' },
    { title: '对象', dataIndex: 'patient' },
    { title: '优先级', dataIndex: 'priority', render: (v: string) => <Tag color={v.includes('高') ? 'red' : v.includes('中') ? 'orange' : 'blue'}>{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已完成' ? 'green' : v === '执行中' ? 'blue' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="护士工作台任务">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无任务" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
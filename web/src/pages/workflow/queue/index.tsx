/** 健澜科技 jlmedaios - 工作流队列（M338 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; queueNo: string; node: string; handler: string; waitTime: string; status: string }
export default function WorkflowQueuePage() {
  usePageTitle('工作流队列');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/workflow/queue').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '队列号', dataIndex: 'queueNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '节点', dataIndex: 'node' },
    { title: '处理人', dataIndex: 'handler' },
    { title: '等待情况', dataIndex: 'waitTime', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '运行中' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="工作流队列">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无队列" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
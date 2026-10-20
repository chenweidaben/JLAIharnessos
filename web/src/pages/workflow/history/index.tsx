/** 健澜科技 jlmedaios - 工作流历史（M338 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; processNo: string; node: string; operator: string; time: string; result: string }
export default function WorkflowHistoryPage() {
  usePageTitle('工作流历史');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/workflow/history').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '流程号', dataIndex: 'processNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '节点', dataIndex: 'node', ellipsis: true },
    { title: '操作人', dataIndex: 'operator' },
    { title: '时间', dataIndex: 'time', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color={v.includes('成功') ? 'green' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="工作流历史">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无历史记录" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
/** 健澜科技 jlmedaios - 审计日志（M309 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; user: string; action: string; resource: string; time: string; ip: string; result: string }
export default function AuditLogsPage() {
  usePageTitle('审计日志');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/audit/logs').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.logs ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '用户', dataIndex: 'user' },
    { title: '动作', dataIndex: 'action', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '资源', dataIndex: 'resource' },
    { title: '时间', dataIndex: 'time' },
    { title: 'IP', dataIndex: 'ip' },
    { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color={v === '成功' ? 'green' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="审计日志">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无日志" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
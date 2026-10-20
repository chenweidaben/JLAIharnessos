/** 健澜科技 jlmedaios - 全局审计追踪（M264 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; user: string; action: string; resource: string; time: string; ip: string }
export default function AuditTrailPage() {
  usePageTitle('全局审计追踪');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/audit/trail').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.trails ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '用户', dataIndex: 'user' },
    { title: '操作', dataIndex: 'action', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '资源', dataIndex: 'resource' },
    { title: '时间', dataIndex: 'time' },
    { title: 'IP', dataIndex: 'ip' },
  ];
  return (
    <PageContainer title="全局审计追踪">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无记录" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}

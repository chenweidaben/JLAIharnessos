/** 健澜科技 jlmedaios - 安全事件（M246 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; type: string; time: string; scope: string; action: string; status: string }
export default function SecurityIncidentsPage() {
  usePageTitle('安全事件');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/incidents').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.incidents ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '事件类型', dataIndex: 'type', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '发生时间', dataIndex: 'time' },
    { title: '影响范围', dataIndex: 'scope' },
    { title: '处置措施', dataIndex: 'action' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已关闭' ? 'green' : v === '调查中' ? 'orange' : 'blue'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="安全事件响应">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无事件" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}

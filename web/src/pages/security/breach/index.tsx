/** 健澜科技 jlmedaios - 数据泄露事件（M262 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; type: string; scope: string; foundTime: string; action: string; status: string }
export default function SecurityBreachPage() {
  usePageTitle('数据泄露事件');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/breach').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.events ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '事件类型', dataIndex: 'type', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '范围', dataIndex: 'scope' },
    { title: '发现时间', dataIndex: 'foundTime' },
    { title: '处置', dataIndex: 'action' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已处理' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="数据泄露事件响应">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无事件" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}

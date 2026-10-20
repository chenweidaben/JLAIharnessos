/** 健澜科技 jlmedaios - 体检中心（M284 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; examinedCount: number; avgPrice: string; completionRate: string; satisfaction: number }
export default function PhysicalCentersPage() {
  usePageTitle('体检中心');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/physical/centers').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.packages ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '套餐', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '已检人数', dataIndex: 'examinedCount' },
    { title: '均价', dataIndex: 'avgPrice' },
    { title: '完成率', dataIndex: 'completionRate', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '满意度', dataIndex: 'satisfaction' },
  ];
  return (
    <PageContainer title="体检中心套餐">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无套餐" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
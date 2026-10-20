/** 健澜科技 jlmedaios - 体检套餐（M243 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; price: number; items: number; target: string; sold: number }
export default function PhysicalPackagesPage() {
  usePageTitle('体检套餐');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/physical/packages').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.packages ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '套餐', dataIndex: 'name', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '价格', dataIndex: 'price', render: (v: number) => <Tag color="gold">¥{v}</Tag> },
    { title: '项目数', dataIndex: 'items' },
    { title: '适用人群', dataIndex: 'target' },
    { title: '累计销量', dataIndex: 'sold' },
  ];
  return (
    <PageContainer title="体检套餐">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无套餐" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}

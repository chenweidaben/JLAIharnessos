/** 健澜科技 jlmedaios - 药房库存（M326 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { name: string; spec: string; stock: number; price: number; batch: string; expiry: string; status: string }
export default function PharmacyInventoryPage() {
  usePageTitle('药房库存');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/pharmacy/inventory').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.drugs ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '药品', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '规格', dataIndex: 'spec' },
    { title: '库存', dataIndex: 'stock', render: (v: number) => <Tag color={v < 100 ? 'red' : v < 500 ? 'orange' : 'green'}>{v}</Tag> },
    { title: '单价', dataIndex: 'price', render: (v: number) => <Tag color="blue">¥{v}</Tag> },
    { title: '批号', dataIndex: 'batch' },
    { title: '效期', dataIndex: 'expiry' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '正常' ? 'green' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="药房库存">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="name" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无库存" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
/** 健澜科技 jlmedaios - 物资管理（M234 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { name: string; spec: string; batch: string; expiry: string; stock: number; price: number }
export default function SuppliesPage() {
  usePageTitle('物资管理');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/supplies/inventory').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.supplies ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '耗材名称', dataIndex: 'name' },
    { title: '规格', dataIndex: 'spec' },
    { title: '批号', dataIndex: 'batch' },
    { title: '效期', dataIndex: 'expiry' },
    { title: '库存', dataIndex: 'stock', render: (v: number) => <Tag color={v < 30 ? 'red' : 'green'}>{v}</Tag> },
    { title: '单价', dataIndex: 'price', render: (v: number) => <Tag color="gold">¥{v.toLocaleString()}</Tag> },
  ];
  return (
    <PageContainer title="物资管理（耗材库存）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="batch" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无耗材" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}

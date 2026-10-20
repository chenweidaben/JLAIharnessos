/** 健澜科技 jlmedaios - 药品列表（M302 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; spec: string; form: string; price: string; stock: number }
export default function MedicationListPage() {
  usePageTitle('药品列表');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/medication/list').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.medications ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '药品名', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '规格', dataIndex: 'spec' },
    { title: '剂型', dataIndex: 'form' },
    { title: '价格', dataIndex: 'price', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '库存', dataIndex: 'stock', render: (v: number) => v < 500 ? <Tag color="red">{v}</Tag> : v },
  ];
  return (
    <PageContainer title="药品列表">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无药品" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
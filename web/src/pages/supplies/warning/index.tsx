/** 健澜科技 jlmedaios - 物资库存预警（M327 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { supply: string; stock: string; safetyStock: string; status: string; suggestQty: string }
export default function SuppliesWarningPage() {
  usePageTitle('物资库存预警');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/supplies/warning').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '物资', dataIndex: 'supply', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '当前库存', dataIndex: 'stock', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '安全库存', dataIndex: 'safetyStock', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '建议采购量', dataIndex: 'suggestQty', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '低于安全库存' ? 'red' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="物资库存预警">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="supply" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无预警" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
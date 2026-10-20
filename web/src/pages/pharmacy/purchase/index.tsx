/** 健澜科技 jlmedaios - 药品采购（M326 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; orderNo: string; drug: string; qty: string; amount: string; status: string }
export default function PharmacyPurchasePage() {
  usePageTitle('药品采购');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/pharmacy/purchase').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '订单号', dataIndex: 'orderNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '药品', dataIndex: 'drug' },
    { title: '数量', dataIndex: 'qty' },
    { title: '金额', dataIndex: 'amount', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已到货' ? 'green' : v === '配送中' ? 'blue' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="药品采购">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无采购" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
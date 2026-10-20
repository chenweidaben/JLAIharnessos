/** 健澜科技 jlmedaios - 互联网支付（M306 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; orderNo: string; patient: string; amount: number; items: string[]; paymentMethod: string; status: string; payTime: string }
export default function InternetPaymentsPage() {
  usePageTitle('互联网支付');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/internet/payments').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.payments ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '订单号', dataIndex: 'orderNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '患者', dataIndex: 'patient' },
    { title: '金额', dataIndex: 'amount', render: (v: number) => <Tag color="green">¥{v}</Tag> },
    { title: '明细', dataIndex: 'items', render: (v: string[]) => v.map((m) => <Tag key={m} color="blue">{m}</Tag>) },
    { title: '方式', dataIndex: 'paymentMethod' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已支付' ? 'green' : 'orange'}>{v}</Tag> },
    { title: '时间', dataIndex: 'payTime' },
  ];
  return (
    <PageContainer title="互联网支付">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无支付" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
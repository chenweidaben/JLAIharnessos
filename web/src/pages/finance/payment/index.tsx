/** 健澜科技 jlmedaios - 支付记录（M325 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; orderNo: string; amount: string; method: string; time: string; status: string }
export default function FinancePaymentPage() {
  usePageTitle('支付记录');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/finance/payment').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '订单号', dataIndex: 'orderNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '金额', dataIndex: 'amount', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '方式', dataIndex: 'method', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '时间', dataIndex: 'time' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '成功' ? 'green' : v === '失败' ? 'red' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="支付记录">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无支付" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
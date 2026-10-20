/** 健澜科技 jlmedaios - 退款记录（M325 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; originalOrder: string; refundAmount: string; reason: string; status: string }
export default function FinanceRefundPage() {
  usePageTitle('退款记录');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/finance/refund').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '原订单', dataIndex: 'originalOrder', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '退款额', dataIndex: 'refundAmount', render: (v: string) => <Tag color="orange">{v}</Tag> },
    { title: '原因', dataIndex: 'reason', ellipsis: true },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已退款' ? 'green' : v === '审核中' ? 'orange' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="退款记录">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无退款" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
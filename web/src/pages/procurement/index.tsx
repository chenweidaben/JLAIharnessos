/** 健澜科技 jlmedaios - 采购管理（M223 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface OrderRow { id: string; orderNo: string; supplier: string; item: string; amount: number; status: string; expectedDate: string }
export default function ProcurementPage() {
  usePageTitle('采购管理');
  const [list, setList] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/procurement/orders').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.orders ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<OrderRow> = [
    { title: '订单号', dataIndex: 'orderNo' },
    { title: '供应商', dataIndex: 'supplier' },
    { title: '采购项', dataIndex: 'item' },
    { title: '金额', dataIndex: 'amount', render: (v: number) => <Tag color="gold">¥{v.toLocaleString()}</Tag> },
    { title: '状态', dataIndex: 'status', render: (s: string) => <Tag color={s === '已审批' ? 'green' : s === '待审批' ? 'orange' : 'default'}>{s}</Tag> },
    { title: '预计到货', dataIndex: 'expectedDate' },
  ];
  return (
    <PageContainer title="采购管理（订单）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无采购订单" /> }} pagination={{ pageSize: 10 }} />
        </Card>
      </Spin>
    </PageContainer>
  );
}

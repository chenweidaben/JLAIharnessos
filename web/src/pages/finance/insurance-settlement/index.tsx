/** 健澜科技 jlmedaios - 医保结算（M325 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; totalCost: string; insuranceReimb: string; selfPay: string; status: string }
export default function FinanceInsuranceSettlementPage() {
  usePageTitle('医保结算');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/finance/insurance-settlement').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '总费用', dataIndex: 'totalCost', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '医保支付', dataIndex: 'insuranceReimb', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '自付', dataIndex: 'selfPay', render: (v: string) => <Tag color="orange">{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已结算' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="医保结算">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无结算" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
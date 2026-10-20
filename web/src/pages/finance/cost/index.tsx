/** 健澜科技 jlmedaios - 财务成本（M300 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; dept: string; laborCost: string; materialCost: string; equipmentCost: string; totalCost: string }
export default function FinanceCostPage() {
  usePageTitle('财务成本');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/finance/cost').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.costs ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '人力成本', dataIndex: 'laborCost' },
    { title: '耗材成本', dataIndex: 'materialCost' },
    { title: '设备成本', dataIndex: 'equipmentCost' },
    { title: '总成本', dataIndex: 'totalCost', render: (v: string) => <Tag color="red">{v}</Tag> },
  ];
  return (
    <PageContainer title="财务成本">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无成本" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
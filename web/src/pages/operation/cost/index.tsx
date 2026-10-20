/** 健澜科技 jlmedaios - 成本分析（M323 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { dept: string; laborCost: string; materialCost: string; equipmentCost: string; totalCost: string }
export default function OperationCostPage() {
  usePageTitle('成本分析');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/operation/cost').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '人力成本', dataIndex: 'laborCost', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '物资成本', dataIndex: 'materialCost', render: (v: string) => <Tag color="orange">{v}</Tag> },
    { title: '设备成本', dataIndex: 'equipmentCost' },
    { title: '总成本', dataIndex: 'totalCost', render: (v: string) => <Tag color="red">{v}</Tag> },
  ];
  return (
    <PageContainer title="成本分析">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="dept" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
/** 健澜科技 jlmedaios - DRG 成本管控（M321 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { drgGroup: string; cases: number; avgCost: string; profitLoss: string; measure: string }
export default function DrgCostControlPage() {
  usePageTitle('DRG 成本管控');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/drg/cost-control').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: 'DRG 组', dataIndex: 'drgGroup', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '例数', dataIndex: 'cases', render: (v: number) => <Tag color="blue">{v}</Tag> },
    { title: '均费', dataIndex: 'avgCost', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '盈亏', dataIndex: 'profitLoss', render: (v: string) => <Tag color={v.startsWith('+') ? 'green' : 'red'}>{v}</Tag> },
    { title: '措施', dataIndex: 'measure' },
  ];
  return (
    <PageContainer title="DRG 成本管控">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="drgGroup" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
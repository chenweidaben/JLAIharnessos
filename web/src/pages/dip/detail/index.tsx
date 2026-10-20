/** 健澜科技 jlmedaios - DIP 分值明细（M321 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { disease: string; score: number; cases: number; avgCost: string; weight: string }
export default function DipDetailPage() {
  usePageTitle('DIP 分值明细');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/dip/detail').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '病种', dataIndex: 'disease', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '分值', dataIndex: 'score', render: (v: number) => <Tag color="blue">{v}</Tag> },
    { title: '例数', dataIndex: 'cases' },
    { title: '均费', dataIndex: 'avgCost', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '权重', dataIndex: 'weight', render: (v: string) => <Tag color="orange">{v}</Tag> },
  ];
  return (
    <PageContainer title="DIP 分值明细">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="disease" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
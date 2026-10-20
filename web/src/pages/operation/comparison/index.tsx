/** 健澜科技 jlmedaios - 科室对比（M323 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { dept: string; metric: string; rank: string; yoy: string; mom: string }
export default function OperationComparisonPage() {
  usePageTitle('科室对比');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/operation/comparison').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '指标', dataIndex: 'metric', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '排名', dataIndex: 'rank', render: (v: string) => <Tag color={v.startsWith('第 1') ? 'gold' : v.startsWith('第 2') ? 'silver' : v.startsWith('第 3') ? 'orange' : 'blue'}>{v}</Tag> },
    { title: '同比', dataIndex: 'yoy', render: (v: string) => <Tag color={v.startsWith('-') ? 'red' : 'green'}>{v}</Tag> },
    { title: '环比', dataIndex: 'mom', render: (v: string) => <Tag color={v.startsWith('-') ? 'red' : 'blue'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="科室对比">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="dept" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
/** 健澜科技 jlmedaios - 数字孪生模拟（M321 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; scenario: string; params: string; result: string; confidence: string; time: string }
export default function DigitalTwinSimulationPage() {
  usePageTitle('数字孪生模拟');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/digital-twin/simulation').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '场景', dataIndex: 'scenario', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '参数', dataIndex: 'params' },
    { title: '结果', dataIndex: 'result', ellipsis: true },
    { title: '置信度', dataIndex: 'confidence', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '时间', dataIndex: 'time' },
  ];
  return (
    <PageContainer title="数字孪生模拟">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无模拟" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
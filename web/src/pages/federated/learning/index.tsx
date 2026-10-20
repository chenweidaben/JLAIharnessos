/** 健澜科技 jlmedaios - 联邦学习（M320 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; task: string; nodes: string; dataSize: string; status: string; accuracy: string }
export default function FederatedLearningPage() {
  usePageTitle('联邦学习');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/federated/learning').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '任务', dataIndex: 'task', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '节点数', dataIndex: 'nodes' },
    { title: '样本量', dataIndex: 'dataSize', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '精度', dataIndex: 'accuracy', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已完成' ? 'green' : v === '训练中' ? 'blue' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="联邦学习">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无任务" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
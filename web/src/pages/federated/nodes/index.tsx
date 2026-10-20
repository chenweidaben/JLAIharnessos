/** 健澜科技 jlmedaios - 联邦学习节点（M321 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; org: string; status: string; model: string; participation: string }
export default function FederatedNodesPage() {
  usePageTitle('联邦学习节点');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/federated/nodes').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '节点', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '机构', dataIndex: 'org' },
    { title: '模型', dataIndex: 'model' },
    { title: '参与度', dataIndex: 'participation', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '在线' ? 'green' : v === '离线' ? 'red' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="联邦学习节点">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无节点" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
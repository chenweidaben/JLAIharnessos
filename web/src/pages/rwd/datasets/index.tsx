/** 健澜科技 jlmedaios - RWD 数据集（M320 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; source: string; size: string; fields: string; status: string; updatedAt: string }
export default function RwdDatasetsPage() {
  usePageTitle('RWD 数据集');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/rwd/datasets').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '数据集', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '来源', dataIndex: 'source' },
    { title: '样本量', dataIndex: 'size', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '字段数', dataIndex: 'fields' },
    { title: '更新', dataIndex: 'updatedAt' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已脱敏' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="RWD 数据集">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据集" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
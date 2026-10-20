/** 健澜科技 jlmedaios - 论文列表（M328 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; title: string; authors: string; journal: string; impactFactor: number; date: string; indexing: string }
export default function ResearchPapersPage() {
  usePageTitle('论文列表');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/research/papers').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.papers ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '标题', dataIndex: 'title', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '作者', dataIndex: 'authors' },
    { title: '期刊', dataIndex: 'journal' },
    { title: '影响因子', dataIndex: 'impactFactor', render: (v: number) => <Tag color="blue">{v}</Tag> },
    { title: '收录', dataIndex: 'indexing', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '日期', dataIndex: 'date' },
  ];
  return (
    <PageContainer title="论文列表">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无论文" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
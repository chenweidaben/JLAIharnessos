/** 健澜科技 jlmedaios - 临床指南（M307 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; source: string; year: number; relevance: string; keyPoints: string }
export default function CdsGuidelinePage() {
  usePageTitle('临床指南');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/cds/guideline').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.guidelines ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '指南', dataIndex: 'name' },
    { title: '来源', dataIndex: 'source' },
    { title: '年份', dataIndex: 'year', render: (v: number) => <Tag color="blue">{v}</Tag> },
    { title: '相关度', dataIndex: 'relevance', render: (v: string) => <Tag color={v === '高' ? 'red' : v === '中' ? 'orange' : 'green'}>{v}</Tag> },
    { title: '要点', dataIndex: 'keyPoints' },
  ];
  return (
    <PageContainer title="临床指南">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无指南" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
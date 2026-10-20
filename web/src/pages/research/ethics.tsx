/** 健澜科技 jlmedaios - 伦理审查（M243 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; project: string; pi: string; type: string; date: string; result: string; validUntil: string }
export default function ResearchEthicsPage() {
  usePageTitle('伦理审查');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/research/ethics').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.ethics ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '项目', dataIndex: 'project' },
    { title: 'PI', dataIndex: 'pi' },
    { title: '审查类型', dataIndex: 'type', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '审查日期', dataIndex: 'date' },
    { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color={v === '通过' ? 'green' : 'red'}>{v}</Tag> },
    { title: '有效期至', dataIndex: 'validUntil' },
  ];
  return (
    <PageContainer title="科研伦理审查">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无审查" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}

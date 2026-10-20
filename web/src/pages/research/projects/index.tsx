/** 健澜科技 jlmedaios - 科研项目（M279 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id?: string; name: string; pi: string; funding: number; start: string; status: string }
export default function ResearchProjectsPage() {
  usePageTitle('科研项目');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/research/projects').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.projects ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '项目', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: 'PI', dataIndex: 'pi' },
    { title: '经费(万)', dataIndex: 'funding' },
    { title: '启动时间', dataIndex: 'start' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '在研' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="科研项目">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="name" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无项目" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}

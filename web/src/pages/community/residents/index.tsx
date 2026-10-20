/** 健澜科技 jlmedaios - 居民健康档案（M331 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; gender: string; age: number; address: string; healthStatus: string }
export default function CommunityResidentsPage() {
  usePageTitle('居民健康档案');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/community/residents').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '姓名', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '性别', dataIndex: 'gender' },
    { title: '年龄', dataIndex: 'age', render: (v: number) => <Tag color="blue">{v}</Tag> },
    { title: '地址', dataIndex: 'address', ellipsis: true },
    { title: '健康状况', dataIndex: 'healthStatus' },
  ];
  return (
    <PageContainer title="居民健康档案">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无档案" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
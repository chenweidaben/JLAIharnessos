/** 健澜科技 jlmedaios - 远程专家（M330 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; dept: string; title: string; hospital: string; specialty: string }
export default function TelemedSpecialistsPage() {
  usePageTitle('远程专家');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/telemed/specialists').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '姓名', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '科室', dataIndex: 'dept' },
    { title: '职称', dataIndex: 'title', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '医院', dataIndex: 'hospital' },
    { title: '专长', dataIndex: 'specialty', ellipsis: true },
  ];
  return (
    <PageContainer title="远程专家">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无专家" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
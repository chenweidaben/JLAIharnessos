/** 健澜科技 jlmedaios - 角色管理（M309 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; permissions: string[]; userCount: number; status: string }
export default function AuthRolesPage() {
  usePageTitle('角色管理');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/auth/roles').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.roles ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '角色', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '权限', dataIndex: 'permissions', render: (v: string[]) => v.map((p) => <Tag key={p} color="blue">{p}</Tag>) },
    { title: '用户数', dataIndex: 'userCount' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '启用' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="角色管理">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无角色" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
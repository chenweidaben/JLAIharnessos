/** 健澜科技 jlmedaios - 用户管理（M223 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface UserRow { id: string; username: string; name: string; role: string; dept: string; status: string; lastLogin: string }
export default function SystemUsersPage() {
  usePageTitle('用户管理');
  const [list, setList] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/system/users').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.users ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<UserRow> = [
    { title: '用户名', dataIndex: 'username' },
    { title: '姓名', dataIndex: 'name' },
    { title: '角色', dataIndex: 'role', render: (r: string) => <Tag color="blue">{r}</Tag> },
    { title: '科室', dataIndex: 'dept' },
    { title: '状态', dataIndex: 'status', render: (s: string) => <Tag color={s === '启用' ? 'green' : 'red'}>{s}</Tag> },
    { title: '最后登录', dataIndex: 'lastLogin' },
  ];
  return (
    <PageContainer title="用户管理">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Table<UserRow> rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无用户" /> }} pagination={{ pageSize: 10 }} />
        </Card>
      </Spin>
    </PageContainer>
  );
}

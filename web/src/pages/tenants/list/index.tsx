/** 健澜科技 jlmedaios - 租户列表（M309 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; campus: string; status: string; apiCount: number }
export default function TenantsListPage() {
  usePageTitle('租户列表');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/tenants/list').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.tenants ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '租户', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '院区', dataIndex: 'campus' },
    { title: 'API 数', dataIndex: 'apiCount' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '正常' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="租户列表">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无租户" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
/** 健澜科技 jlmedaios - 租户用量统计（M269 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { tenant: string; apiCalls: string; storageGB: number; activeUsers: number }
export default function TenantsUsageStatsPage() {
  usePageTitle('租户用量统计');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/tenants/usage-stats').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.stats ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '租户', dataIndex: 'tenant', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '日 API 调用', dataIndex: 'apiCalls' },
    { title: '存储(GB)', dataIndex: 'storageGB' },
    { title: '活跃用户', dataIndex: 'activeUsers' },
  ];
  return (
    <PageContainer title="租户用量统计">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="tenant" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}

/** 健澜科技 jlmedaios - 租户限流（M264 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { tenantId: string; qpsLimit: number; concurrentLimit: number; degrade: string }
export default function TenantsRateLimitPage() {
  usePageTitle('租户限流');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/tenants/rate-limit').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.limits ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '租户', dataIndex: 'tenantId', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: 'QPS 上限', dataIndex: 'qpsLimit' },
    { title: '并发上限', dataIndex: 'concurrentLimit' },
    { title: '降级策略', dataIndex: 'degrade' },
  ];
  return (
    <PageContainer title="租户限流配置">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="tenantId" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无配置" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}

/** 健澜科技 jlmedaios - 患者授权日志（M266 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; item: string; grantTime: string; revokeTime: string; ip: string }
export default function SecurityConsentLogPage() {
  usePageTitle('患者授权日志');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/consent-log').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.logs ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '授权项', dataIndex: 'item', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '授权时间', dataIndex: 'grantTime' },
    { title: '撤回时间', dataIndex: 'revokeTime', render: (v: string) => v === '—' ? <Tag color="green">未撤回</Tag> : v },
    { title: 'IP', dataIndex: 'ip' },
  ];
  return (
    <PageContainer title="患者授权日志">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无日志" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}

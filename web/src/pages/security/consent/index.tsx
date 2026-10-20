/** 健澜科技 jlmedaios - 患者授权（M265 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; item: string; grantTime: string; validUntil: string; status: string }
export default function SecurityConsentPage() {
  usePageTitle('患者授权');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/consent').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.consents ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '授权项', dataIndex: 'item', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '授权时间', dataIndex: 'grantTime' },
    { title: '有效期至', dataIndex: 'validUntil' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已授权' ? 'green' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="患者授权管理">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无授权" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}

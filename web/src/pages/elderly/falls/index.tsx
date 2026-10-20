/** 健澜科技 jlmedaios - 跌倒评估（M336 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; risk: string; factors: string; intervention: string; doctor: string }
export default function ElderlyFallsPage() {
  usePageTitle('跌倒评估');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/elderly/falls').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '跌倒风险', dataIndex: 'risk', render: (v: string) => <Tag color={v.includes('高') ? 'red' : v.includes('中') ? 'orange' : 'green'}>{v}</Tag> },
    { title: '风险因素', dataIndex: 'factors', ellipsis: true },
    { title: '干预措施', dataIndex: 'intervention', ellipsis: true, render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '医生', dataIndex: 'doctor' },
  ];
  return (
    <PageContainer title="跌倒评估">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无跌倒评估" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
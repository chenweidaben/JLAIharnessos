/** 健澜科技 jlmedaios - 创伤救治（M333 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; traumaSite: string; severity: string; treatment: string; result: string }
export default function EmergencyTraumaPage() {
  usePageTitle('创伤救治');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emergency/trauma').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '受伤部位', dataIndex: 'traumaSite', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '伤情', dataIndex: 'severity', render: (v: string) => <Tag color={v.includes('重伤') ? 'red' : v.includes('中度') ? 'orange' : 'blue'}>{v}</Tag> },
    { title: '救治', dataIndex: 'treatment', ellipsis: true },
    { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (
    <PageContainer title="创伤救治">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无创伤病例" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
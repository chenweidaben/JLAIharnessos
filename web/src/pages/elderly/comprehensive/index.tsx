/** 健澜科技 jlmedaios - 老年综合征（M336 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; syndromeType: string; manifestation: string; intervention: string }
export default function ElderlyComprehensivePage() {
  usePageTitle('老年综合征');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/elderly/comprehensive').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '综合征类型', dataIndex: 'syndromeType', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '表现', dataIndex: 'manifestation', ellipsis: true },
    { title: '干预', dataIndex: 'intervention', ellipsis: true, render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (
    <PageContainer title="老年综合征">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无老年综合征" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
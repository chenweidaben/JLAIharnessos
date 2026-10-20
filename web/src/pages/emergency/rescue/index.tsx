/** 健澜科技 jlmedaios - 急救记录（M333 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; rescueNo: string; patient: string; condition: string; treatment: string; result: string }
export default function EmergencyRescuePage() {
  usePageTitle('急救记录');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emergency/rescue').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '急救号', dataIndex: 'rescueNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '患者', dataIndex: 'patient' },
    { title: '病情', dataIndex: 'condition', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '处置', dataIndex: 'treatment', ellipsis: true },
    { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (
    <PageContainer title="急救记录">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无急救记录" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
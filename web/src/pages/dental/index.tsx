/** 健澜科技 jlmedaios - 口腔就诊（M240 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; complaint: string; diagnosis: string; treatment: string; tooth: string; cost: number }
export default function DentalPage() {
  usePageTitle('口腔就诊');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/dental/visits').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.visits ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '主诉', dataIndex: 'complaint' },
    { title: '牙位', dataIndex: 'tooth', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '诊断', dataIndex: 'diagnosis' },
    { title: '治疗', dataIndex: 'treatment' },
    { title: '费用', dataIndex: 'cost', render: (v: number) => <Tag color="gold">¥{v}</Tag> },
  ];
  return (
    <PageContainer title="口腔就诊">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无就诊" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}

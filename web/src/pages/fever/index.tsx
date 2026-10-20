/** 健澜科技 jlmedaios - 发热门诊（M237 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; temp: number; symptoms: string; diagnosis: string; disposition: string; time: string }
export default function FeverPage() {
  usePageTitle('发热门诊');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/fever/visits').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.visits ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '体温', dataIndex: 'temp', render: (v: number) => <Tag color={v >= 39 ? 'red' : v >= 38 ? 'orange' : 'default'}>{v}℃</Tag> },
    { title: '症状', dataIndex: 'symptoms' },
    { title: '诊断', dataIndex: 'diagnosis' },
    { title: '处置', dataIndex: 'disposition', render: (v: string) => <Tag color={v === '离院' ? 'green' : v === '留观' ? 'orange' : 'blue'}>{v}</Tag> },
    { title: '时间', dataIndex: 'time' },
  ];
  return (
    <PageContainer title="发热门诊">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无就诊" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}

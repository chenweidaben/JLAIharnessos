/** 健澜科技 jlmedaios - 急诊列表（M317 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; triageLevel: string; doctor: string; status: string; arrivalTime: string }
export default function EmergencyListPage() {
  usePageTitle('急诊列表');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emergency/list').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '分诊级别', dataIndex: 'triageLevel', render: (v: string) => <Tag color={v.startsWith('I') ? 'red' : v.startsWith('II') ? 'orange' : 'blue'}>{v}</Tag> },
    { title: '医生', dataIndex: 'doctor' },
    { title: '到达时间', dataIndex: 'arrivalTime' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '抢救中' ? 'red' : v === '留观' ? 'orange' : 'green'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="急诊列表">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无急诊" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
/** 健澜科技 jlmedaios - 急诊分诊（M244 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; level: string; vitalSigns: string; waitTime: number; doctor: string }
export default function EmergencyTriagePage() {
  usePageTitle('急诊分诊');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emergency/triage').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.triage ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '分诊级别', dataIndex: 'level', render: (v: string) => <Tag color={v.startsWith('I') ? 'red' : v.startsWith('II') ? 'orange' : 'blue'}>{v}</Tag> },
    { title: '生命体征', dataIndex: 'vitalSigns' },
    { title: '等待时间(分)', dataIndex: 'waitTime', render: (v: number) => <Tag color={v > 30 ? 'red' : 'green'}>{v}</Tag> },
    { title: '急诊医生', dataIndex: 'doctor' },
  ];
  return (
    <PageContainer title="急诊分诊（预检分诊）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无分诊" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}

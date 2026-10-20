/** 健澜科技 jlmedaios - 用药提醒（M322 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; medication: string; time: string; dosage: string; status: string }
export default function SmartServiceMedicationRemindPage() {
  usePageTitle('用药提醒');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/smart-service/medication-remind').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '药品', dataIndex: 'medication', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '时间', dataIndex: 'time', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '剂量', dataIndex: 'dosage' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已服用' ? 'green' : v === '待服用' ? 'orange' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="用药提醒">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无提醒" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
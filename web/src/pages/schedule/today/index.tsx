/** 健澜科技 jlmedaios - 今日排班（M301 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; doctor: string; dept: string; timeSlot: string; availableSlots: number; bookedSlots: number }
export default function ScheduleTodayPage() {
  usePageTitle('今日排班');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/schedule/today').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.schedules ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '医生', dataIndex: 'doctor' },
    { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '时段', dataIndex: 'timeSlot' },
    { title: '已约', dataIndex: 'bookedSlots' },
    { title: '余号', dataIndex: 'availableSlots', render: (v: number) => v <= 5 ? <Tag color="red">{v}</Tag> : v },
  ];
  return (
    <PageContainer title="今日排班">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无排班" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}